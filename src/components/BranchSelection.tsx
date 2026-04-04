
// Booking Step 1: Branch Selection (ขั้นตอนที่ 1: เลือกสาขา)
import React, { useState, useEffect } from 'react';
import { Branch } from '../types';
import { Button } from './Button';
import { getServiceRecommendation } from '../services/geminiService';
import { Search, Store, MapPin, ChevronLeft, Loader2, Sparkles } from 'lucide-react';

interface BranchSelectionProps {
  onSelect: (b: Branch, recommendedServiceId?: string) => void;
  onCheckHistory: () => void;
}

// ฟังก์ชันคำนวณระยะห่างระหว่างสองจุด (Haversine formula)
function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // รัศมีโลกในหน่วยกิโลเมตร
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) *
      Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; // ระยะห่างในหน่วยกิโลเมตร
}

// ฟังก์ชันจัดรูปแบบระยะห่าง
function formatDistance(distance: number): string {
  if (distance < 1) {
    return `${Math.round(distance * 1000)} ม.`;
  }
  return `${distance.toFixed(1)} กม.`;
}

export const BranchSelection: React.FC<BranchSelectionProps> = ({ onSelect, onCheckHistory }) => {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [prompt, setPrompt] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const [aiResult, setAiResult] = useState<{id: string, reason: string} | null>(null);

  // หาตำแหน่งปัจจุบัน
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          });
        },
        () => {
          // ถ้าไม่สามารถหาตำแหน่งได้ ไม่ต้องทำอะไร
        }
      );
    }
  }, []);

  useEffect(() => {
    async function loadBranches() {
      try {
        setLoading(true);
        const res = await fetch('/api/branches');
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || 'Failed to load branches');
        }
        setBranches(data.branches || []);
        setError(null);
      } catch (err: any) {
        setError(err.message || 'Failed to load branches');
        console.error('Error loading branches:', err);
      } finally {
        setLoading(false);
      }
    }
    void loadBranches();
  }, []);

  const handleAskAI = async () => {
    if (!prompt.trim()) return;
    setIsThinking(true);
    const result = await getServiceRecommendation(prompt);
    setIsThinking(false);
    if (result) {
      setAiResult({ id: result.recommendedServiceId, reason: result.reasoning });
    }
  };

  return (
    <div className="space-y-8 animate-fade-in pb-20">
      {/* 1. AI Section - Top Priority */}
      {/* Commented out temporarily
      <div className="bg-gradient-to-br from-white to-primary-50 p-4 sm:p-6 rounded-2xl sm:rounded-3xl border border-primary-100 shadow-sm">
        <div className="flex items-start gap-3 sm:gap-4">
          <div className="bg-primary-100 p-2 sm:p-3 rounded-xl sm:rounded-2xl text-primary-600 shrink-0">
            <Sparkles size={20} className="sm:w-7 sm:h-7" />
          </div>
          <div className="flex-1 space-y-2.5 sm:space-y-3 min-w-0">
            <div>
              <h3 className="text-base sm:text-xl font-bold text-primary-900">ให้ AI ช่วยแนะนำ?</h3>
              <p className="text-xs sm:text-base text-stone-600 mt-0.5 sm:mt-1">บอกอาการปวดเมื่อยของคุณ เดี๋ยวระบบช่วยเลือกให้ค่ะ</p>
            </div>
            <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
              <input 
                type="text" 
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="เช่น ปวดหลัง, ปวดขา..."
                className="flex-1 px-3 sm:px-4 py-2 sm:py-3 text-sm sm:text-lg border border-stone-300 rounded-lg sm:rounded-xl focus:ring-2 focus:ring-primary-400 outline-none shadow-sm"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !isThinking && prompt.trim()) {
                    handleAskAI();
                  }
                }}
                suppressHydrationWarning
              />
              <Button 
                onClick={handleAskAI} 
                disabled={isThinking || !prompt}
                className="!py-2 sm:!py-3 !px-4 sm:!px-6 !rounded-lg sm:!rounded-xl text-sm sm:text-lg font-medium w-full sm:w-auto"
              >
                {isThinking ? <Loader2 className="animate-spin" size={18} /> : 'ค้นหา'}
              </Button>
            </div>
            {aiResult && (
              <div className="mt-3 sm:mt-4 bg-white p-3 sm:p-4 rounded-lg sm:rounded-xl border-l-4 border-primary-500 shadow-sm">
                <p className="text-sm sm:text-lg text-stone-800">
                  <span className="font-bold text-primary-700 block mb-1 text-xs sm:text-base">แนะนำ:</span> 
                  <span className="text-xs sm:text-base leading-relaxed">{aiResult.reason}</span>
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
      */}


      {/* 2. Branch Selection Section */}
      <div className="space-y-4">
        <div className="flex items-center gap-3 mb-2">
          <div className="bg-primary-100 p-3 rounded-full text-primary-600">
            <Store size={32} />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-stone-800">เลือกสาขา</h2>
            <p className="text-base text-stone-500">เลือกสาขาที่ใกล้คุณที่สุดค่ะ</p>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="animate-spin text-primary-600" size={32} />
          </div>
        ) : error ? (
          <div className="text-center py-12 text-rose-600">
            {error}
          </div>
        ) : branches.length === 0 ? (
          <div className="text-center py-12 text-stone-500">
            ไม่พบสาขา
          </div>
        ) : (
          <div className="space-y-4">
            {branches
              .map((branch) => {
                // คำนวณระยะห่างถ้ามีตำแหน่ง
                let distance: number | null = null;
                if (
                  userLocation &&
                  branch.latitude !== null &&
                  branch.latitude !== undefined &&
                  branch.longitude !== null &&
                  branch.longitude !== undefined
                ) {
                  distance = calculateDistance(
                    userLocation.lat,
                    userLocation.lng,
                    branch.latitude,
                    branch.longitude
                  );
                }
                return { branch, distance };
              })
              .sort((a, b) => {
                // เรียงตามระยะห่าง (ใกล้สุดก่อน)
                if (a.distance === null && b.distance === null) return 0;
                if (a.distance === null) return 1;
                if (b.distance === null) return -1;
                return a.distance - b.distance;
              })
              .map(({ branch, distance }) => (
            <div 
              key={branch.id}
              onClick={() => onSelect(branch, aiResult?.id)}
              className="group relative flex items-center gap-4 p-4 rounded-3xl border-2 border-stone-200 bg-white hover:border-primary-300 hover:bg-white transition-all cursor-pointer active:scale-[0.98] touch-manipulation shadow-sm"
            >
              {/* รูปภาพ - วงกลมในมือถือ, สี่เหลี่ยมใน desktop */}
              <div className="w-20 h-20 sm:w-28 sm:h-28 rounded-full sm:rounded-2xl overflow-hidden shadow-md shrink-0 bg-stone-100 flex items-center justify-center">
                {branch.image && branch.image !== "/placeholder-branch.png" ? (
                  <img 
                    src={branch.image} 
                    alt={branch.name} 
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.style.display = 'none';
                      const parent = target.parentElement;
                      if (parent) {
                        const fallback = parent.querySelector('.image-fallback') as HTMLElement;
                        if (fallback) fallback.style.display = 'flex';
                      }
                    }}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-primary-100 text-primary-600 text-xl sm:text-2xl font-bold">
                    {branch.name.charAt(0)}
                  </div>
                )}
                <div className="image-fallback hidden w-full h-full items-center justify-center bg-primary-100 text-primary-600 text-xl sm:text-2xl font-bold">
                  {branch.name.charAt(0)}
                </div>
              </div>
              
              {/* ข้อมูลสาขา */}
              <div className="flex-1 min-w-0">
                <h3 className="text-lg sm:text-xl font-bold text-stone-900 leading-tight mb-1.5 sm:mb-2 group-hover:text-primary-700 transition-colors">{branch.name}</h3>
                <div className="flex items-start gap-2 text-stone-500 text-sm sm:text-base leading-relaxed mb-1.5">
                  <MapPin size={16} className="mt-0.5 sm:mt-1 shrink-0 text-primary-500" />
                  <span className="break-words">{branch.location}</span>
                </div>
                {distance !== null && (
                  <div className="mt-1.5 text-sm sm:text-base text-primary-600 font-semibold flex items-center gap-1.5">
                    <MapPin size={14} className="text-primary-500 shrink-0" />
                    <span>ระยะห่าง {formatDistance(distance)}</span>
                  </div>
                )}
              </div>
              
              {/* Arrow icon - แสดงใน desktop เท่านั้น */}
              <div className="hidden sm:flex bg-primary-100 text-primary-600 p-2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                <ChevronLeft size={24} className="rotate-180" />
              </div>
            </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
