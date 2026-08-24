import { after, NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import prisma from "@/lib/prisma";
import { requireApiAuth } from "@/lib/api-auth";
import {
  BroadcastTarget,
  createBroadcastLog,
  resolveBroadcastMessage,
  runBroadcastPushes,
} from "@/lib/line-broadcast";

// Send a broadcast immediately to everyone who booked at the selected branches.
// The content is an image, a plain text message, or a YouTube link.
// The pushes run in the background: sending to 1156 recipients took 6m13s, far
// past the reverse proxy's read timeout, which made nginx answer the browser
// with an HTML error page while the send actually kept running and succeeded.
// The response now returns as soon as the log row exists, and the client polls
// that row for progress.
export async function POST(request: NextRequest) {
  // Check authentication
  const authError = await requireApiAuth(request);
  if (authError) return authError;
  try {
    const body = await request.json();

    // Recipients are scoped to the selected branches
    const branchIds = (Array.isArray(body.branchIds) ? body.branchIds : [])
      .map((id: unknown) => parseInt(String(id), 10))
      .filter((id: number) => Number.isInteger(id));

    if (branchIds.length === 0) {
      return NextResponse.json(
        { error: "กรุณาเลือกสาขาอย่างน้อย 1 สาขา" },
        { status: 400 },
      );
    }

    const { message, error: messageError } = resolveBroadcastMessage(body);
    if (messageError || !message) {
      return NextResponse.json({ error: messageError }, { status: 400 });
    }

    // LINE users who booked at one of the selected branches within the last 90 days
    // (upcoming bookings included). The inner query picks each user's newest booking
    // so the recipient list carries their most recent name and phone number.
    const targets = await prisma.$queryRaw<BroadcastTarget[]>`
      SELECT b.line_id, b.booker_name AS name, b.booker_tel AS phone
      FROM booking b
      INNER JOIN (
        SELECT line_id, MAX(id) AS max_id
        FROM booking
        WHERE line_id IS NOT NULL
          AND line_id != ''
          AND book_date >= DATE_SUB(CURDATE(), INTERVAL 90 DAY)
          AND branch_id IN (${Prisma.join(branchIds)})
        GROUP BY line_id
      ) latest ON latest.max_id = b.id
    `;

    if (targets.length === 0) {
      return NextResponse.json(
        { error: "ไม่พบผู้ใช้ LINE ที่มีประวัติการจองในสาขาที่เลือกภายใน 90 วัน" },
        { status: 400 },
      );
    }

    const recipients = targets.filter((target) => target.line_id);
    const logId = await createBroadcastLog({
      message,
      branchIds,
      total: recipients.length,
    });

    // Runs after the response is flushed, so the browser never waits on LINE
    after(() => runBroadcastPushes({ logId, message, targets: recipients }));

    return NextResponse.json(
      {
        success: true,
        queued: true,
        id: logId,
        total: recipients.length,
      },
      { status: 202 },
    );
  } catch (error) {
    console.error("Send broadcast now error", error);
    return NextResponse.json(
      {
        error: "Failed to send broadcast",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}
