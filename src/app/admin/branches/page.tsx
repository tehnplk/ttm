'use client';

import { useEffect, useState } from "react";
import { Icon } from "@iconify/react";
import dynamic from "next/dynamic";

// Dynamically import MapPicker to avoid SSR issues
const MapPicker = dynamic(() => import("@/components/MapPicker").then(mod => ({ default: mod.MapPicker })), {
    ssr: false,
    loading: () => (
        <div className="h-[400px] w-full rounded-lg border border-stone-300 bg-stone-100 flex items-center justify-center">
            <div className="text-sm text-stone-500">กำลังโหลดแผนที่...</div>
        </div>
    ),
});

type BranchRow = {
    id: string;
    code: string;
    name: string;
    location: string;
    latitude: number | null;
    longitude: number | null;
    image: string;
    availableServices: string;
    is_active: string | null;
};

type BranchFormState = {
    id?: string;
    code: string;
    name: string;
    location: string;
    latitude: number | null;
    longitude: number | null;
    image: string;
    availableServices: string;
    is_active: string;
};

export default function AdminBranchesPage() {
    const [branches, setBranches] = useState<BranchRow[]>([]);
    const [filteredBranches, setFilteredBranches] = useState<BranchRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [showModal, setShowModal] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const [isDragging, setIsDragging] = useState(false);
    const [showImageModal, setShowImageModal] = useState(false);
    const [selectedImage, setSelectedImage] = useState<{ url: string; name: string } | null>(null);
    const [form, setForm] = useState<BranchFormState>({
        code: "",
        name: "",
        location: "",
        latitude: null,
        longitude: null,
        image: "",
        availableServices: "",
        is_active: "yes",
    });

    async function loadBranches() {
        try {
            setLoading(true);
            const res = await fetch("/api/admin/branches");
            const data = await res.json();
            if (!res.ok) {
                throw new Error(data.error || "โหลดข้อมูลสาขาไม่สำเร็จ");
            }
            setBranches(data.branches ?? []);
            setFilteredBranches(data.branches ?? []);
            setError(null);
        } catch (err: any) {
            setError(err.message ?? "โหลดข้อมูลสาขาไม่สำเร็จ");
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        void loadBranches();
    }, []);

    // Filter branches based on search query
    useEffect(() => {
        if (!searchQuery.trim()) {
            setFilteredBranches(branches);
            return;
        }

        const query = searchQuery.toLowerCase();
        const filtered = branches.filter(
            (b) =>
                b.code.toLowerCase().includes(query) ||
                b.name.toLowerCase().includes(query) ||
                b.location.toLowerCase().includes(query) ||
                b.availableServices.toLowerCase().includes(query),
        );
        setFilteredBranches(filtered);
    }, [searchQuery, branches]);

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (!form.code.trim() || !form.name.trim() || !form.location.trim()) {
            setError("กรุณากรอกรหัสสาขา ชื่อและที่อยู่สาขา");
            return;
        }

        try {
            setSubmitting(true);
            setError(null);

            if (form.id) {
                // Update
                const res = await fetch(`/api/admin/branches/${form.id}`, {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        code: form.code,
                        name: form.name,
                        location: form.location,
                        latitude: form.latitude,
                        longitude: form.longitude,
                        image: form.image,
                        availableServices: form.availableServices,
                        is_active: form.is_active,
                    }),
                });
                const data = await res.json();
                if (!res.ok) {
                    throw new Error(data.error || "แก้ไขข้อมูลสาขาไม่สำเร็จ");
                }
            } else {
                // Create
                const res = await fetch("/api/admin/branches", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        code: form.code,
                        name: form.name,
                        location: form.location,
                        latitude: form.latitude,
                        longitude: form.longitude,
                        image: form.image,
                        availableServices: form.availableServices,
                        is_active: form.is_active,
                    }),
                });
                const data = await res.json();
                if (!res.ok) {
                    throw new Error(data.error || "บันทึกข้อมูลสาขาไม่สำเร็จ");
                }
            }

            setShowModal(false);
            setForm({
                code: "",
                name: "",
                location: "",
                latitude: null,
                longitude: null,
                image: "",
                availableServices: "",
                is_active: "yes",
            });
            setImagePreview(null);
            await loadBranches();
        } catch (err: any) {
            setError(err.message ?? "บันทึกข้อมูลสาขาไม่สำเร็จ");
        } finally {
            setSubmitting(false);
        }
    }

    async function handleDelete(id: string) {
        if (!confirm("คุณแน่ใจหรือไม่ว่าต้องการลบสาขานี้?")) {
            return;
        }

        try {
            const res = await fetch(`/api/admin/branches/${id}`, {
                method: "DELETE",
            });
            const data = await res.json();
            if (!res.ok) {
                throw new Error(data.error || "ลบข้อมูลสาขาไม่สำเร็จ");
            }
            await loadBranches();
        } catch (err: any) {
            alert(err.message ?? "ลบข้อมูลสาขาไม่สำเร็จ");
        }
    }

    async function handleToggleActive(id: string, currentStatus: string | null) {
        try {
            const newStatus = currentStatus === "yes" ? "no" : "yes";
            const res = await fetch(`/api/admin/branches/${id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    is_active: newStatus,
                }),
            });
            const data = await res.json();
            if (!res.ok) {
                throw new Error(data.error || "เปลี่ยนสถานะสาขาไม่สำเร็จ");
            }
            await loadBranches();
        } catch (err: any) {
            alert(err.message ?? "เปลี่ยนสถานะสาขาไม่สำเร็จ");
        }
    }

    function handleEdit(branch: BranchRow) {
        setForm({
            id: branch.id,
            code: branch.code,
            name: branch.name,
            location: branch.location,
            latitude: branch.latitude,
            longitude: branch.longitude,
            image: branch.image,
            availableServices: branch.availableServices,
            is_active: branch.is_active || "yes",
        });
        setImagePreview(branch.image || null);
        setError(null);
        setShowModal(true);
    }

    async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
        try {
            const file = e.target.files?.[0];
            if (!file) {
                return;
            }

            // ตรวจสอบประเภทไฟล์
            if (!file.type.startsWith("image/")) {
                setError("กรุณาเลือกไฟล์รูปภาพเท่านั้น");
                return;
            }

            // ตรวจสอบขนาดไฟล์ (max 5MB)
            if (file.size > 5 * 1024 * 1024) {
                setError("ขนาดไฟล์ต้องไม่เกิน 5MB");
                return;
            }

            setUploading(true);
            setError(null);

            // สร้าง FormData
            const formData = new FormData();
            formData.append("file", file);

            // Upload ไปยัง API
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

            // อัปเดต form และ preview
            setForm((prev) => ({ ...prev, image: data.url }));
            setImagePreview(data.url);
        } catch (err: any) {
            console.error("Image upload error:", err);
            setError(err.message ?? "อัปโหลดรูปภาพไม่สำเร็จ");
        } finally {
            setUploading(false);
        }
    }

    function generateNextCode(): string {
        // หารหัสสาขาที่มีอยู่แล้วทั้งหมด
        const existingCodes = branches
            .map((b) => b.code)
            .filter((code) => code && code.trim() !== "") // กรอง code ที่เป็น null หรือ empty
            .filter((code) => /^\d+$/.test(code)) // เฉพาะรหัสที่เป็นตัวเลข
            .map((code) => parseInt(code, 10))
            .filter((num) => !isNaN(num));

        // หาเลขที่สูงที่สุด
        const maxCode = existingCodes.length > 0 ? Math.max(...existingCodes) : 0;

        // สร้างรหัสถัดไป (3 หลัก)
        let nextCode = maxCode + 1;
        let codeString = nextCode.toString().padStart(3, "0");

        // ตรวจสอบว่ามีรหัสซ้ำหรือไม่ ถ้าซ้ำให้เพิ่มต่อไป
        while (branches.some((b) => b.code === codeString)) {
            nextCode++;
            codeString = nextCode.toString().padStart(3, "0");
        }

        return codeString;
    }

    function handleAdd() {
        const nextCode = generateNextCode();
        setForm({
            code: nextCode,
            name: "",
            location: "",
            latitude: null,
            longitude: null,
            image: "",
            availableServices: "",
            is_active: "yes",
        });
        setImagePreview(null);
        setError(null);
        setShowModal(true);
    }

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between gap-3">
                <div>
                    <h1 className="mb-1 text-xl font-bold tracking-tight">
                        จัดการสาขา
                    </h1>
                    <p className="text-sm text-stone-500">
                        ใช้เพิ่ม/แก้ไขข้อมูลสาขา เช่น ชื่อ ที่อยู่ รูปภาพ และบริการที่ให้บริการ
                    </p>
                </div>
                <button
                    type="button"
                    onClick={handleAdd}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-stone-900 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-stone-800 focus:outline-none focus:ring-2 focus:ring-stone-500 focus:ring-offset-2"
                >
                    <span>+</span>
                    <span>เพิ่ม</span>
                </button>
            </div>

            {/* Search bar */}
            <div className="rounded-lg border border-stone-200 bg-white p-3 shadow-sm">
                <div className="flex items-center gap-2">
                    <Icon
                        icon="solar:magnifer-linear"
                        className="h-4 w-4 text-stone-400"
                    />
                    <input
                        type="text"
                        placeholder="ค้นหาสาขา (รหัส, ชื่อ, ที่อยู่, บริการ)..."
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

            {/* ตารางสาขา */}
            <div className="overflow-hidden rounded-lg border border-stone-200 bg-white shadow-sm">
                {loading ? (
                    <div className="p-8 text-center text-sm text-stone-500">
                        กำลังโหลดข้อมูล...
                    </div>
                ) : filteredBranches.length === 0 ? (
                    <div className="p-8 text-center text-sm text-stone-500">
                        {searchQuery
                            ? "ไม่พบข้อมูลที่ค้นหา"
                            : "ยังไม่มีข้อมูลสาขา ลองกดปุ่ม \"เพิ่ม\" ด้านบนขวา"}
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="min-w-full border-collapse text-xs">
                            <thead>
                                <tr className="border-b border-stone-200 bg-stone-50 text-[11px] font-medium uppercase text-stone-600">
                                    <th className="px-4 py-3 text-left">รหัสสาขา</th>
                                    <th className="px-4 py-3 text-left">ชื่อสาขา</th>
                                    <th className="px-4 py-3 text-left">ที่อยู่</th>
                                    <th className="px-4 py-3 text-left">บริการ</th>
                                    <th className="px-4 py-3 text-center">สถานะ</th>
                                    <th className="px-4 py-3 text-right">จัดการ</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredBranches.map((b) => (
                                    <tr
                                        key={b.id}
                                        className="border-b border-stone-100 transition-colors hover:bg-stone-50/50"
                                    >
                                        <td className="px-4 py-3">
                                            <span className="text-sm font-semibold text-stone-900">
                                                {b.code}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-3">
                                                {b.image && b.image !== "/placeholder-branch.png" ? (
                                                    <img
                                                        src={b.image}
                                                        alt={b.name}
                                                        className="h-10 w-10 cursor-pointer rounded-lg object-cover border border-stone-200 transition-transform hover:scale-110"
                                                        onClick={() => {
                                                            setSelectedImage({ url: b.image, name: b.name });
                                                            setShowImageModal(true);
                                                        }}
                                                        onError={(e) => {
                                                            // ถ้ารูปภาพโหลดไม่ได้ ให้แสดง fallback
                                                            const target = e.target as HTMLImageElement;
                                                            target.style.display = "none";
                                                            const fallback = target.nextElementSibling as HTMLElement;
                                                            if (fallback) fallback.style.display = "flex";
                                                        }}
                                                    />
                                                ) : null}
                                                <div
                                                    className={`flex h-10 w-10 items-center justify-center rounded-lg bg-primary-100 text-xs font-semibold text-primary-700 ${b.image && b.image !== "/placeholder-branch.png" ? "hidden" : ""
                                                        }`}
                                                >
                                                    {b.name.charAt(0)}
                                                </div>
                                                <div className="flex flex-col">
                                                    <span className="text-sm font-medium text-stone-900">
                                                        {b.name}
                                                    </span>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 text-sm text-stone-700">
                                            {b.location}
                                        </td>
                                        <td className="px-4 py-3 text-xs text-stone-600">
                                            {b.availableServices && b.availableServices !== "[]"
                                                ? b.availableServices
                                                : "-"}
                                        </td>
                                        <td className="px-4 py-3">
                                            <button
                                                type="button"
                                                onClick={() => handleToggleActive(b.id, b.is_active)}
                                                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 ${b.is_active === "yes"
                                                        ? "bg-emerald-500"
                                                        : "bg-stone-300"
                                                    }`}
                                                role="switch"
                                                aria-checked={b.is_active === "yes"}
                                            >
                                                <span
                                                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${b.is_active === "yes" ? "translate-x-6" : "translate-x-1"
                                                        }`}
                                                />
                                            </button>
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex items-center justify-end gap-1">
                                                <button
                                                    type="button"
                                                    onClick={() => handleEdit(b)}
                                                    className="rounded-md px-2 py-1 text-xs text-primary-600 hover:bg-primary-50"
                                                    title="แก้ไข"
                                                >
                                                    <Icon icon="solar:pen-linear" className="h-4 w-4 text-black" />
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => handleDelete(b.id)}
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

            {/* Modal เพิ่ม/แก้ไขสาขา */}
            {showModal && (
                <div className="fixed inset-0 z-50 overflow-y-auto bg-black/40 px-4 backdrop-blur-sm py-4">
                    <div className="flex min-h-full items-center justify-center">
                        <div className="w-full max-w-4xl lg:max-w-5xl xl:max-w-6xl rounded-xl border border-stone-200 bg-white shadow-xl my-8">
                            {/* Header */}
                            <div className="flex items-center justify-between p-5 border-b border-stone-200">
                                <div>
                                    <h2 className="text-base font-semibold text-stone-900">
                                        {form.id ? "แก้ไขข้อมูลสาขา" : "เพิ่มสาขาใหม่"}
                                    </h2>
                                    <p className="mt-1 text-xs text-stone-500">
                                        {form.id
                                            ? "กรอกข้อมูลขั้นต่ำคือรหัสสาขา ชื่อและที่อยู่สาขา ส่วนรูปภาพและบริการสามารถกรอกทีหลังได้"
                                            : "รหัสสาขาจะถูกสร้างอัตโนมัติ กรอกข้อมูลขั้นต่ำคือชื่อและที่อยู่สาขา ส่วนรูปภาพและบริการสามารถกรอกทีหลังได้"}
                                    </p>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setShowModal(false);
                                        setImagePreview(null);
                                    }}
                                    className="rounded-full p-1.5 text-stone-400 hover:bg-stone-100"
                                >
                                    <Icon icon="solar:close-circle-bold" className="h-5 w-5" />
                                </button>
                            </div>

                            {/* Form Content - No scroll */}
                            <div className="p-6">
                                <form onSubmit={handleSubmit} className="space-y-6" id="branch-form">
                                    {/* Row 1: รหัสสาขา และ ชื่อสาขา */}
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-1.5">
                                            <label className="block text-xs font-medium text-stone-700">
                                                รหัสสาขา <span className="text-rose-500">*</span>
                                            </label>
                                            <input
                                                type="text"
                                                required
                                                readOnly={!form.id}
                                                className={`w-full rounded-lg border border-stone-300 px-3 py-2 text-sm focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-200 ${!form.id ? "bg-stone-50 cursor-not-allowed" : ""
                                                    }`}
                                                value={form.code}
                                                onChange={(e) =>
                                                    setForm((prev) => ({ ...prev, code: e.target.value }))
                                                }
                                                placeholder="เช่น 001"
                                            />
                                            {!form.id && (
                                                <p className="text-[10px] text-stone-500">
                                                    รหัสสาขาถูกสร้างอัตโนมัติ
                                                </p>
                                            )}
                                        </div>

                                        <div className="space-y-1.5">
                                            <label className="block text-xs font-medium text-stone-700">
                                                ชื่อสาขา <span className="text-rose-500">*</span>
                                            </label>
                                            <input
                                                type="text"
                                                required
                                                className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-200"
                                                value={form.name}
                                                onChange={(e) =>
                                                    setForm((prev) => ({ ...prev, name: e.target.value }))
                                                }
                                                placeholder="เช่น สาขาเซ็นทรัลเวิลด์"
                                            />
                                        </div>
                                    </div>

                                    {/* Row 2: ที่อยู่สาขา (full width) */}
                                    <div className="space-y-1.5">
                                        <label className="block text-xs font-medium text-stone-700">
                                            ที่อยู่สาขา <span className="text-rose-500">*</span>
                                        </label>
                                        <textarea
                                            className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-200"
                                            rows={3}
                                            required
                                            value={form.location}
                                            onChange={(e) =>
                                                setForm((prev) => ({ ...prev, location: e.target.value }))
                                            }
                                            placeholder="เช่น 999/9 ถนนราชดำริ แขวงลุมพินี เขตปทุมวัน กรุงเทพมหานคร 10330"
                                        />
                                    </div>

                                    {/* Row 3: แผนที่ (full width) */}
                                    <div className="space-y-1.5">
                                        <label className="block text-xs font-medium text-stone-700">
                                            ตำแหน่งบนแผนที่ <span className="text-stone-400 text-[10px] font-normal">(คลิกเพื่อปักหมุด หรือลากหมุดเพื่อย้ายตำแหน่ง)</span>
                                        </label>
                                        <MapPicker
                                            latitude={form.latitude}
                                            longitude={form.longitude}
                                            onLocationChange={(lat, lng) => {
                                                setForm((prev) => ({
                                                    ...prev,
                                                    latitude: lat,
                                                    longitude: lng,
                                                }));
                                            }}
                                        />
                                        {(form.latitude && form.longitude) && (
                                            <p className="text-[10px] text-stone-500">
                                                ตำแหน่ง: {form.latitude.toFixed(6)}, {form.longitude.toFixed(6)}
                                            </p>
                                        )}
                                    </div>

                                    {/* Row 4: รูปภาพ และ บริการที่ให้บริการ */}
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-1.5">
                                            <label className="block text-xs font-medium text-stone-700">
                                                รูปภาพ
                                            </label>
                                            <div className="space-y-2">
                                                {!imagePreview ? (
                                                    <div
                                                        className={`relative rounded-lg border-2 border-dashed transition-colors ${isDragging
                                                            ? "border-primary-400 bg-primary-50"
                                                            : "border-stone-300 bg-stone-50 hover:border-stone-400"
                                                            }`}
                                                        onDragOver={(e) => {
                                                            e.preventDefault();
                                                            setIsDragging(true);
                                                        }}
                                                        onDragLeave={() => setIsDragging(false)}
                                                        onDrop={(e) => {
                                                            e.preventDefault();
                                                            setIsDragging(false);
                                                            const file = e.dataTransfer.files[0];
                                                            if (file && file.type.startsWith("image/")) {
                                                                // สร้าง FileList-like object
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
                                                            className="absolute inset-0 w-full cursor-pointer opacity-0"
                                                            id="branch-image-upload"
                                                        />
                                                        <label
                                                            htmlFor="branch-image-upload"
                                                            className="flex min-h-[120px] cursor-pointer flex-col items-center justify-center gap-2 px-4 py-6"
                                                        >
                                                            {uploading ? (
                                                                <>
                                                                    <div className="h-8 w-8 animate-spin rounded-full border-2 border-stone-300 border-t-stone-600" />
                                                                    <span className="text-xs text-stone-600">
                                                                        กำลังอัปโหลด...
                                                                    </span>
                                                                </>
                                                            ) : (
                                                                <>
                                                                    <Icon
                                                                        icon="solar:gallery-add-bold"
                                                                        className="h-10 w-10 text-stone-400"
                                                                    />
                                                                    <div className="text-center">
                                                                        <span className="text-xs font-medium text-stone-700">
                                                                            คลิกเพื่อเลือกรูปภาพ
                                                                        </span>
                                                                        <span className="block text-[10px] text-stone-500">
                                                                            หรือลากวางไฟล์ที่นี่
                                                                        </span>
                                                                        <span className="mt-1 block text-[10px] text-stone-400">
                                                                            รองรับ JPEG, PNG, WEBP (สูงสุด 5MB)
                                                                        </span>
                                                                    </div>
                                                                </>
                                                            )}
                                                        </label>
                                                    </div>
                                                ) : (
                                                    <div className="space-y-2">
                                                        <div className="relative w-full rounded-lg overflow-hidden border border-stone-200 bg-stone-50 flex items-center justify-center p-4 min-h-[200px]">
                                                            <img
                                                                src={imagePreview}
                                                                alt="Preview"
                                                                className="max-w-full max-h-[280px] w-auto h-auto object-contain rounded-md"
                                                            />
                                                            <button
                                                                type="button"
                                                                onClick={() => {
                                                                    setImagePreview(null);
                                                                    setForm((prev) => ({ ...prev, image: "" }));
                                                                }}
                                                                className="absolute top-3 right-3 rounded-full bg-stone-900/80 p-1.5 text-white transition-colors hover:bg-stone-900 z-10 shadow-md"
                                                                title="ลบรูปภาพ"
                                                            >
                                                                <Icon icon="solar:close-circle-bold" className="h-5 w-5" />
                                                            </button>
                                                        </div>
                                                        <label
                                                            htmlFor="branch-image-replace"
                                                            className="block w-full cursor-pointer rounded-lg border border-stone-300 bg-white px-3 py-2 text-center text-xs font-medium text-stone-700 transition-colors hover:bg-stone-50"
                                                        >
                                                            <input
                                                                type="file"
                                                                accept="image/jpeg,image/jpg,image/png,image/webp"
                                                                onChange={handleImageUpload}
                                                                disabled={uploading}
                                                                className="hidden"
                                                                id="branch-image-replace"
                                                            />
                                                            <span className="inline-flex items-center gap-1.5">
                                                                <Icon icon="solar:refresh-bold" className="h-4 w-4" />
                                                                เปลี่ยนรูปภาพ
                                                            </span>
                                                        </label>
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        <div className="space-y-1.5">
                                            <label className="block text-xs font-medium text-stone-700">
                                                บริการที่ให้บริการ (availableServices)
                                            </label>
                                            <textarea
                                                className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-200"
                                                rows={8}
                                                value={form.availableServices}
                                                onChange={(e) =>
                                                    setForm((prev) => ({ ...prev, availableServices: e.target.value }))
                                                }
                                                placeholder="เช่น นวดไทย, นวดน้ำมัน (หรือ JSON array)"
                                            />
                                        </div>
                                    </div>

                                    {/* Row 5: สถานะ (full width) */}
                                    <div className="space-y-1.5">
                                        <label className="block text-xs font-medium text-stone-700">
                                            สถานะสาขา
                                        </label>
                                        <div className="flex items-center gap-3">
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    setForm((prev) => ({
                                                        ...prev,
                                                        is_active: prev.is_active === "yes" ? "no" : "yes",
                                                    }))
                                                }
                                                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 ${form.is_active === "yes"
                                                        ? "bg-emerald-500"
                                                        : "bg-stone-300"
                                                    }`}
                                                role="switch"
                                                aria-checked={form.is_active === "yes"}
                                            >
                                                <span
                                                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${form.is_active === "yes" ? "translate-x-6" : "translate-x-1"
                                                        }`}
                                                />
                                            </button>
                                            <span className="text-sm text-stone-700">
                                                {form.is_active === "yes" ? "เปิดใช้งาน" : "ปิดใช้งาน"}
                                            </span>
                                        </div>
                                    </div>

                                    {error && (
                                        <div className="rounded-lg bg-rose-50 p-2 text-xs text-rose-600">
                                            {error}
                                        </div>
                                    )}
                                </form>
                            </div>

                            {/* Footer */}
                            <div className="flex items-center justify-end gap-2 p-5 border-t border-stone-200">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setShowModal(false);
                                        setImagePreview(null);
                                    }}
                                    className="rounded-md px-3 py-1.5 text-xs font-medium text-stone-600 transition-colors hover:bg-stone-100 focus:outline-none focus:ring-2 focus:ring-stone-300 focus:ring-offset-2"
                                >
                                    ยกเลิก
                                </button>
                                <button
                                    type="submit"
                                    form="branch-form"
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
                                            : "บันทึกสาขา"}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal แสดงรูปภาพขยาย */}
            {showImageModal && selectedImage && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 backdrop-blur-sm"
                    onClick={() => {
                        setShowImageModal(false);
                        setSelectedImage(null);
                    }}
                >
                    <div
                        className="relative max-h-[90vh] max-w-4xl lg:max-w-5xl xl:max-w-6xl"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <button
                            type="button"
                            onClick={() => {
                                setShowImageModal(false);
                                setSelectedImage(null);
                            }}
                            className="absolute -right-12 top-0 rounded-full bg-white/90 p-2 text-stone-700 transition-colors hover:bg-white"
                            title="ปิด"
                        >
                            <Icon icon="solar:close-circle-bold" className="h-6 w-6" />
                        </button>
                        <div className="rounded-lg bg-white p-4 shadow-2xl">
                            <h3 className="mb-2 text-sm font-semibold text-stone-900">
                                {selectedImage.name}
                            </h3>
                            <img
                                src={selectedImage.url}
                                alt={selectedImage.name}
                                className="max-h-[80vh] w-full rounded-lg object-contain"
                            />
                        </div>
                    </div>
                </div>
            )}


        </div>
    );
}
