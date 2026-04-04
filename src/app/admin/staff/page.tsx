'use client';

import { useEffect, useState } from "react";
import { Icon } from "@iconify/react";

type StaffRow = {
  id: string;
  prename: string;
  fname: string;
  lname: string;
  sex: string | null;
  birth: string | null;
  agey: number | null;
  position: number | null;
  position_name: string | null;
  branch_id: number | null;
  branch_name: string | null;
  tel: string | null;
  num_star: number | null;
  is_active: string | null;
  image: string | null;
  nickname: string | null;
  employee_number: string | null;
};

type StaffFormState = {
  id?: string;
  prename: string;
  fname: string;
  lname: string;
  nickname: string;
  sex: string;
  birth: string;
  agey: number | null;
  position: number | null;
  branch_id: number | null;
  tel: string;
  num_star: number | null;
  is_active: string;
  image: string;
  employee_number: string;
};

type PositionOption = {
  id: number;
  position: string;
};

type BranchOption = {
  id: string;
  name: string;
};

export default function AdminStaffPage() {
  const [staff, setStaff] = useState<StaffRow[]>([]);
  const [filteredStaff, setFilteredStaff] = useState<StaffRow[]>([]);
  const [positions, setPositions] = useState<PositionOption[]>([]);
  const [branches, setBranches] = useState<BranchOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [branchFilter, setBranchFilter] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [displayOrderSort, setDisplayOrderSort] = useState<"asc" | "desc" | null>("asc");
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [showImageModal, setShowImageModal] = useState(false);
  const [selectedImage, setSelectedImage] = useState<{ url: string; name: string } | null>(null);
  const [form, setForm] = useState<StaffFormState>({
    prename: "นาย",
    fname: "",
    lname: "",
    nickname: "",
    sex: "ชาย",
    birth: "",
    agey: null,
    position: null,
    branch_id: null,
    tel: "",
    num_star: null,
    is_active: "yes",
    image: "",
    employee_number: "",
  });

  async function loadStaff() {
    try {
      setLoading(true);
      const res = await fetch("/api/admin/staff");
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "โหลดข้อมูลพนักงานไม่สำเร็จ");
      }
      const staffList = data.staff ?? [];

      setStaff(staffList);
      setFilteredStaff(staffList);
      setDisplayOrderSort("asc");
      setError(null);
    } catch (err: any) {
      setError(err.message ?? "โหลดข้อมูลพนักงานไม่สำเร็จ");
    } finally {
      setLoading(false);
    }
  }

  async function loadOptions() {
    try {
      // Load positions
      const positionsRes = await fetch("/api/admin/positions");
      if (positionsRes.ok) {
        const positionsData = await positionsRes.json();
        setPositions(positionsData.positions || []);
      }

      // Load branches
      const branchesRes = await fetch("/api/admin/branches");
      if (branchesRes.ok) {
        const branchesData = await branchesRes.json();
        setBranches(branchesData.branches?.map((b: any) => ({ id: b.id, name: b.name })) || []);
      }
    } catch (err) {
      console.error("Failed to load options", err);
    }
  }

  useEffect(() => {
    void loadStaff();
    void loadOptions();
  }, []);

  // Filter staff based on search query, branch filter, status filter, and display-order sort
  useEffect(() => {
    let filtered = [...staff];

    const matchesText = (value: string | number | null | undefined, query: string) =>
      String(value ?? "").toLowerCase().includes(query);

    // Filter by branch if selected
    if (branchFilter) {
      const branchIdNum = parseInt(branchFilter);
      filtered = filtered.filter((s) => s.branch_id === branchIdNum);
    }

    // Filter by active/inactive status if selected
    if (statusFilter) {
      filtered = filtered.filter((s) => (s.is_active || "no") === statusFilter);
    }

    // Filter by search query
    const trimmedQuery = searchQuery?.trim() || '';
    if (trimmedQuery) {
      const query = trimmedQuery.toLowerCase();
      filtered = filtered.filter(
        (s) =>
          matchesText(`${s.prename} ${s.fname} ${s.lname}`.trim(), query) ||
          matchesText(s.position_name, query) ||
          matchesText(s.branch_name, query) ||
          matchesText(s.tel, query) ||
          matchesText(s.employee_number, query),
      );
    }

    if (displayOrderSort) {
      filtered = [...filtered].sort((a, b) => {
        const aValue = a.employee_number ? Number(a.employee_number) : Number.POSITIVE_INFINITY;
        const bValue = b.employee_number ? Number(b.employee_number) : Number.POSITIVE_INFINITY;

        if (aValue === bValue) {
          const aId = Number(a.id);
          const bId = Number(b.id);
          return displayOrderSort === "asc" ? aId - bId : bId - aId;
        }

        return displayOrderSort === "asc" ? aValue - bValue : bValue - aValue;
      });
    }

    setFilteredStaff(filtered);
  }, [searchQuery, staff, branchFilter, statusFilter, displayOrderSort]);

  // Calculate age from birth date
  function calculateAge(birthDate: string): number | null {
    if (!birthDate) return null;
    const birth = new Date(birthDate);
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    return age;
  }

  // Update age when birth date changes
  useEffect(() => {
    if (form.birth) {
      const age = calculateAge(form.birth);
      setForm((prev) => ({ ...prev, agey: age }));
    }
  }, [form.birth]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.fname.trim() || !form.lname.trim()) {
      setError("กรุณากรอกชื่อและนามสกุล");
      return;
    }

    try {
      setSubmitting(true);
      setError(null);

      const payload = {
        prename: form.prename,
        fname: form.fname,
        lname: form.lname,
        nickname: form.nickname || null,
        sex: form.sex,
        birth: form.birth || null,
        agey: form.agey,
        position: form.position,
        branch_id: form.branch_id,
        tel: form.tel || null,
        num_star: form.num_star,
        is_active: form.is_active,
        image: form.image || null,
        employee_number: form.employee_number || null,
      };

      if (form.id) {
        // Update
        const res = await fetch(`/api/admin/staff/${form.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || "แก้ไขข้อมูลพนักงานไม่สำเร็จ");
        }
      } else {
        // Create
        const res = await fetch("/api/admin/staff", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || "บันทึกข้อมูลพนักงานไม่สำเร็จ");
        }
      }

      setShowModal(false);
      setForm({
        prename: "นาย",
        fname: "",
        lname: "",
        nickname: "",
        sex: "ชาย",
        birth: "",
        agey: null,
        position: null,
        branch_id: null,
        tel: "",
        num_star: null,
        is_active: "yes",
        image: "",
        employee_number: "",
      });
      setImagePreview(null);
      await loadStaff();
    } catch (err: any) {
      setError(err.message ?? "บันทึกข้อมูลพนักงานไม่สำเร็จ");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("คุณแน่ใจหรือไม่ว่าต้องการลบพนักงานนี้?")) {
      return;
    }

    try {
      setError(null);
      const res = await fetch(`/api/admin/staff/${id}`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        const errorMessage = data.error || data.details || "ลบข้อมูลพนักงานไม่สำเร็จ";
        console.error("Delete error:", errorMessage, data);
        throw new Error(errorMessage);
      }
      
      // Reload staff list after successful delete
      await loadStaff();
      
      // Show success message (optional)
    } catch (err: any) {
      console.error("Error deleting employee:", err);
      const errorMessage = err.message ?? "ลบข้อมูลพนักงานไม่สำเร็จ";
      setError(errorMessage);
      alert(errorMessage);
    }
  }

  function handleEdit(staffMember: StaffRow) {
    setForm({
      id: staffMember.id,
      prename: staffMember.prename || "นาย",
      fname: staffMember.fname || "",
      lname: staffMember.lname || "",
      nickname: staffMember.nickname || "",
      sex: staffMember.sex || "ชาย",
      birth: staffMember.birth || "",
      agey: staffMember.agey,
      position: staffMember.position,
      branch_id: staffMember.branch_id,
      tel: staffMember.tel || "",
      num_star: staffMember.num_star,
      is_active: staffMember.is_active || "yes",
      image: staffMember.image || "",
      employee_number: staffMember.employee_number || "",
    });
    setImagePreview(staffMember.image || null);
    setError(null);
    setShowModal(true);
  }

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    try {
      const file = e.target.files?.[0];
      if (!file) {
        return;
      }

      if (!file.type.startsWith("image/")) {
        setError("กรุณาเลือกไฟล์รูปภาพเท่านั้น");
        return;
      }

      if (file.size > 5 * 1024 * 1024) {
        setError("ขนาดไฟล์ต้องไม่เกิน 5MB");
        return;
      }

      setUploading(true);
      setError(null);

      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/admin/upload", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ error: "Unknown error" }));
        console.error("Upload error response:", errorData);
        throw new Error(errorData.error || errorData.message || "อัปโหลดรูปภาพไม่สำเร็จ");
      }

      const data = await res.json();

      setForm((prev) => ({ ...prev, image: data.url }));
      setImagePreview(data.url);
    } catch (err: any) {
      console.error("Image upload error:", err);
      setError(err.message ?? "อัปโหลดรูปภาพไม่สำเร็จ");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex-1">
          <h1 className="text-xl font-bold tracking-tight">
            พนักงาน
          </h1>
          <p className="text-sm text-stone-500">
            ใช้เพิ่ม/แก้ไข/ลบข้อมูลพนักงาน เช่น ชื่อ บทบาท รูปภาพ และความถนัด
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            setForm({
              prename: "นาย",
              fname: "",
              lname: "",
              nickname: "",
              sex: "ชาย",
              birth: "",
              agey: null,
              position: null,
              branch_id: null,
              tel: "",
              num_star: null,
              is_active: "yes",
              image: "",
              employee_number: "",
            });
            setImagePreview(null);
            setError(null);
            setShowModal(true);
          }}
          className="inline-flex items-center gap-1.5 rounded-lg bg-stone-900 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-stone-800 focus:outline-none focus:ring-2 focus:ring-stone-500 focus:ring-offset-2"
        >
          <span>+</span>
          <span>เพิ่ม</span>
        </button>
      </div>

      {/* Search bar and filters */}
      <div className="rounded-lg border border-stone-200 bg-white p-3 shadow-sm">
        <div className="flex flex-wrap items-center gap-3 mb-3">
          <div className="flex items-center gap-2 flex-1 min-w-[200px]">
            <label className="text-xs font-medium text-stone-700 whitespace-nowrap">เลือกสาขา:</label>
            <select
              value={branchFilter}
              onChange={(e) => setBranchFilter(e.target.value)}
              className="flex-1 rounded-lg border border-stone-300 px-3 py-1.5 text-sm focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-200"
            >
              <option value="">-- ทั้งหมด --</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-2 min-w-[220px]">
            <label className="text-xs font-medium text-stone-700 whitespace-nowrap">สถานะ:</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="flex-1 rounded-lg border border-stone-300 px-3 py-1.5 text-sm focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-200"
            >
              <option value="">-- ทั้งหมด --</option>
              <option value="yes">ใช้งาน</option>
              <option value="no">ไม่ใช้งาน</option>
            </select>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Icon
            icon="solar:magnifer-linear"
            className="h-4 w-4 text-stone-400"
          />
          <input
            type="text"
            placeholder="ค้นหาพนักงาน (ชื่อ, ตำแหน่ง, สาขา, เบอร์โทร)..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1 bg-transparent text-sm text-stone-800 placeholder:text-stone-400 focus:outline-none"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="rounded-full p-1 text-stone-400 hover:bg-stone-100"
            >
              <Icon icon="solar:close-circle-linear" className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {/* ตารางพนักงาน */}
      <div className="overflow-hidden rounded-lg border border-stone-200 bg-white shadow-sm">
        {loading ? (
          <div className="p-8 text-center text-sm text-stone-500">
            กำลังโหลดข้อมูล...
          </div>
        ) : filteredStaff.length === 0 ? (
          <div className="p-8 text-center text-sm text-stone-500">
            {searchQuery
              ? "ไม่พบข้อมูลที่ค้นหา"
              : "ยังไม่มีข้อมูลพนักงาน ลองกดปุ่ม \"เพิ่ม\" ด้านบนขวา"}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full border-collapse text-xs">
              <thead>
                <tr className="border-b border-stone-200 bg-stone-50 text-[11px] font-medium uppercase text-stone-600">
                  <th className="px-4 py-3 text-center w-12">ลำดับ</th>
                  <th className="px-4 py-3 text-left">
                    <button
                      type="button"
                      onClick={() =>
                        setDisplayOrderSort((prev) =>
                          prev === null ? "asc" : prev === "asc" ? "desc" : null,
                        )
                      }
                      className="inline-flex items-center gap-1 rounded-md px-1 py-0.5 text-left font-medium text-stone-600 hover:bg-stone-100 hover:text-stone-900"
                    >
                      <span>ลำดับการแสดง</span>
                      <Icon
                        icon={
                          displayOrderSort === null
                            ? "solar:sort-linear"
                            : displayOrderSort === "asc"
                              ? "solar:sort-vertical-linear"
                              : "solar:sort-vertical-linear"
                        }
                        className={`h-3.5 w-3.5 ${displayOrderSort ? "text-primary-600" : "text-stone-400"}`}
                      />
                    </button>
                  </th>
                  <th className="px-4 py-3 text-left">ชื่อ</th>
                  <th className="px-4 py-3 text-left">เพศ</th>
                  <th className="px-4 py-3 text-left">อายุ</th>
                  <th className="px-4 py-3 text-left">ตำแหน่ง</th>
                  <th className="px-4 py-3 text-left">สาขา</th>
                  <th className="px-4 py-3 text-left">เบอร์โทร</th>
                  <th className="px-4 py-3 text-left">สถานะ</th>
                  <th className="px-4 py-3 text-right">จัดการ</th>
                </tr>
              </thead>
              <tbody>
                {filteredStaff.map((s, index) => (
                  <tr
                    key={s.id}
                    className="border-b border-stone-100 transition-colors hover:bg-stone-50/50"
                  >
                    <td className="px-4 py-3 text-center text-sm text-stone-600 font-medium">
                      {index + 1}
                    </td>
                    <td className="px-4 py-3 text-sm text-stone-700 font-mono">
                      {s.employee_number || '-'}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        {s.image ? (
                          <img
                            src={s.image.startsWith('/') ? s.image : `/images/${s.image}`}
                            alt={`${s.prename}${s.fname} ${s.lname}`}
                            className="h-10 w-10 rounded-full object-cover"
                            onClick={() => {
                              setSelectedImage({
                                url: s.image!.startsWith('/') ? s.image! : `/images/${s.image}`,
                                name: `${s.prename}${s.fname} ${s.lname}`,
                              });
                              setShowImageModal(true);
                            }}
                            style={{ cursor: 'pointer' }}
                          />
                        ) : (
                          <div className="h-10 w-10 rounded-full bg-stone-200 flex items-center justify-center text-stone-500 text-xs">
                            {s.prename?.[0] || s.fname?.[0] || '?'}
                          </div>
                        )}
                        <div className="flex flex-col">
                          <span className="text-sm font-medium text-stone-900">
                            {s.prename}{s.fname} {s.lname}
                          </span>
                          {s.nickname ? (
                            <span className="text-xs text-stone-500">
                              ({s.nickname})
                            </span>
                          ) : null}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-stone-700">
                      {s.sex || '-'}
                    </td>
                    <td className="px-4 py-3 text-sm text-stone-700">
                      {s.agey ? `${s.agey} ปี` : '-'}
                    </td>
                    <td className="px-4 py-3 text-sm text-stone-700">
                      {s.position_name || '-'}
                    </td>
                    <td className="px-4 py-3 text-sm text-stone-700">
                      {s.branch_name || '-'}
                    </td>
                    <td className="px-4 py-3 text-sm text-stone-700 font-mono">
                      {s.tel || '-'}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${
                        s.is_active === 'yes' 
                          ? 'bg-emerald-100 text-emerald-700' 
                          : 'bg-stone-100 text-stone-700'
                      }`}>
                        {s.is_active === 'yes' ? 'ใช้งาน' : 'ไม่ใช้งาน'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => handleEdit(s)}
                          className="rounded-md px-2 py-1 text-xs text-primary-600 hover:bg-primary-50"
                          title="แก้ไข"
                        >
                          <Icon icon="solar:pen-linear" className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(s.id)}
                          className="rounded-md px-2 py-1 text-xs text-rose-600 hover:bg-rose-50"
                          title="ลบ"
                        >
                          <Icon
                            icon="solar:trash-bin-trash-linear"
                            className="h-4 w-4"
                          />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal เพิ่ม/แก้ไขพนักงาน */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 px-4 backdrop-blur-sm overflow-y-auto py-8">
          <div className="w-full max-w-4xl lg:max-w-5xl xl:max-w-6xl max-h-[90vh] rounded-xl border border-stone-200 bg-white shadow-xl my-auto flex flex-col">
            <div className="flex-shrink-0 p-5 border-b border-stone-200">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-base font-semibold text-stone-900">
                    {form.id ? "แก้ไขข้อมูลพนักงาน" : "เพิ่มพนักงานใหม่"}
                  </h2>
                  <p className="mt-1 text-xs text-stone-500">
                    กรอกข้อมูลพนักงานตามตาราง employee
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                  }}
                  className="rounded-full p-1.5 text-stone-400 hover:bg-stone-100"
                >
                  <Icon icon="solar:close-circle-bold" className="h-5 w-5" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-5">
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="block text-xs font-medium text-stone-700">
                      คำนำหน้าชื่อ <span className="text-rose-500">*</span>
                    </label>
                    <select
                      required
                      className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-200"
                      value={form.prename}
                      onChange={(e) =>
                        setForm((prev) => ({ ...prev, prename: e.target.value }))
                      }
                    >
                      <option value="นาย">นาย</option>
                      <option value="นาง">นาง</option>
                      <option value="นางสาว">นางสาว</option>
                      <option value="เด็กชาย">เด็กชาย</option>
                      <option value="เด็กหญิง">เด็กหญิง</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-xs font-medium text-stone-700">
                      เพศ
                    </label>
                    <select
                      className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-200"
                      value={form.sex}
                      onChange={(e) =>
                        setForm((prev) => ({ ...prev, sex: e.target.value }))
                      }
                    >
                      <option value="ชาย">ชาย</option>
                      <option value="หญิง">หญิง</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="block text-xs font-medium text-stone-700">
                      ชื่อ <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-200"
                      value={form.fname}
                      onChange={(e) =>
                        setForm((prev) => ({ ...prev, fname: e.target.value }))
                      }
                      placeholder="ชื่อ"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-xs font-medium text-stone-700">
                      นามสกุล <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-200"
                      value={form.lname}
                      onChange={(e) =>
                        setForm((prev) => ({ ...prev, lname: e.target.value }))
                      }
                      placeholder="นามสกุล"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-medium text-stone-700">
                    ชื่อเล่น
                  </label>
                  <input
                    type="text"
                    className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-200"
                    value={form.nickname || ''}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, nickname: e.target.value }))
                    }
                    placeholder="ชื่อเล่น"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="block text-xs font-medium text-stone-700">
                      วันเกิด
                    </label>
                    <input
                      type="date"
                      className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-200"
                      value={form.birth}
                      onChange={(e) =>
                        setForm((prev) => ({ ...prev, birth: e.target.value }))
                      }
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-xs font-medium text-stone-700">
                      อายุ (ปี)
                    </label>
                    <input
                      type="number"
                      min="0"
                      className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-200"
                      value={form.agey || ''}
                      onChange={(e) =>
                        setForm((prev) => ({ ...prev, agey: e.target.value ? parseInt(e.target.value) : null }))
                      }
                      placeholder="0"
                      readOnly
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="block text-xs font-medium text-stone-700">
                      ตำแหน่ง <span className="text-rose-500">*</span>
                    </label>
                    <select
                      required
                      className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-200"
                      value={form.position || ''}
                      onChange={(e) =>
                        setForm((prev) => ({ ...prev, position: e.target.value ? parseInt(e.target.value) : null }))
                      }
                    >
                      <option value="">-- เลือกตำแหน่ง --</option>
                      {positions.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.position}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-xs font-medium text-stone-700">
                      ลำดับการแสดง
                    </label>
                    <input
                      type="text"
                      className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-200 font-mono"
                      value={form.employee_number}
                      onChange={(e) =>
                        setForm((prev) => ({ ...prev, employee_number: e.target.value }))
                      }
                      placeholder="เช่น 001, 002"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-xs font-medium text-stone-700">
                      สาขา <span className="text-rose-500">*</span>
                    </label>
                    <select
                      required
                      className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-200"
                      value={form.branch_id || ''}
                      onChange={(e) =>
                        setForm((prev) => ({ ...prev, branch_id: e.target.value ? parseInt(e.target.value) : null }))
                      }
                    >
                      <option value="">-- เลือกสาขา --</option>
                      {branches.map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-medium text-stone-700">
                    เบอร์โทร {form.id ? null : <span className="text-rose-500">*</span>}
                  </label>
                  <input
                    type="tel"
                    required={!form.id}
                    className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-200"
                    value={form.tel}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, tel: e.target.value }))
                    }
                    placeholder="0812345678"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-medium text-stone-700">
                    รูปภาพ
                  </label>
                  <div className="space-y-3">
                    {imagePreview ? (
                      <div className="relative group">
                        <div className="relative overflow-hidden rounded-lg border-2 border-stone-200 bg-stone-50">
                          <img
                            src={imagePreview.startsWith('/') ? imagePreview : `/images/${imagePreview}`}
                            alt="Preview"
                            className="h-64 w-full object-cover cursor-pointer transition-transform group-hover:scale-105"
                            onClick={() => {
                              setSelectedImage({
                                url: imagePreview.startsWith('/') ? imagePreview : `/images/${imagePreview}`,
                                name: `${form.prename}${form.fname} ${form.lname}`,
                              });
                              setShowImageModal(true);
                            }}
                          />
                          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                            <span className="text-white opacity-0 group-hover:opacity-100 text-xs font-medium">คลิกเพื่อดูรูปเต็ม</span>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setForm((prev) => ({ ...prev, image: "" }));
                            setImagePreview(null);
                          }}
                          className="absolute top-2 right-2 rounded-full bg-red-500 p-2 text-white hover:bg-red-600 shadow-lg transition-colors"
                        >
                          <Icon icon="solar:trash-bin-trash-linear" className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            const input = document.getElementById('staff-image-replace') as HTMLInputElement;
                            input?.click();
                          }}
                          className="absolute bottom-2 right-2 rounded-full bg-stone-700/90 p-2 text-white hover:bg-stone-800 shadow-lg transition-colors"
                        >
                          <Icon icon="solar:refresh-bold" className="h-4 w-4" />
                        </button>
                        <input
                          type="file"
                          accept="image/jpeg,image/jpg,image/png,image/webp"
                          onChange={handleImageUpload}
                          disabled={uploading}
                          className="hidden"
                          id="staff-image-replace"
                        />
                      </div>
                    ) : (
                      <div
                        className={`relative rounded-lg border-2 border-dashed transition-all duration-200 ${
                          isDragging
                            ? "border-primary-400 bg-primary-50 scale-[1.02]"
                            : "border-stone-300 bg-stone-50 hover:border-stone-400 hover:bg-stone-100"
                        }`}
                        onDragOver={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setIsDragging(true);
                        }}
                        onDragLeave={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setIsDragging(false);
                        }}
                        onDrop={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setIsDragging(false);
                          const file = e.dataTransfer.files[0];
                          if (file && file.type.startsWith("image/")) {
                            const dataTransfer = new DataTransfer();
                            dataTransfer.items.add(file);
                            const fakeInput = document.createElement("input");
                            fakeInput.type = "file";
                            fakeInput.files = dataTransfer.files;
                            const fakeEvent = {
                              target: fakeInput,
                            } as React.ChangeEvent<HTMLInputElement>;
                            handleImageUpload(fakeEvent);
                          }
                        }}
                      >
                        <input
                          type="file"
                          accept="image/jpeg,image/jpg,image/png,image/webp"
                          onChange={handleImageUpload}
                          disabled={uploading}
                          className="absolute inset-0 w-full h-full cursor-pointer opacity-0"
                          id="staff-image-upload"
                        />
                        <label
                          htmlFor="staff-image-upload"
                          className="flex min-h-[160px] cursor-pointer flex-col items-center justify-center gap-3 px-4 py-8"
                        >
                          {uploading ? (
                            <>
                              <div className="h-10 w-10 animate-spin rounded-full border-2 border-stone-300 border-t-primary-600" />
                              <span className="text-sm font-medium text-stone-600">
                                กำลังอัปโหลด...
                              </span>
                            </>
                          ) : (
                            <>
                              <div className="rounded-full bg-primary-100 p-4">
                                <Icon icon="solar:gallery-add-bold" className="h-8 w-8 text-primary-600" />
                              </div>
                              <div className="text-center">
                                <p className="text-sm font-semibold text-stone-700">
                                  <span className="text-primary-600">คลิกเพื่อเลือกรูปภาพ</span> หรือลากวางที่นี่
                                </p>
                                <p className="mt-1 text-xs text-stone-500">
                                  PNG, JPG, WEBP (สูงสุด 5MB)
                                </p>
                              </div>
                            </>
                          )}
                        </label>
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-medium text-stone-700">
                    สถานะ
                  </label>
                  <select
                    className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-200"
                    value={form.is_active}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, is_active: e.target.value }))
                    }
                  >
                    <option value="yes">ใช้งาน</option>
                    <option value="no">ไม่ใช้งาน</option>
                  </select>
                </div>

                {error && (
                  <div className="rounded-lg bg-rose-50 p-2 text-xs text-rose-600">
                    {error}
                  </div>
                )}

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setShowModal(false);
                    }}
                    className="rounded-md px-3 py-1.5 text-xs font-medium text-stone-600 transition-colors hover:bg-stone-100 focus:outline-none focus:ring-2 focus:ring-stone-300 focus:ring-offset-2"
                  >
                    ยกเลิก
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="inline-flex items-center gap-1.5 rounded-md bg-stone-900 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-stone-800 focus:outline-none focus:ring-2 focus:ring-stone-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <Icon
                      icon={submitting ? "solar:hourglass-line-bold" : "solar:check-circle-bold"}
                      className="h-4 w-4"
                    />
                    {submitting
                      ? "กำลังบันทึก..."
                      : form.id
                        ? "บันทึกการแก้ไข"
                        : "บันทึกพนักงาน"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Image Modal */}
      {showImageModal && selectedImage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
          onClick={() => setShowImageModal(false)}
        >
          <div className="relative max-w-4xl lg:max-w-5xl xl:max-w-6xl max-h-[90vh]">
            <img
              src={selectedImage.url}
              alt={selectedImage.name}
              className="max-h-[90vh] rounded-lg object-contain"
            />
            <button
              type="button"
              onClick={() => setShowImageModal(false)}
              className="absolute top-4 right-4 rounded-full bg-white/90 p-2 text-stone-800 hover:bg-white"
            >
              <Icon icon="solar:close-circle-bold" className="h-6 w-6" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

