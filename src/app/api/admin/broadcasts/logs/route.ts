import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireApiAuth } from "@/lib/api-auth";

// Get the history of broadcasts that were sent
export async function GET(request: NextRequest) {
  // Check authentication
  const authError = await requireApiAuth(request);
  if (authError) return authError;
  try {
    const logs = await prisma.$queryRaw<Array<{
      id: number;
      messageType: string | null;
      imagePath: string | null;
      messageText: string | null;
      videoUrl: string | null;
      branchIds: string;
      totalCount: number;
      sentCount: number;
      failedCount: number;
      isTest: string;
      sentAt: Date | null;
    }>>`
      SELECT
        id,
        COALESCE(message_type, 'image') as messageType,
        image_path as imagePath,
        message_text as messageText,
        video_url as videoUrl,
        COALESCE(branch_ids, '[]') as branchIds,
        total_count as totalCount,
        sent_count as sentCount,
        failed_count as failedCount,
        is_test as isTest,
        sent_at as sentAt
      FROM broadcast_send_log
      ORDER BY sent_at DESC, id DESC
    `;

    return NextResponse.json({
      logs: logs.map((log) => {
        // Parse branchIds from JSON string to array
        let branchIds: string[] = [];
        try {
          const parsed = JSON.parse(log.branchIds || "[]");
          branchIds = Array.isArray(parsed) ? parsed.map((id) => String(id)) : [];
        } catch (err) {
          console.error("Error parsing branchIds:", err, "Raw value:", log.branchIds);
          branchIds = [];
        }

        return {
          id: log.id,
          messageType: log.messageType || "image",
          imagePath: log.imagePath || "",
          messageText: log.messageText || "",
          videoUrl: log.videoUrl || "",
          branchIds,
          totalCount: Number(log.totalCount ?? 0),
          sentCount: Number(log.sentCount ?? 0),
          failedCount: Number(log.failedCount ?? 0),
          isTest: log.isTest === "yes",
          sentAt: log.sentAt
            ? (log.sentAt instanceof Date ? log.sentAt.toISOString() : new Date(log.sentAt).toISOString())
            : null,
        };
      }),
    });
  } catch (error) {
    console.error("Get broadcast logs error", error);
    return NextResponse.json(
      {
        error: "Failed to load broadcast logs",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}
