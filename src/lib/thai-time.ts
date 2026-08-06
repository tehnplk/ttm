/**
 * Timestamps for MySQL DATETIME columns.
 *
 * This database stores Thai wall-clock time (UTC+7) directly in its DATETIME
 * columns — not UTC. The client reads them back through Prisma, which labels
 * the value UTC, and the UI prints the UTC components verbatim, so the wall
 * clock survives the round trip.
 *
 * The catch: the MySQL server itself runs in UTC (@@system_time_zone = UTC),
 * so NOW() and CURDATE() produce UTC wall-clock and land 7 hours behind every
 * other timestamp in the database. Always pass one of these strings instead of
 * calling NOW(), and never hand Prisma a JS Date for these columns — Prisma
 * normalises Date to UTC before sending it.
 */

const BANGKOK_DATETIME = new Intl.DateTimeFormat("sv-SE", {
  timeZone: "Asia/Bangkok",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hour12: false,
});

/**
 * Thai wall-clock time as "YYYY-MM-DD HH:MM:SS", ready for a DATETIME column.
 * The sv-SE locale already formats in exactly that shape.
 */
export function thaiDateTime(date: Date = new Date()): string {
  return BANGKOK_DATETIME.format(date).replace("T", " ");
}
