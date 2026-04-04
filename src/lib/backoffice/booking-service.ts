import prisma from "@/lib/prisma";

export type BackofficeBookingListItem = {
  id: string;
  date: Date;
  time: string;
  status: string;
  branchName: string;
  serviceName: string;
  staffName: string;
  customerName: string;
  customerPhone: string;
};

export async function listBookings(): Promise<BackofficeBookingListItem[]> {
  // Use raw query to handle Service.enabled field that might be null in database
  const bookings = await prisma.$queryRaw<Array<{
    id: number;
    book_date: Date;
    book_time: string | null;
    status: string | null;
    branch_name: string | null;
    service_name: string | null;
    employee_name: string | null;
    booker_name: string;
    booker_tel: string;
  }>>`
    SELECT 
      b.id,
      b.book_date,
      b.book_time,
      b.status,
      br.name as branch_name,
      s.name as service_name,
      CONCAT(COALESCE(e.prename, ''), COALESCE(e.fname, ''), ' ', COALESCE(e.lname, '')) as employee_name,
      b.booker_name,
      b.booker_tel
    FROM booking b
    LEFT JOIN employee e ON b.emp_id = e.id
    LEFT JOIN Branch br ON b.branch_id = br.id
    LEFT JOIN Service s ON b.service_id = s.id
    ORDER BY b.book_date DESC
    LIMIT 100
  `;

  return bookings.map((b) => ({
    id: String(b.id),
    date: b.book_date instanceof Date ? b.book_date : new Date(b.book_date),
    time: b.book_time || "",
    status: b.status || "pending",
    branchName: b.branch_name || "ไม่ระบุ",
    serviceName: b.service_name || "ไม่ระบุ",
    staffName: b.employee_name?.trim() || "ไม่ระบุ",
    customerName: b.booker_name,
    customerPhone: b.booker_tel,
  }));
}
