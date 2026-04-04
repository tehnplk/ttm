'use client';

import { useEffect, useState } from "react";
import { Icon } from "@iconify/react";

type ServiceRow = {
  id: string;
  name: string;
  description: string;
  duration: number;
  price: number;
  image: string;
  enabled: string;
};

type ServiceFormState = {
  id?: string;
  name: string;
  description: string;
  duration: string;
  price: string;
  image: string;
  enabled: string;
};

export default function AdminServicesPage() {
  const [services, setServices] = useState<ServiceRow[]>([]);
  const [filteredServices, setFilteredServices] = useState<ServiceRow[]>([]);
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
  const [form, setForm] = useState<ServiceFormState>({
    name: "",
    description: "",
    duration: "60",
    price: "0",
    image: "",
    enabled: "yes",
  });

  async function loadServices() {
    try {
      setLoading(true);
      const res = await fetch("/api/admin/services");
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "โหลดข้อมูลบริการไม่สำเร็จ");
      }
      setServices(data.services ?? []);
      setFilteredServices(data.services ?? []);
      setError(null);
    } catch (err: any) {
      setError(err.message ?? "โหลดข้อมูลบริการไม่สำเร็จ");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadServices();
  }, []);

  // Filter services based on search query
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredServices(services);
      return;
    }

    const query = searchQuery.toLowerCase();
    const filtered = services.filter(
      (s) =>
        s.name.toLowerCase().includes(query) ||
        s.description.toLowerCase().includes(query) ||
        s.duration.toString().includes(query) ||
        s.price.toString().includes(query),
    );
    setFilteredServices(filtered);
  }, [searchQuery, services]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const durationNum = parseInt(form.duration, 10);
    const priceNum = parseFloat(form.price);

    if (!form.name.trim() || durationNum <= 0 || priceNum <= 0) {
      setError("กรุณากรอกชื่อบริการ ระยะเวลาและราคา");
      return;
    }

    try {
      setSubmitting(true);
      setError(null);

      if (form.id) {
        // Update
        const res = await fetch(`/api/admin/services/${form.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: form.name,
            description: form.description,
            duration: durationNum,
            price: priceNum,
            image: form.image,
            enabled: form.enabled,
          }),
        });
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || "แก้ไขข้อมูลบริการไม่สำเร็จ");
        }
      } else {
        // Create
        const res = await fetch("/api/admin/services", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: form.name,
            description: form.description,
            duration: durationNum,
            price: priceNum,
            image: form.image,
            enabled: form.enabled,
          }),
        });
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || "บันทึกข้อมูลบริการไม่สำเร็จ");
        }
      }

      setShowModal(false);
      setForm({
        name: "",
        description: "",
        duration: "60",
        price: "0",
        image: "",
        enabled: "yes",
      });
      setImagePreview(null);
      await loadServices();
    } catch (err: any) {
      setError(err.message ?? "บันทึกข้อมูลบริการไม่สำเร็จ");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("คุณแน่ใจหรือไม่ว่าต้องการลบบริการนี้?")) {
      return;
    }

    try {
      const res = await fetch(`/api/admin/services/${id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "ลบข้อมูลบริการไม่สำเร็จ");
      }
      await loadServices();
    } catch (err: any) {
      alert(err.message ?? "ลบข้อมูลบริการไม่สำเร็จ");
    }
  }

  function handleEdit(service: ServiceRow) {
    setForm({
      id: service.id,
      name: service.name,
      description: service.description,
      duration: service.duration.toString(),
      price: service.price.toString(),
      image: service.image,
      enabled: service.enabled || "yes",
    });
    setImagePreview(service.image || null);
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

  function handleAdd() {
    setForm({
      name: "",
      description: "",
      duration: "60",
      price: "0",
      image: "",
      enabled: "yes",
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
            จัดการบริการ
          </h1>
          <p className="text-sm text-stone-500">
            ใช้เพิ่ม/แก้ไขข้อมูลบริการ เช่น ชื่อ คำอธิบาย ระยะเวลา ราคา และรูปภาพ
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
            placeholder="ค้นหาบริการ (ชื่อ, คำอธิบาย, ระยะเวลา, ราคา)..."
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

      {/* ตารางบริการ */}
      <div className="overflow-hidden rounded-lg border border-stone-200 bg-white shadow-sm">
        {loading ? (
          <div className="p-8 text-center text-sm text-stone-500">
            กำลังโหลดข้อมูล...
          </div>
        ) : filteredServices.length === 0 ? (
          <div className="p-8 text-center text-sm text-stone-500">
            {searchQuery
              ? "ไม่พบข้อมูลที่ค้นหา"
              : "ยังไม่มีข้อมูลบริการ ลองกดปุ่ม \"เพิ่ม\" ด้านบนขวา"}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full border-collapse text-xs">
              <thead>
                <tr className="border-b border-stone-200 bg-stone-50 text-[11px] font-medium uppercase text-stone-600">
                  <th className="px-4 py-3 text-left">ชื่อบริการ</th>
                  <th className="px-4 py-3 text-left">คำอธิบาย</th>
                  <th className="px-4 py-3 text-left">ระยะเวลา</th>
                  <th className="px-4 py-3 text-left">ราคา</th>
                  <th className="px-4 py-3 text-right">จัดการ</th>
                </tr>
              </thead>
              <tbody>
                {filteredServices.map((s) => (
                  <tr
                    key={s.id}
                    className="border-b border-stone-100 transition-colors hover:bg-stone-50/50"
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        {s.image && s.image !== "/placeholder-service.png" ? (
                          <img
                            src={s.image}
                            alt={s.name}
                            className="h-10 w-10 cursor-pointer rounded-lg object-cover border border-stone-200 transition-transform hover:scale-110"
                            onClick={() => {
                              setSelectedImage({ url: s.image, name: s.name });
                              setShowImageModal(true);
                            }}
                            onError={(e) => {
                              const target = e.target as HTMLImageElement;
                              target.style.display = "none";
                              const fallback = target.nextElementSibling as HTMLElement;
                              if (fallback) fallback.style.display = "flex";
                            }}
                          />
                        ) : null}
                        <div
                          className={`flex h-10 w-10 items-center justify-center rounded-lg bg-primary-100 text-xs font-semibold text-primary-700 ${s.image && s.image !== "/placeholder-service.png" ? "hidden" : ""
                            }`}
                        >
                          {s.name.charAt(0)}
                        </div>
                        <div className="flex flex-col">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-stone-900">
                              {s.name}
                            </span>
                            {s.enabled === 'no' && (
                              <span className="rounded-full bg-stone-200 px-2 py-0.5 text-[10px] font-medium text-stone-600">
                                ปิดใช้งาน
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-stone-700">
                      {s.description || "-"}
                    </td>
                    <td className="px-4 py-3 text-sm text-stone-700">
                      {s.duration} นาที
                    </td>
                    <td className="px-4 py-3 text-sm font-medium text-stone-900">
                      {s.price.toLocaleString("th-TH")} บาท
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => handleEdit(s)}
                          className="rounded-md px-2 py-1 text-xs text-primary-600 hover:bg-primary-50"
                          title="แก้ไข"
                        >
                          <Icon icon="solar:pen-linear" className="h-4 w-4 text-black" />
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

      {/* Modal เพิ่ม/แก้ไขบริการ */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 backdrop-blur-sm">
          <div className="w-full max-w-md lg:max-w-lg xl:max-w-xl rounded-xl border border-stone-200 bg-white p-5 lg:p-6 xl:p-8 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-base font-semibold text-stone-900">
                  {form.id ? "แก้ไขข้อมูลบริการ" : "เพิ่มบริการใหม่"}
                </h2>
                <p className="mt-1 text-xs text-stone-500">
                  กรอกข้อมูลขั้นต่ำคือชื่อบริการ ระยะเวลาและราคา ส่วนรูปภาพและคำอธิบายสามารถกรอกทีหลังได้
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

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-medium text-stone-700">
                  ชื่อบริการ <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-200"
                  value={form.name}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, name: e.target.value }))
                  }
                  placeholder="เช่น นวดไทย 60 นาที"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-medium text-stone-700">
                  คำอธิบาย
                </label>
                <textarea
                  className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-200"
                  rows={3}
                  value={form.description}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, description: e.target.value }))
                  }
                  placeholder="เช่น นวดแผนไทยแบบดั้งเดิม..."
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="block text-xs font-medium text-stone-700">
                    ระยะเวลา (นาที) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-200"
                    value={form.duration}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, duration: e.target.value }))
                    }
                    placeholder="60"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="block text-xs font-medium text-stone-700">
                    ราคา (บาท) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    required
                    min="0"
                    step="0.01"
                    className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-200"
                    value={form.price}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, price: e.target.value }))
                    }
                    placeholder="500"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-medium text-stone-700">
                  สถานะการใช้งาน
                </label>
                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="enabled"
                      value="yes"
                      checked={form.enabled === 'yes'}
                      onChange={(e) => setForm({ ...form, enabled: e.target.value })}
                      className="h-4 w-4 text-primary-600 focus:ring-primary-500"
                    />
                    <span className="text-sm text-stone-700">เปิดใช้งาน</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="enabled"
                      value="no"
                      checked={form.enabled === 'no'}
                      onChange={(e) => setForm({ ...form, enabled: e.target.value })}
                      className="h-4 w-4 text-primary-600 focus:ring-primary-500"
                    />
                    <span className="text-sm text-stone-700">ปิดใช้งาน</span>
                  </label>
                </div>
              </div>

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
                        id="service-image-upload"
                      />
                      <label
                        htmlFor="service-image-upload"
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
                      <div className="relative w-full rounded-lg overflow-hidden border border-stone-200 bg-stone-50">
                        <img
                          src={imagePreview}
                          alt="Preview"
                          className="h-48 w-full object-cover"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            setImagePreview(null);
                            setForm((prev) => ({ ...prev, image: "" }));
                          }}
                          className="absolute top-2 right-2 rounded-full bg-stone-900/80 p-1.5 text-white transition-colors hover:bg-stone-900"
                          title="ลบรูปภาพ"
                        >
                          <Icon icon="solar:close-circle-bold" className="h-5 w-5" />
                        </button>
                      </div>
                      <label
                        htmlFor="service-image-replace"
                        className="block w-full cursor-pointer rounded-lg border border-stone-300 bg-white px-3 py-2 text-center text-xs font-medium text-stone-700 transition-colors hover:bg-stone-50"
                      >
                        <input
                          type="file"
                          accept="image/jpeg,image/jpg,image/png,image/webp"
                          onChange={handleImageUpload}
                          disabled={uploading}
                          className="hidden"
                          id="service-image-replace"
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
                    setImagePreview(null);
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
                      : "บันทึกบริการ"}
                </button>
              </div>
            </form>
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
