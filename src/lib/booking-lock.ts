import { Prisma } from '@prisma/client';
import prisma from '@/lib/prisma';

// One booking at a time: the slot check, the BK number and the insert must not
// interleave between requests, or two requests take the same slot and number.
// The lock must be the first statement, so the reads after it see the previous
// holder's committed rows.
// ponytail: one global lock (prod peaks ~10 bookings/min); per-employee lock
// plus a counter table if booking volume ever makes requests queue.
export function withBookingLock<T>(fn: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> {
  return prisma.$transaction(
    async (tx) => {
      const locked = await tx.$queryRaw<unknown[]>`SELECT 1 FROM setting LIMIT 1 FOR UPDATE`;
      if (locked.length === 0) throw new Error('setting row missing, cannot lock bookings');
      return fn(tx);
    },
    { maxWait: 15000, timeout: 15000 },
  );
}

// Only unique when called inside withBookingLock.
export async function nextBookingId(tx: Prisma.TransactionClient): Promise<string> {
  const rows = await tx.$queryRaw<Array<{ n: bigint | null }>>`
    SELECT MAX(CAST(SUBSTRING(booking_id, 4) AS UNSIGNED)) AS n
    FROM booking
    WHERE booking_id LIKE 'BK-%'
  `;
  return `BK-${String(Number(rows[0]?.n ?? 0) + 1).padStart(6, '0')}`;
}
