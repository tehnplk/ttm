// Evening overtime rounds, Monday to Friday. An opening-hours slot marked
// "overtime" is bookable only with staff rostered for that weekday + round.
// A branch's overtime slots, in start-time order, are round 1 and round 2.

export const SLOT_TYPE_LABELS = {
  regular: "ในเวลา",
  overtime: "นอกเวลา",
} as const;
export type SlotType = keyof typeof SLOT_TYPE_LABELS;

export const OVERTIME_ROUND_IDS = [1, 2];
export const MAX_OVERTIME_ROUNDS = OVERTIME_ROUND_IDS.length;

// Shift key = "<weekday>-<round>", weekday 1=Mon..5=Fri (JS getDay numbering)
export const shiftKey = (weekday: number, round: number) => `${weekday}-${round}`;

export const SHIFT_KEY = /^[1-5]-[12]$/;

export function parseShifts(raw: string): string[] {
  try {
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr.filter((k) => typeof k === "string" && SHIFT_KEY.test(k)) : [];
  } catch {
    return [];
  }
}

type HourSlot = { startTime: string; slotType?: string | null };

// Start times of a branch's overtime slots, in round order
export function overtimeStartTimes(hours: HourSlot[]): string[] {
  return hours
    .filter((h) => h.slotType === "overtime")
    .map((h) => h.startTime.trim())
    .sort();
}

// Round number (1-based) of the slot starting at startTime, or null when it is not overtime
export function overtimeRound(hours: HourSlot[], startTime: string): number | null {
  const i = overtimeStartTimes(hours).indexOf(startTime.trim());
  return i >= 0 ? i + 1 : null;
}

// "YYYY-MM-DD" → Monday of its week as "YYYY-MM-DD"
export function weekStartOf(dateStr: string): string {
  const d = new Date(`${dateStr}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7));
  return d.toISOString().slice(0, 10);
}

// Roster week + shift key for a date and round. Saturday and Sunday keys
// never match a roster entry, so nobody is bookable then.
export function rosterKey(dateStr: string, round: number): { weekStart: Date; key: string } {
  return {
    weekStart: new Date(`${weekStartOf(dateStr)}T00:00:00Z`),
    key: shiftKey(new Date(`${dateStr}T00:00:00Z`).getUTCDay(), round),
  };
}
