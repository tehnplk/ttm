'use client';

import { useEffect, useState } from 'react';
import { Icon } from '@iconify/react';

interface FAQ {
  id: number;
  question: string;
  answer: string;
  order: number;
  is_active: string | null;
}

export default function AdminFAQPage() {
  const [faqs, setFaqs] = useState<FAQ[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState({
    question: '',
    answer: '',
    order: 0,
  });

  useEffect(() => {
    loadFAQs();
  }, []);

  async function loadFAQs() {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/faq');
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'โหลดข้อมูล FAQ ไม่สำเร็จ');
      }
      setFaqs(data.faqs || []);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'โหลดข้อมูล FAQ ไม่สำเร็จ');
    } finally {
      setLoading(false);
    }
  }

  function handleEdit(faq: FAQ) {
    setEditingId(faq.id);
    setForm({
      question: faq.question,
      answer: faq.answer,
      order: faq.order,
    });
    setShowForm(true);
  }

  function handleCancel() {
    setShowForm(false);
    setEditingId(null);
    setForm({
      question: '',
      answer: '',
      order: 0,
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      if (editingId) {
        // Update
        const res = await fetch(`/api/admin/faq/${editingId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(form),
        });
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || 'อัปเดต FAQ ไม่สำเร็จ');
        }
      } else {
        // Create
        const res = await fetch('/api/admin/faq', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(form),
        });
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || 'สร้าง FAQ ไม่สำเร็จ');
        }
      }
      await loadFAQs();
      handleCancel();
    } catch (err: any) {
      setError(err.message || 'บันทึกข้อมูลไม่สำเร็จ');
    }
  }

  async function handleDelete(id: number) {
    if (!confirm('คุณแน่ใจหรือไม่ว่าต้องการลบ FAQ นี้?')) {
      return;
    }
    try {
      const res = await fetch(`/api/admin/faq/${id}`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'ลบ FAQ ไม่สำเร็จ');
      }
      await loadFAQs();
    } catch (err: any) {
      setError(err.message || 'ลบ FAQ ไม่สำเร็จ');
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="mb-1 text-xl font-bold tracking-tight">
          จัดการคำถามพบบ่อย (FAQ)
        </h1>
        <p className="text-sm text-stone-500">
          เพิ่ม แก้ไข หรือลบคำถามพบบ่อยที่แสดงใน LINE Bot
        </p>
      </div>

      {error && (
        <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
          {error}
        </div>
      )}

      <div className="flex justify-end">
        <button
          onClick={() => {
            handleCancel();
            setShowForm(true);
          }}
          className="flex items-center gap-2 rounded-lg border border-stone-300 bg-white px-4 py-2 text-sm font-semibold text-stone-700 transition-colors hover:border-stone-400 hover:bg-stone-50"
        >
          <Icon icon="solar:add-circle-bold" className="h-4 w-4" />
          เพิ่ม FAQ
        </button>
      </div>

      {showForm && (
        <div className="rounded-lg border border-stone-200 bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold">
            {editingId ? 'แก้ไข FAQ' : 'เพิ่ม FAQ ใหม่'}
          </h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-stone-700">
                คำถาม *
              </label>
              <input
                type="text"
                value={form.question}
                onChange={(e) => setForm({ ...form, question: e.target.value })}
                className="w-full rounded-md border border-stone-300 px-3 py-2 text-sm focus:border-stone-500 focus:outline-none"
                required
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-stone-700">
                คำตอบ *
              </label>
              <textarea
                value={form.answer}
                onChange={(e) => setForm({ ...form, answer: e.target.value })}
                rows={5}
                className="w-full rounded-md border border-stone-300 px-3 py-2 text-sm focus:border-stone-500 focus:outline-none"
                required
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-stone-700">
                ลำดับการแสดงผล
              </label>
              <input
                type="number"
                value={form.order}
                onChange={(e) => setForm({ ...form, order: parseInt(e.target.value) || 0 })}
                className="w-full rounded-md border border-stone-300 px-3 py-2 text-sm focus:border-stone-500 focus:outline-none"
                min="0"
              />
            </div>
            <div className="flex gap-2">
              <button
                type="submit"
                className="rounded-lg bg-stone-900 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-stone-800"
              >
                {editingId ? 'บันทึกการแก้ไข' : 'เพิ่ม FAQ'}
              </button>
              <button
                type="button"
                onClick={handleCancel}
                className="rounded-lg border border-stone-300 bg-white px-4 py-2 text-sm font-semibold text-stone-700 transition-colors hover:bg-stone-50"
              >
                ยกเลิก
              </button>
            </div>
          </form>
        </div>
      )}

      {loading ? (
        <div className="rounded-lg border border-stone-200 bg-white p-8 shadow-sm">
          <div className="text-center text-sm text-stone-500">
            กำลังโหลดข้อมูล...
          </div>
        </div>
      ) : faqs.length === 0 ? (
        <div className="rounded-lg border border-stone-200 bg-white p-8 shadow-sm">
          <div className="text-center text-sm text-stone-500">
            ยังไม่มี FAQ คลิกปุ่ม "เพิ่ม FAQ" เพื่อเพิ่มรายการใหม่
          </div>
        </div>
      ) : (
        <div className="rounded-lg border border-stone-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b border-stone-200 bg-stone-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-stone-600">
                    ลำดับ
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-stone-600">
                    คำถาม
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-stone-600">
                    คำตอบ
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-stone-600">
                    จัดการ
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {faqs.map((faq) => (
                  <tr
                    key={faq.id}
                    className="border-b border-stone-100 transition-colors hover:bg-stone-50/50"
                  >
                    <td className="px-4 py-3 text-sm text-stone-600">
                      {faq.order}
                    </td>
                    <td className="px-4 py-3 text-sm font-medium text-stone-900">
                      {faq.question}
                    </td>
                    <td className="px-4 py-3 text-sm text-stone-700">
                      <div className="max-w-md truncate" title={faq.answer}>
                        {faq.answer}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleEdit(faq)}
                          className="rounded-md px-2 py-1 text-xs text-blue-600 hover:bg-blue-50"
                          title="แก้ไข"
                        >
                          <Icon icon="solar:pen-bold" className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(faq.id)}
                          className="rounded-md px-2 py-1 text-xs text-rose-600 hover:bg-rose-50"
                          title="ลบ"
                        >
                          <Icon icon="solar:trash-bin-trash-bold" className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}


