'use client';

import React, { useEffect, useState } from 'react';
import { Icon } from '@iconify/react';

type FaqItem = {
  id: number;
  question: string;
  answer: string;
};

export default function FaqPage() {
  const [faqs, setFaqs] = useState<FaqItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<number | null>(null);

  useEffect(() => {
    async function fetchFaqs() {
      try {
        const res = await fetch('/api/faq');
        const data = await res.json();
        
        if (!res.ok) {
          throw new Error(data.error || 'ไม่สามารถดึงข้อมูลได้');
        }
        
        setFaqs(data.faqs || []);
      } catch (err: any) {
        setError(err.message || 'เกิดข้อผิดพลาด');
      } finally {
        setLoading(false);
      }
    }

    void fetchFaqs();
  }, []);

  const toggleExpand = (id: number) => {
    setExpandedId(expandedId === id ? null : id);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary-50 to-stone-100 flex items-center justify-center">
        <div className="text-center">
          <div className="mb-4 inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary-600 border-r-transparent"></div>
          <p className="text-sm text-stone-500">กำลังโหลด...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-stone-50 to-stone-100 flex items-center justify-center px-4">
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-rose-100">
            <Icon icon="solar:danger-triangle-bold" className="h-8 w-8 text-rose-600" />
          </div>
          <h1 className="text-xl font-bold text-stone-900 mb-2">เกิดข้อผิดพลาด</h1>
          <p className="text-sm text-stone-600">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-stone-100">
      {/* Header */}
      <div className="bg-white border-b border-stone-200 shadow-sm sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-100">
              <Icon icon="solar:question-circle-bold" className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-stone-900">คำถามที่พบบ่อย</h1>
              <p className="text-xs text-stone-500">FAQ - Frequently Asked Questions</p>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-2xl mx-auto px-4 py-6">
        {faqs.length === 0 ? (
          <div className="text-center py-12">
            <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-stone-100">
              <Icon icon="solar:document-text-bold" className="h-10 w-10 text-stone-400" />
            </div>
            <h2 className="text-lg font-semibold text-stone-700 mb-2">ยังไม่มีคำถาม</h2>
            <p className="text-sm text-stone-500">คำถามที่พบบ่อยจะแสดงที่นี่</p>
          </div>
        ) : (
          <div className="space-y-3">
            {faqs.map((faq, index) => (
              <div
                key={faq.id}
                className="bg-white rounded-xl border border-stone-200 shadow-sm overflow-hidden"
              >
                {/* Question - Clickable */}
                <button
                  onClick={() => toggleExpand(faq.id)}
                  className="w-full px-4 py-4 flex items-start gap-3 text-left hover:bg-stone-50 transition-colors"
                >
                  {/* Number Badge */}
                  <div className="flex-shrink-0 flex h-7 w-7 items-center justify-center rounded-full bg-primary-100 text-primary-700 text-sm font-bold">
                    {index + 1}
                  </div>
                  
                  {/* Question Text */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-stone-900 leading-relaxed">
                      {faq.question}
                    </p>
                  </div>
                  
                  {/* Expand Icon */}
                  <div className="flex-shrink-0">
                    <Icon 
                      icon={expandedId === faq.id ? "solar:alt-arrow-up-bold" : "solar:alt-arrow-down-bold"} 
                      className={`h-5 w-5 transition-colors ${
                        expandedId === faq.id ? 'text-primary-600' : 'text-stone-400'
                      }`}
                    />
                  </div>
                </button>

                {/* Answer - Collapsible */}
                {expandedId === faq.id && (
                  <div className="px-4 pb-4 pt-0">
                    <div className="ml-10 pl-3 border-l-2 border-primary-200">
                      <p className="text-sm text-stone-600 leading-relaxed whitespace-pre-line">
                        {faq.answer}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

      </div>
    </div>
  );
}

