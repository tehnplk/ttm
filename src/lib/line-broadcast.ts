import { Prisma } from "@prisma/client";
import prisma from "@/lib/prisma";
import { thaiDateTime } from "@/lib/thai-time";

const LINE_CHANNEL_ACCESS_TOKEN = process.env.LINE_CHANNEL_ACCESS_TOKEN;

// How many pushes run at once. A single 1156-recipient send took 6m13s one at a
// time, which is longer than any reverse-proxy read timeout, so the pushes are
// batched. Keep this modest to stay well inside the LINE push rate limit.
const PUSH_CONCURRENCY = 10;

// LINE only accepts JPEG/PNG served over HTTPS, and only from our own broadcast folder
export const IMAGE_PATH_PATTERN = /^\/(api\/)?images\/broadcasts\/[\w.-]+\.(jpe?g|png)$/i;

// LINE rejects a text message longer than this
export const MAX_TEXT_LENGTH = 5000;

export type BroadcastMessageType = "image" | "text" | "youtube";

export interface BroadcastTarget {
  line_id: string;
  name: string | null;
  phone: string | null;
}

/**
 * A validated broadcast, carrying both the fields stored in broadcast_send_log
 * and the LINE message objects that get pushed.
 */
export interface BroadcastMessage {
  type: BroadcastMessageType;
  /** Uploaded image path; empty for the other types */
  imagePath: string;
  /** Text body, or the caption shown with a YouTube link */
  text: string;
  /** Normalised YouTube watch URL; empty for the other types */
  videoUrl: string;
  /** Ready-to-push LINE message objects */
  payload: unknown[];
}

// Push already-built LINE message objects to one user
export async function sendLineMessages(userId: string, messages: unknown[]) {
  if (!LINE_CHANNEL_ACCESS_TOKEN) {
    console.error("❌ LINE_CHANNEL_ACCESS_TOKEN is not set");
    return false;
  }

  try {
    const response = await fetch("https://api.line.me/v2/bot/message/push", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${LINE_CHANNEL_ACCESS_TOKEN}`,
      },
      body: JSON.stringify({
        to: userId,
        messages,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("❌ LINE API error:", response.status, errorText);
      return false;
    }

    return true;
  } catch (error) {
    console.error("❌ Error sending LINE message:", error);
    return false;
  }
}

/**
 * Validate an uploaded image path and turn it into the absolute HTTPS URL that
 * LINE needs in order to fetch it. Returns a Thai error message when unusable.
 */
export function resolveImageUrl(imagePath: string): { imageUrl?: string; error?: string } {
  if (!imagePath) {
    return { error: "กรุณาเลือกรูปภาพที่ต้องการส่ง" };
  }

  // Reject anything that is not an image we uploaded ourselves
  if (!IMAGE_PATH_PATTERN.test(imagePath)) {
    return { error: "รูปภาพไม่ถูกต้อง รองรับเฉพาะไฟล์ JPG หรือ PNG ที่อัปโหลดผ่านระบบ" };
  }

  const baseUrl = (process.env.NEXT_PUBLIC_BOOKING_URL || "").replace(/\/+$/, "");
  if (!baseUrl.startsWith("https://")) {
    return { error: "NEXT_PUBLIC_BOOKING_URL ต้องเป็น HTTPS จึงจะส่งรูปผ่าน LINE ได้" };
  }

  return { imageUrl: `${baseUrl}${imagePath}` };
}

/**
 * Pull the 11-character video id out of any of the YouTube link shapes people
 * paste: watch, youtu.be, shorts, embed and live.
 */
export function parseYoutubeId(rawUrl: string): string | null {
  const url = rawUrl.trim();
  if (!url) return null;

  const patterns = [
    /^https?:\/\/(?:www\.|m\.)?youtube\.com\/watch\?(?:[^#]*&)?v=([\w-]{11})/i,
    /^https?:\/\/(?:www\.)?youtu\.be\/([\w-]{11})/i,
    /^https?:\/\/(?:www\.|m\.)?youtube\.com\/(?:shorts|embed|live|v)\/([\w-]{11})/i,
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }

  return null;
}

/**
 * A YouTube link cannot go out as a LINE video message — LINE fetches and plays
 * the file itself, and YouTube serves a player page instead. Send a Flex bubble
 * instead: the video thumbnail, the caption, and a button that opens YouTube.
 */
function buildYoutubeMessage(videoId: string, videoUrl: string, caption: string) {
  const bubble: Record<string, unknown> = {
    type: "bubble",
    hero: {
      type: "image",
      // hqdefault always exists; maxresdefault is missing on many videos
      url: `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
      size: "full",
      aspectRatio: "4:3",
      aspectMode: "cover",
      action: { type: "uri", uri: videoUrl },
    },
    footer: {
      type: "box",
      layout: "vertical",
      contents: [
        {
          type: "button",
          style: "primary",
          color: "#FF0000",
          action: { type: "uri", label: "ดูวิดีโอบน YouTube", uri: videoUrl },
        },
      ],
    },
  };

  if (caption) {
    bubble.body = {
      type: "box",
      layout: "vertical",
      contents: [{ type: "text", text: caption, wrap: true, size: "sm" }],
    };
  }

  return {
    type: "flex",
    altText: caption || "วิดีโอจาก YouTube",
    contents: bubble,
  };
}

/**
 * Validate the request body of a send and turn it into a BroadcastMessage.
 * Returns a Thai error message when the content cannot be sent.
 */
export function resolveBroadcastMessage(body: {
  messageType?: unknown;
  imageUrl?: unknown;
  text?: unknown;
  videoUrl?: unknown;
}): { message?: BroadcastMessage; error?: string } {
  const rawType = typeof body.messageType === "string" ? body.messageType.trim() : "image";
  const text = typeof body.text === "string" ? body.text.trim() : "";

  if (text.length > MAX_TEXT_LENGTH) {
    return { error: `ข้อความต้องยาวไม่เกิน ${MAX_TEXT_LENGTH} ตัวอักษร` };
  }

  if (rawType === "image") {
    const imagePath = typeof body.imageUrl === "string" ? body.imageUrl.trim() : "";
    const { imageUrl, error } = resolveImageUrl(imagePath);
    if (error || !imageUrl) return { error };

    return {
      message: {
        type: "image",
        imagePath,
        text: "",
        videoUrl: "",
        payload: [
          {
            type: "image",
            originalContentUrl: imageUrl,
            previewImageUrl: imageUrl,
          },
        ],
      },
    };
  }

  if (rawType === "text") {
    if (!text) {
      return { error: "กรุณากรอกข้อความที่ต้องการส่ง" };
    }

    return {
      message: {
        type: "text",
        imagePath: "",
        text,
        videoUrl: "",
        payload: [{ type: "text", text }],
      },
    };
  }

  if (rawType === "youtube") {
    const rawUrl = typeof body.videoUrl === "string" ? body.videoUrl.trim() : "";
    if (!rawUrl) {
      return { error: "กรุณากรอกลิงก์ YouTube ที่ต้องการส่ง" };
    }

    const videoId = parseYoutubeId(rawUrl);
    if (!videoId) {
      return {
        error: "ลิงก์ YouTube ไม่ถูกต้อง ตัวอย่าง https://www.youtube.com/watch?v=xxxxxxxxxxx",
      };
    }

    const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;

    return {
      message: {
        type: "youtube",
        imagePath: "",
        text,
        videoUrl,
        payload: [buildYoutubeMessage(videoId, videoUrl, text)],
      },
    };
  }

  return { error: "ประเภทข้อความไม่ถูกต้อง" };
}

// One-line description of a broadcast, for the shared line_log table
function describeBroadcast(message: BroadcastMessage): string {
  if (message.type === "image") return `[Broadcast] ${message.imagePath}`;
  if (message.type === "youtube") return `[Broadcast] ${message.videoUrl}`;
  return `[Broadcast] ${message.text.slice(0, 200)}`;
}

/**
 * Open the broadcast_send_log row before the first push, so a crash midway
 * still leaves a record of what went out. sent_count/failed_count start at 0
 * and are updated as the pushes progress, which is what the UI polls.
 */
export async function createBroadcastLog(options: {
  message: BroadcastMessage;
  branchIds: number[];
  total: number;
  isTest?: boolean;
}) {
  const { message, branchIds, total, isTest = false } = options;

  // The insert and LAST_INSERT_ID() must share one connection, hence the transaction
  return prisma.$transaction(async (tx) => {
    await tx.$executeRaw`
      INSERT INTO broadcast_send_log
        (message_type, image_path, message_text, video_url, branch_ids, total_count, sent_count, failed_count, is_test, sent_at)
      VALUES (
        ${message.type},
        ${message.imagePath || null},
        ${message.text || null},
        ${message.videoUrl || null},
        ${JSON.stringify(branchIds.map(String))},
        ${total},
        0,
        0,
        ${isTest ? 'yes' : 'no'},
        ${thaiDateTime()}
      )
    `;
    const created = await tx.$queryRaw<Array<{ id: bigint | number }>>`
      SELECT LAST_INSERT_ID() AS id
    `;
    return Number(created[0]?.id || 0);
  });
}

// One batch worth of recipient rows, written together to keep the DB round
// trips proportional to the number of batches rather than to the recipients.
async function recordBatch(
  logId: number,
  message: BroadcastMessage,
  results: Array<{ target: BroadcastTarget; success: boolean }>,
) {
  if (results.length === 0) return;

  const sentAt = thaiDateTime();

  try {
    const rows = results.map(
      ({ target, success }) =>
        Prisma.sql`(${logId}, ${target.line_id}, ${target.name}, ${target.phone}, ${success ? 'yes' : 'no'}, ${sentAt})`,
    );
    await prisma.$executeRaw`
      INSERT INTO broadcast_send_recipient (log_id, line_id, name, phone, success, sent_at)
      VALUES ${Prisma.join(rows)}
    `;
  } catch (recipientError) {
    console.error("Error recording broadcast recipients:", recipientError);
  }

  // Keep the global LINE message log in sync with the other send routes
  try {
    const description = describeBroadcast(message);
    await prisma.lineLog.createMany({
      data: results.map(({ target }) => ({
        lineId: target.line_id,
        message: description,
        createdAt: new Date(),
      })),
    });
  } catch (logError) {
    console.error("Error logging broadcast:", logError);
  }
}

/**
 * Push the message to every target of an already-created log, PUSH_CONCURRENCY
 * at a time, writing progress back to the log after every batch. Never throws:
 * a failed push is counted, and the counters are flushed even if it aborts.
 */
export async function runBroadcastPushes(options: {
  logId: number;
  message: BroadcastMessage;
  targets: BroadcastTarget[];
}) {
  const { logId, message, targets } = options;
  const recipients = targets.filter((target) => target.line_id);

  let sent = 0;
  let failed = 0;

  const flushProgress = async () => {
    try {
      // total_count is rewritten too: the UI treats sent + failed === total as
      // "finished", so it must match the number actually being pushed even when
      // the caller counted targets that carry no line_id.
      await prisma.$executeRaw`
        UPDATE broadcast_send_log
        SET sent_count = ${sent}, failed_count = ${failed}, total_count = ${recipients.length}
        WHERE id = ${logId}
      `;
    } catch (progressError) {
      console.error("Error updating broadcast progress:", progressError);
    }
  };

  if (recipients.length === 0) {
    await flushProgress();
    return { logId, sent, failed, total: 0 };
  }

  try {
    for (let i = 0; i < recipients.length; i += PUSH_CONCURRENCY) {
      const batch = recipients.slice(i, i + PUSH_CONCURRENCY);

      const results = await Promise.all(
        batch.map(async (target) => ({
          target,
          success: await sendLineMessages(target.line_id, message.payload),
        })),
      );

      for (const { success } of results) {
        if (success) sent++;
        else failed++;
      }

      await recordBatch(logId, message, results);
      await flushProgress();
    }
  } catch (error) {
    console.error("Broadcast run aborted", error);
    // Leave the counters at whatever actually went out
    await flushProgress();
  }

  return { logId, sent, failed, total: recipients.length };
}

/**
 * Create the log and push to every target in one go. Only safe for sends small
 * enough to finish inside a request; larger sends must create the log, respond,
 * and then call runBroadcastPushes in the background.
 */
export async function runBroadcast(options: {
  message: BroadcastMessage;
  branchIds: number[];
  targets: BroadcastTarget[];
  isTest?: boolean;
}) {
  const { message, branchIds, targets, isTest = false } = options;

  const logId = await createBroadcastLog({
    message,
    branchIds,
    total: targets.length,
    isTest,
  });

  return runBroadcastPushes({ logId, message, targets });
}
