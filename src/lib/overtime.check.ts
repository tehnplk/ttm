// Run: npx tsx src/lib/overtime.check.ts
import assert from "node:assert/strict";
import { overtimeSlot } from "./overtime";

const iso = (d: Date) => d.toISOString().slice(0, 10);

const fri = overtimeSlot("2026-11-13", "18:30");
assert.equal(fri && iso(fri.weekStart), "2026-11-09", "Friday maps to its Monday");
assert.equal(fri?.key, "5-2", "Friday 18:30 is weekday 5 round 2");

const mon = overtimeSlot("2026-11-09", "17:00");
assert.equal(mon && iso(mon.weekStart), "2026-11-09", "Monday is its own week start");
assert.equal(mon?.key, "1-1", "Monday 17:00 is weekday 1 round 1");

const sun = overtimeSlot("2026-11-15", "17:00");
assert.equal(sun && iso(sun.weekStart), "2026-11-09", "Sunday belongs to the week that started Monday");
assert.equal(sun?.key, "0-1", "Sunday key never matches a roster entry");

assert.equal(overtimeSlot("2026-11-09", "08:30"), null, "daytime slot is not an overtime round");
assert.equal(overtimeSlot("2026-11-09", "20:00"), null, "20:00 is no longer an overtime round");

console.log("overtime checks passed");
