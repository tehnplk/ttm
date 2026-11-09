// Evening overtime rounds, Monday to Friday. A booking slot starting at a
// round time is bookable only with staff rostered for that weekday + round.
export const OVERTIME_ROUNDS = [
  { id: 1, time: "17:00" },
  { id: 2, time: "18:30" },
];

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

// "YYYY-MM-DD" → Monday of its week as "YYYY-MM-DD"
export function weekStartOf(dateStr: string): string {
  const d = new Date(`${dateStr}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7));
  return d.toISOString().slice(0, 10);
}

// dateStr "YYYY-MM-DD" + slot start "HH:mm" → the roster week + shift key,
// or null when the slot is not an overtime round. Saturday and Sunday keys
// never match a roster entry, so nobody is bookable then.
export function overtimeSlot(dateStr: string, startTime: string): { weekStart: Date; key: string } | null {
  const round = OVERTIME_ROUNDS.find((r) => r.time === startTime.trim());
  if (!round) return null;
  const date = new Date(`${dateStr}T00:00:00Z`);
  if (isNaN(date.getTime())) return null;
  return {
    weekStart: new Date(`${weekStartOf(dateStr)}T00:00:00Z`),
    key: shiftKey(date.getUTCDay(), round.id),
  };
}
