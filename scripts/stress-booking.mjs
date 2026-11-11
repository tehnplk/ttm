// Race-condition stress test for booking creation.
// Usage: node scripts/stress-booking.mjs --base http://localhost:3000 --date 2027-06-14 [--admin]
// Uses 14 consecutive days starting at --date (must be empty of bookings). All rows are tagged
// booker_name = 'STRESS-TEST'. LOCAL DEV ONLY. Node 18+, no dependencies.

const args = process.argv.slice(2);
const opt = (k, d) => {
  const i = args.indexOf(`--${k}`);
  return i >= 0 ? args[i + 1] : d;
};
const BASE = opt("base", "http://localhost:3000").replace(/\/$/, "");
const DATE0 = opt("date");
const USE_ADMIN = args.includes("--admin");
if (!DATE0 || !/^\d{4}-\d{2}-\d{2}$/.test(DATE0)) {
  console.error("usage: node scripts/stress-booking.mjs --base <url> --date YYYY-MM-DD [--admin]");
  process.exit(2);
}

const BRANCH = 5;
const SERVICE = 1;
const NAME = "STRESS-TEST";
// active staff of branch 5 in the local DB (employee.is_active = 'yes')
const STAFF = [85, 86, 87, 89, 90, 91, 92, 93, 94, 95, 96, 97, 98, 100, 101, 103, 104, 106, 107, 108, 109, 110, 111, 112, 113, 118, 120, 122, 123, 124, 125];
// daytime slots only (evening slots are gated by the overtime roster)
const SLOTS = [
  { id: "t-0-08:30-10:00", label: "08:30 - 10:00" },
  { id: "t-1-10:30-12:00", label: "10:30 - 12:00" },
  { id: "t-2-13:00-14:30", label: "13:00 - 14:30" },
  { id: "t-3-15:00-16:30", label: "15:00 - 16:30" },
];

const dayN = (n) => {
  const d = new Date(`${DATE0}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};
const DATES_USED = [dayN(0), dayN(13)];

// one booking attempt; never throws
async function book(via, staff, date, slot) {
  const t0 = performance.now();
  const url = via === "admin" ? `${BASE}/api/admin/bookings` : `${BASE}/api/bookings`;
  const body =
    via === "admin"
      ? { empId: staff, branchId: BRANCH, serviceId: SERVICE, bookDate: date, bookTime: slot.id, bookerName: NAME, bookerTel: "0000000000" }
      : { branchId: String(BRANCH), serviceId: String(SERVICE), staffId: String(staff), date, time: slot.label, timeSlotId: slot.id, customerName: NAME, customerPhone: "0000000000", price: 250, note: "stress" };
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(120000),
    });
    const text = await res.text();
    let j = null;
    try { j = JSON.parse(text); } catch {}
    return { via, status: res.status, ms: performance.now() - t0, code: res.status === 201 ? j?.bookingId : null, text };
  } catch (e) {
    return { via, status: 0, ms: performance.now() - t0, code: null, text: String(e) };
  }
}

const pct = (sorted, p) => sorted[Math.max(0, Math.ceil(p * sorted.length) - 1)];

function summarize(results) {
  const byStatus = {};
  for (const r of results) byStatus[r.status] = (byStatus[r.status] || 0) + 1;
  const codes = results.filter((r) => r.status === 201).map((r) => r.code);
  const distinct = new Set(codes).size;
  const ms = results.map((r) => r.ms).sort((a, b) => a - b);
  const err = results.filter((r) => r.status === 0 || r.status >= 500);
  return {
    byStatus,
    ok: byStatus[201] || 0,
    conflict: byStatus[409] || 0,
    distinct,
    dupCodes: codes.length - distinct,
    p50: pct(ms, 0.5), p95: pct(ms, 0.95), max: ms[ms.length - 1],
    errCount: err.length,
    errSample: err[0] ? `${err[0].status} ${err[0].text.slice(0, 300)}` : null,
  };
}

const rows = [];
let failed = false;
function report(name, expectText, results, check) {
  const s = summarize(results);
  const problems = check(s, results);
  if (s.errCount) problems.push(`${s.errCount} x 5xx/network error`);
  if (s.dupCodes) problems.push(`${s.dupCodes} duplicate BK codes in responses`);
  if (problems.length) failed = true;
  rows.push({ name, expectText, s, problems });
}

console.log(`base=${BASE} admin=${USE_ADMIN} dates=${dayN(0)}..${dayN(13)}`);

// ---- warm-up: one request per endpoint on its own slot (day 0) ----
{
  const w1 = await book("public", STAFF[0], dayN(0), SLOTS[0]);
  console.log(`warm-up public: ${w1.status} ${Math.round(w1.ms)}ms ${w1.code ?? w1.text.slice(0, 200)}`);
  if (USE_ADMIN) {
    const w2 = await book("admin", STAFF[1], dayN(0), SLOTS[0]);
    console.log(`warm-up admin : ${w2.status} ${Math.round(w2.ms)}ms ${w2.code ?? w2.text.slice(0, 200)}`);
  }
}

// ---- pool warm-up: 40 concurrent invalid POSTs (400, no rows written) so the DB connection pool is
// fully open; on a cold pool requests arrive staggered and scenario 1 can pass by luck ----
{
  const rs = await Promise.all(
    Array.from({ length: 40 }, () =>
      fetch(`${BASE}/api/bookings`, { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" }).then((r) => r.status, () => 0),
    ),
  );
  console.log(`pool warm-up: ${[...new Set(rs)].join(",")} x${rs.length}`);
}

// ---- 1. SAME SLOT: 50 x one slot ----
{
  const slot = SLOTS[1];
  const rs = await Promise.all(Array.from({ length: 50 }, () => book("public", 113, dayN(1), slot)));
  report("1 SAME SLOT", "50 req: 1x201 49x409", rs, (s) => {
    const p = [];
    if (s.ok !== 1) p.push(`201 expected 1 got ${s.ok}`);
    if (s.conflict !== 49) p.push(`409 expected 49 got ${s.conflict}`);
    return p;
  });
}

// ---- 2. DISTINCT SLOTS: 100 distinct (staff, slot) on one date ----
{
  const reqs = [];
  for (let i = 0; i < 25; i++) for (const slot of SLOTS) reqs.push(book("public", STAFF[i], dayN(2), slot));
  const rs = await Promise.all(reqs);
  report("2 DISTINCT", "100 req: 100x201, 100 codes", rs, (s) => {
    const p = [];
    if (s.ok !== 100) p.push(`201 expected 100 got ${s.ok}`);
    if (s.distinct !== 100) p.push(`distinct codes expected 100 got ${s.distinct}`);
    return p;
  });
}

// ---- 3. MIXED: 40 slots x 5 competitors (10 staff x 4 slots on one date) ----
{
  const reqs = [];
  for (let k = 0; k < 40; k++) {
    const staff = STAFF[k % 10];
    const slot = SLOTS[Math.floor(k / 10)];
    for (let j = 0; j < 5; j++) reqs.push(book(USE_ADMIN && j >= 3 ? "admin" : "public", staff, dayN(3), slot));
  }
  const rs = await Promise.all(reqs);
  report("3 MIXED", "200 req: 40x201 160x409 40 codes", rs, (s) => {
    const p = [];
    if (s.ok !== 40) p.push(`201 expected 40 got ${s.ok}`);
    if (s.conflict !== 160) p.push(`409 expected 160 got ${s.conflict}`);
    if (s.distinct !== 40) p.push(`distinct codes expected 40 got ${s.distinct}`);
    return p;
  });
}

// ---- 4. REPEATED BURSTS: 10 rounds x (10 slots x 3 competitors), fresh date per round ----
{
  const all = [];
  const perRound = [];
  for (let r = 0; r < 10; r++) {
    const reqs = [];
    for (let k = 0; k < 10; k++) for (let j = 0; j < 3; j++) reqs.push(book("public", STAFF[k], dayN(4 + r), SLOTS[k % 4]));
    const rs = await Promise.all(reqs);
    perRound.push(rs.filter((x) => x.status === 201).length);
    all.push(...rs);
  }
  report("4 BURSTS", "10x30 req: 10x201 per round", all, (s) => {
    const p = [];
    const bad = perRound.map((n, i) => (n !== 10 ? `r${i + 1}=${n}` : null)).filter(Boolean);
    if (bad.length) p.push(`rounds != 10 successes: ${bad.join(",")}`);
    if (s.distinct !== s.ok) p.push(`distinct codes ${s.distinct} of ${s.ok} successes`);
    return p;
  });
  rows[rows.length - 1].extra = `successes per round: ${perRound.join(",")}`;
}

// ---- output ----
const pad = (v, n) => String(v).padEnd(n);
console.log("\n" + [pad("scenario", 13), pad("status counts", 26), pad("ok", 5), pad("distinct", 9), pad("dupBK", 6), pad("p50", 7), pad("p95", 7), pad("max", 7), "verdict"].join(" "));
for (const { name, s, problems, extra } of rows) {
  const counts = Object.entries(s.byStatus).map(([k, v]) => `${k}:${v}`).join(" ");
  console.log([pad(name, 13), pad(counts, 26), pad(s.ok, 5), pad(s.distinct, 9), pad(s.dupCodes, 6), pad(Math.round(s.p50), 7), pad(Math.round(s.p95), 7), pad(Math.round(s.max), 7), problems.length ? "FAIL" : "PASS"].join(" "));
  console.log(`  expected: ${rows.find((r) => r.name === name).expectText}`);
  for (const p of problems) console.log(`  ! ${p}`);
  if (extra) console.log(`  ${extra}`);
  if (s.errSample) console.log(`  sample 5xx: ${s.errSample}`);
}
console.log(`\nDB check (read-only):\n  SELECT emp_id, DATE_FORMAT(book_date,'%Y-%m-%d') d, book_time, COUNT(*) n FROM booking WHERE booker_name='STRESS-TEST' AND book_date BETWEEN '${dayN(0)}' AND '${dayN(13)}' GROUP BY emp_id, book_date, book_time HAVING n > 1`);
console.log(`  SELECT booking_id, COUNT(*) n FROM booking WHERE booker_name='STRESS-TEST' AND book_date BETWEEN '${dayN(0)}' AND '${dayN(13)}' GROUP BY booking_id HAVING n > 1`);
console.log(failed ? "\nRESULT: FAIL" : "\nRESULT: PASS");
process.exit(failed ? 1 : 0);
