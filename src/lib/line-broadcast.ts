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

export interface BroadcastTarget {
  line_id: string;
  name: string | null;
  phone: string | null;
}

// Send broadcast image to LINE user
export async function sendLineImage(userId: string, imageUrl: string) {
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
        messages: [
          {
            type: "image",
            originalContentUrl: imageUrl,
            previewImageUrl: imageUrl,
          },
        ],
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
 * Open the broadcast_send_log row before the first push, so a crash midway
 * still leaves a record of what went out. sent_count/failed_count start at 0
 * and are updated as the pushes progress, which is what the UI polls.
 */
export async function createBroadcastLog(options: {
  imagePath: string;
  branchIds: number[];
  total: number;
  isTest?: boolean;
}) {
  const { imagePath, branchIds, total, isTest = false } = options;

  // The insert and LAST_INSERT_ID() must share one connection, hence the transaction
  return prisma.$transaction(async (tx) => {
    await tx.$executeRaw`
      INSERT INTO broadcast_send_log (image_path, branch_ids, total_count, sent_count, failed_count, is_test, sent_at)
      VALUES (${imagePath}, ${JSON.stringify(branchIds.map(String))}, ${total}, 0, 0, ${isTest ? 'yes' : 'no'}, ${thaiDateTime()})
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
  imagePath: string,
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
    await prisma.lineLog.createMany({
      data: results.map(({ target }) => ({
        lineId: target.line_id,
        message: `[Broadcast] ${imagePath}`,
        createdAt: new Date(),
      })),
    });
  } catch (logError) {
    console.error("Error logging broadcast:", logError);
  }
}

/**
 * Push the image to every target of an already-created log, PUSH_CONCURRENCY at
 * a time, writing progress back to the log after every batch. Never throws: a
 * failed push is counted, and the counters are flushed even if it aborts.
 */
export async function runBroadcastPushes(options: {
  logId: number;
  imagePath: string;
  imageUrl: string;
  targets: BroadcastTarget[];
}) {
  const { logId, imagePath, imageUrl, targets } = options;
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
          success: await sendLineImage(target.line_id, imageUrl),
        })),
      );

      for (const { success } of results) {
        if (success) sent++;
        else failed++;
      }

      await recordBatch(logId, imagePath, results);
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
  imagePath: string;
  imageUrl: string;
  branchIds: number[];
  targets: BroadcastTarget[];
  isTest?: boolean;
}) {
  const { imagePath, imageUrl, branchIds, targets, isTest = false } = options;

  const logId = await createBroadcastLog({
    imagePath,
    branchIds,
    total: targets.length,
    isTest,
  });

  return runBroadcastPushes({ logId, imagePath, imageUrl, targets });
}
