import prisma from "@/lib/prisma";

const LINE_CHANNEL_ACCESS_TOKEN = process.env.LINE_CHANNEL_ACCESS_TOKEN;

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
 * Push the image to every target, recording one broadcast_send_log row plus a
 * broadcast_send_recipient row per person. The log is opened before the first
 * push so a crash midway still leaves a record of what went out.
 */
export async function runBroadcast(options: {
  imagePath: string;
  imageUrl: string;
  branchIds: number[];
  targets: BroadcastTarget[];
  isTest?: boolean;
}) {
  const { imagePath, imageUrl, branchIds, targets, isTest = false } = options;

  // The insert and LAST_INSERT_ID() must share one connection, hence the transaction
  const logId = await prisma.$transaction(async (tx) => {
    await tx.$executeRaw`
      INSERT INTO broadcast_send_log (image_path, branch_ids, total_count, sent_count, failed_count, is_test, sent_at)
      VALUES (${imagePath}, ${JSON.stringify(branchIds.map(String))}, ${targets.length}, 0, 0, ${isTest ? 'yes' : 'no'}, NOW())
    `;
    const created = await tx.$queryRaw<Array<{ id: bigint | number }>>`
      SELECT LAST_INSERT_ID() AS id
    `;
    return Number(created[0]?.id || 0);
  });

  let sent = 0;
  let failed = 0;

  for (const target of targets) {
    if (!target.line_id) continue;

    const success = await sendLineImage(target.line_id, imageUrl);

    if (success) {
      sent++;
    } else {
      failed++;
    }

    try {
      await prisma.$executeRaw`
        INSERT INTO broadcast_send_recipient (log_id, line_id, name, phone, success, sent_at)
        VALUES (${logId}, ${target.line_id}, ${target.name}, ${target.phone}, ${success ? 'yes' : 'no'}, NOW())
      `;
    } catch (recipientError) {
      console.error("Error recording broadcast recipient:", recipientError);
    }

    // Keep the global LINE message log in sync with the other send routes
    try {
      await prisma.lineLog.create({
        data: {
          lineId: target.line_id,
          message: `[Broadcast] ${imagePath}`,
          createdAt: new Date(),
        },
      });
    } catch (logError) {
      console.error("Error logging broadcast:", logError);
    }
  }

  await prisma.$executeRaw`
    UPDATE broadcast_send_log
    SET sent_count = ${sent}, failed_count = ${failed}
    WHERE id = ${logId}
  `;

  return { logId, sent, failed, total: targets.length };
}
