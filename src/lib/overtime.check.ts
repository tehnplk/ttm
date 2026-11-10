// Run: npx tsx src/lib/overtime.check.ts
import assert from "node:assert/strict";
import { overtimeRound, rosterKey } from "./overtime";

const iso = (d: Date) => d.toISOString().slice(0, 10);

const hours = [
  { startTime: "08:30", slotType: "regular" },
  { startTime: "18:30", slotType: "overtime" },
  { startTime: "17:00", slotType: "overtime" },
  { startTime: "20:00", slotType: "regular" },
];

assert.equal(overtimeRound(hours, "17:00"), 1, "earliest overtime slot is round 1");
assert.equal(overtimeRound(hours, "18:30"), 2, "next overtime slot is round 2");
assert.equal(overtimeRound(hours, "08:30"), null, "regular slot is not overtime");
assert.equal(overtimeRound(hours, "20:00"), null, "regular evening slot is not overtime");
assert.equal(overtimeRound([{ startTime: "17:00" }], "17:00"), null, "missing slot type means regular");

const fri = rosterKey("2026-11-13", 2);
assert.equal(iso(fri.weekStart), "2026-11-09", "Friday maps to its Monday");
assert.equal(fri.key, "5-2", "Friday round 2");

const mon = rosterKey("2026-11-09", 1);
assert.equal(iso(mon.weekStart), "2026-11-09", "Monday is its own week start");
assert.equal(mon.key, "1-1", "Monday round 1");

const sun = rosterKey("2026-11-15", 1);
assert.equal(iso(sun.weekStart), "2026-11-09", "Sunday belongs to the week that started Monday");
assert.equal(sun.key, "0-1", "Sunday key never matches a roster entry");

console.log("overtime checks passed");
