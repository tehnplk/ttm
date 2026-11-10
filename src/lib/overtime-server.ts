import prisma from "@/lib/prisma";
import { overtimeRound, parseShifts, rosterKey } from "@/lib/overtime";

// Staff ids rostered for this branch slot on this date, or null when the slot
// is not marked overtime (normal availability rules apply). Weekend rounds
// have no roster, so they return an empty set.
export async function staffOnShift(branchId: string, dateStr: string, startTime: string): Promise<Set<string> | null> {
  const hours = await prisma.openingHours.findMany({ where: { branchId } });
  const round = overtimeRound(hours, startTime);
  if (round === null) return null;
  const { weekStart, key } = rosterKey(dateStr, round);
  const rows = await prisma.overtimeShift.findMany({ where: { weekStart } });
  return new Set(rows.filter((r) => parseShifts(r.shifts).includes(key)).map((r) => String(r.empId)));
}
