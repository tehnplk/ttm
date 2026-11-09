import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireApiAuth } from "@/lib/api-auth";
import { SHIFT_KEY, parseShifts } from "@/lib/overtime";

type ShiftRow = { empId: number; shifts: string[]; note: string };

// "YYYY-MM-DD" that falls on a Monday → Date at UTC midnight, else null
function parseWeekStart(value: unknown): Date | null {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const date = new Date(`${value}T00:00:00Z`);
  if (isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value) return null;
  return date.getUTCDay() === 1 ? date : null;
}

// List one week's roster: ?week=YYYY-MM-DD (Monday)
export async function GET(request: NextRequest) {
  const authError = await requireApiAuth(request);
  if (authError) return authError;
  const weekStart = parseWeekStart(request.nextUrl.searchParams.get("week"));
  if (!weekStart) {
    return NextResponse.json({ error: "week ต้องเป็นวันจันทร์ รูปแบบ YYYY-MM-DD" }, { status: 400 });
  }
  try {
    const rows = await prisma.overtimeShift.findMany({ where: { weekStart } });
    const shifts: ShiftRow[] = rows.map((r) => ({
      empId: r.empId,
      shifts: parseShifts(r.shifts),
      note: r.note || "",
    }));
    return NextResponse.json({ shifts });
  } catch (error) {
    console.error("Admin overtime shifts GET error", error);
    return NextResponse.json({ error: "Failed to load overtime shifts" }, { status: 500 });
  }
}

// Replace one week's roster: body = { weekStart: "YYYY-MM-DD", shifts: ShiftRow[] }
export async function PUT(request: NextRequest) {
  const authError = await requireApiAuth(request);
  if (authError) return authError;
  try {
    const body = await request.json();
    const weekStart = parseWeekStart(body?.weekStart);
    if (!weekStart) {
      return NextResponse.json({ error: "weekStart ต้องเป็นวันจันทร์ รูปแบบ YYYY-MM-DD" }, { status: 400 });
    }
    const input: unknown[] = Array.isArray(body?.shifts) ? body.shifts : [];

    const rows: ShiftRow[] = [];
    for (const item of input) {
      const o = item as Record<string, unknown>;
      const empId = typeof o?.empId === "number" ? o.empId : parseInt(String(o?.empId), 10);
      if (!Number.isInteger(empId)) {
        return NextResponse.json({ error: "empId ไม่ถูกต้อง" }, { status: 400 });
      }
      const shifts = Array.isArray(o.shifts)
        ? Array.from(new Set(o.shifts.filter((k): k is string => typeof k === "string" && SHIFT_KEY.test(k))))
        : [];
      const note = typeof o.note === "string" ? o.note.trim().slice(0, 500) : "";
      rows.push({ empId, shifts, note });
    }

    await prisma.$transaction([
      prisma.overtimeShift.deleteMany({
        where: { weekStart, empId: { notIn: rows.map((r) => r.empId) } },
      }),
      ...rows.map((r) =>
        prisma.overtimeShift.upsert({
          where: { empId_weekStart: { empId: r.empId, weekStart } },
          create: { empId: r.empId, weekStart, shifts: JSON.stringify(r.shifts), note: r.note || null },
          update: { shifts: JSON.stringify(r.shifts), note: r.note || null },
        }),
      ),
    ]);

    return NextResponse.json({ shifts: rows });
  } catch (error) {
    console.error("Admin overtime shifts PUT error", error);
    return NextResponse.json({ error: "Failed to save overtime shifts" }, { status: 500 });
  }
}
