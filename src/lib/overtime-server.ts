import prisma from "@/lib/prisma";
import { overtimeSlot, parseShifts } from "@/lib/overtime";

// Staff ids rostered for this overtime slot, or null when the slot is not an
// overtime round (normal availability rules apply). Weekend rounds have no
// roster, so they return an empty set.
export async function staffOnShift(dateStr: string, startTime: string): Promise<Set<string> | null> {
  const slot = overtimeSlot(dateStr, startTime);
  if (!slot) return null;
  const rows = await prisma.overtimeShift.findMany({ where: { weekStart: slot.weekStart } });
  return new Set(rows.filter((r) => parseShifts(r.shifts).includes(slot.key)).map((r) => String(r.empId)));
}
