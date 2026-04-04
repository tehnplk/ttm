'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Store, MapPin, Loader2, Sparkles, Calendar, Clock, User } from 'lucide-react';
import { ServiceSelection } from '@/components/ServiceSelection';
import { DateSelection } from '@/components/DateSelection';
import { TimeSelection } from '@/components/TimeSelection';
import { StaffSelection } from '@/components/StaffSelection';
import { Service, TimeSlot, Staff } from '@/types';

interface Branch {
  id: string;
  name: string;
  image: string;
  location?: string;
  latitude?: number | null;
  longitude?: number | null;
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

function BookingNewPageContent() {
  const searchParams = useSearchParams();
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedBranch, setSelectedBranch] = useState<Branch | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [showServiceSelection, setShowServiceSelection] = useState(false);
  const [showDateSelection, setShowDateSelection] = useState(false);
  const [showTimeSelection, setShowTimeSelection] = useState(false);
  const [showStaffSelection, setShowStaffSelection] = useState(false);
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<TimeSlot | null>(null);
  const [selectedStaff, setSelectedStaff] = useState<Staff | null>(null);
  
  // Get userid from URL parameter
  const userId = searchParams.get('userid');
  const hasUserId = Boolean(userId && userId.trim().length > 0);

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
        setError(null);
        const res = await fetch('/api/branches');
        const data = await res.json();
        if (res.ok && data.branches && data.branches.length > 0) {
          setBranches(data.branches);
        } else {
          setError(data.error || 'ไม่พบข้อมูลสาขา');
        }
      } catch (err: any) {
        setError(err.message || 'เกิดข้อผิดพลาดในการโหลดข้อมูลสาขา');
        console.error('Error loading branches:', err);
      } finally {
        setLoading(false);
      }
    }
    void loadBranches();
  }, []);

  // ถ้าไม่มี userid แสดงข้อความแจ้งเตือน
  if (!hasUserId) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-stone-50 to-stone-100 flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-white rounded-xl shadow-lg border border-stone-200 p-8 text-center">
          <div className="mb-6">
            <div className="mx-auto w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mb-4">
              <svg
                className="w-8 h-8 text-purple-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-stone-900 mb-2">
              ใช้ผ่าน LINE เท่านั้น
            </h2>
            <p className="text-stone-600">
              กรุณาเข้าสู่ระบบผ่าน LINE เพื่อใช้บริการจองคิว
            </p>
          </div>
          <div className="pt-4 border-t border-stone-200">
            <p className="text-sm text-stone-500">
              หากต้องการจองคิว กรุณาเปิดลิงก์นี้ผ่าน LINE
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-stone-50 to-stone-100">
      {/* Header สีม่วง */}
      <header className="bg-purple-600 text-white shadow-md">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            {selectedBranch && (
              <>
                {selectedBranch.image && selectedBranch.image !== '/placeholder-branch.png' && (
                  <div className="flex-shrink-0">
                    <img
                      src={selectedBranch.image.startsWith('http') ? selectedBranch.image : `/images/${selectedBranch.image}`}
                      alt={selectedBranch.name}
                      className="w-16 h-16 rounded-lg object-cover border-2 border-white/30"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none';
                      }}
                    />
                  </div>
                )}
                <div className="flex-1">
                  <h1 className="text-2xl font-bold">{selectedBranch.name}</h1>
                  {selectedBranch.location && (
                    <p className="text-purple-100 text-sm mt-1">{selectedBranch.location}</p>
                  )}
                </div>
              </>
            )}
            {!selectedBranch && !loading && (
              <div className="flex-1">
                <h1 className="text-2xl font-bold">จองคิว</h1>
              </div>
            )}
            {loading && (
              <div className="flex-1">
                <div className="h-6 bg-purple-500/50 rounded animate-pulse w-32"></div>
              </div>
            )}
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          {showStaffSelection && selectedTimeSlot && selectedDate ? (
            /* Staff Selection Section */
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-3 mb-4">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setShowStaffSelection(false)}
                    className="p-2 hover:bg-purple-100 rounded-full transition-colors"
                  >
                    <svg
                      className="w-6 h-6 text-purple-600"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M15 19l-7-7 7-7"
                      />
                    </svg>
                  </button>
                  <div className="bg-purple-100 p-3 rounded-full text-purple-600">
                    <User size={24} />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-stone-800">เลือกพนักงาน</h2>
                    <p className="text-base text-stone-500">เลือกพนักงานที่ต้องการ</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowStaffSelection(false)}
                  className="px-4 py-2 bg-purple-600 text-white hover:bg-purple-700 rounded-lg transition-colors font-medium shadow-md"
                >
                  ย้อนกลับ
                </button>
              </div>
              <StaffSelection
                serviceId={selectedService?.id || ''}
                selectedStaff={selectedStaff}
                date={selectedDate}
                timeSlot={selectedTimeSlot}
                branchId={selectedBranch?.id}
                onSelect={(staff) => {
                  setSelectedStaff(staff);
                  // TODO: Navigate to next step (confirmation)
                  console.log('Staff selected:', staff);
                }}
                onBack={() => setShowStaffSelection(false)}
              />
            </div>
          ) : showTimeSelection && selectedDate ? (
            /* Time Selection Section */
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-3 mb-4">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setShowTimeSelection(false)}
                    className="p-2 hover:bg-purple-100 rounded-full transition-colors"
                  >
                    <svg
                      className="w-6 h-6 text-purple-600"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M15 19l-7-7 7-7"
                      />
                    </svg>
                  </button>
                  <div className="bg-purple-100 p-3 rounded-full text-purple-600">
                    <Clock size={24} />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-stone-800">เลือกเวลา</h2>
                    <p className="text-base text-stone-500">เลือกเวลาที่ต้องการ</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowTimeSelection(false)}
                  className="px-4 py-2 bg-purple-600 text-white hover:bg-purple-700 rounded-lg transition-colors font-medium shadow-md"
                >
                  ย้อนกลับ
                </button>
              </div>
              <TimeSelection
                selectedDate={selectedDate}
                selectedTime={selectedTimeSlot}
                branchId={selectedBranch?.id}
                onSelect={(timeSlot) => {
                  setSelectedTimeSlot(timeSlot);
                  setShowStaffSelection(true);
                }}
                onBack={() => setShowTimeSelection(false)}
              />
            </div>
          ) : showDateSelection && selectedService ? (
            /* Date Selection Section */
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-3 mb-4">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setShowDateSelection(false)}
                    className="p-2 hover:bg-purple-100 rounded-full transition-colors"
                  >
                    <svg
                      className="w-6 h-6 text-purple-600"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M15 19l-7-7 7-7"
                      />
                    </svg>
                  </button>
                  <div className="bg-purple-100 p-3 rounded-full text-purple-600">
                    <Calendar size={24} />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-stone-800">เลือกวันที่</h2>
                    <p className="text-base text-stone-500">เลือกวันที่ต้องการ</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowDateSelection(false)}
                  className="px-4 py-2 bg-purple-600 text-white hover:bg-purple-700 rounded-lg transition-colors font-medium shadow-md"
                >
                  ย้อนกลับ
                </button>
              </div>
              <DateSelection
                selectedDate={selectedDate}
                onSelect={(date) => {
                  setSelectedDate(date);
                  setShowTimeSelection(true);
                }}
                onBack={() => setShowDateSelection(false)}
              />
            </div>
          ) : showServiceSelection && selectedBranch ? (
            /* Service Selection Section */
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-3 mb-4">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setShowServiceSelection(false)}
                    className="p-2 hover:bg-purple-100 rounded-full transition-colors"
                  >
                    <svg
                      className="w-6 h-6 text-purple-600"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M15 19l-7-7 7-7"
                      />
                    </svg>
                  </button>
                  <div className="bg-purple-100 p-3 rounded-full text-purple-600">
                    <Sparkles size={24} />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-stone-800">เลือกบริการ</h2>
                    <p className="text-base text-stone-500">เลือกบริการที่ต้องการ</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowServiceSelection(false)}
                  className="px-4 py-2 bg-purple-600 text-white hover:bg-purple-700 rounded-lg transition-colors font-medium shadow-md"
                >
                  ย้อนกลับ
                </button>
              </div>
              <ServiceSelection
                branchId={selectedBranch.id}
                onSelect={(service) => {
                  setSelectedService(service);
                  setShowDateSelection(true);
                }}
                onBack={() => setShowServiceSelection(false)}
              />
            </div>
          ) : (
            /* Branch Selection Section */
            <div className="space-y-4">
              <div className="flex items-center gap-3 mb-4">
                <div className="bg-purple-100 p-3 rounded-full text-purple-600">
                  <Store size={24} />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-stone-800">เลือกสาขา</h2>
                  <p className="text-base text-stone-500">เลือกสาขาที่ต้องการจองคิว</p>
                </div>
              </div>

              {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="animate-spin text-purple-600" size={32} />
              </div>
            ) : error ? (
              <div className="text-center py-12 text-rose-600 bg-rose-50 rounded-xl p-6">
                {error}
              </div>
            ) : branches.length === 0 ? (
              <div className="text-center py-12 text-stone-500 bg-stone-50 rounded-xl p-6">
                ไม่พบสาขา
              </div>
            ) : (
              <div className="space-y-3">
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
                  .map(({ branch, distance }) => {
                    const isSelected = selectedBranch?.id === branch.id;
                    return (
                      <div
                        key={branch.id}
                        onClick={() => {
                          setSelectedBranch(branch);
                          setShowServiceSelection(true);
                        }}
                        className={`group relative flex items-center gap-4 p-4 rounded-xl border-2 ${
                          isSelected
                            ? 'border-purple-500 bg-purple-50'
                            : 'border-stone-200 bg-white hover:border-purple-300 hover:bg-purple-50/50'
                        } transition-all cursor-pointer active:scale-[0.98] shadow-sm`}
                      >
                        {/* รูปภาพสาขา */}
                        <div className="w-20 h-20 rounded-xl overflow-hidden shadow-md shrink-0 bg-stone-100 flex items-center justify-center">
                          {branch.image && branch.image !== '/placeholder-branch.png' ? (
                            <img
                              src={branch.image.startsWith('http') ? branch.image : `/images/${branch.image}`}
                              alt={branch.name}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                const target = e.target as HTMLImageElement;
                                target.style.display = 'none';
                                const parent = target.parentElement;
                                if (parent) {
                                  const fallback = parent.querySelector('.image-fallback') as HTMLImageElement;
                                  if (fallback) fallback.style.display = 'block';
                                }
                              }}
                            />
                          ) : (
                            <img
                              src="/images/staff-1765427285473-xqgh97g.jpg"
                              alt={branch.name}
                              className="w-full h-full object-cover"
                            />
                          )}
                          <img
                            src="/images/staff-1765427285473-xqgh97g.jpg"
                            alt={branch.name}
                            className="image-fallback hidden w-full h-full object-cover"
                          />
                        </div>

                        {/* ข้อมูลสาขา */}
                        <div className="flex-1 min-w-0">
                          <h3 className={`text-lg font-bold leading-tight mb-1.5 ${
                            isSelected ? 'text-purple-900' : 'text-stone-900 group-hover:text-purple-700'
                          } transition-colors`}>
                            {branch.name}
                          </h3>
                          {branch.location && (
                            <div className="flex items-start gap-2 text-stone-600 text-sm leading-relaxed">
                              <MapPin size={14} className="mt-0.5 shrink-0 text-purple-500" />
                              <span className="break-words">{branch.location}</span>
                            </div>
                          )}
                          {distance !== null && (
                            <div className="mt-1.5 text-sm text-purple-600 font-semibold flex items-center gap-1.5">
                              <MapPin size={14} className="text-purple-500 shrink-0" />
                              <span>ระยะห่าง {formatDistance(distance)}</span>
                            </div>
                          )}
                        </div>

                        {/* Selected indicator */}
                        {isSelected && (
                          <div className="bg-purple-600 text-white p-2 rounded-full shrink-0">
                            <svg
                              className="w-5 h-5"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M5 13l4 4L19 7"
                              />
                            </svg>
                          </div>
                        )}
                      </div>
                    );
                  })}
              </div>
            )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function BookingNewPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gradient-to-br from-stone-50 to-stone-100 flex items-center justify-center">
          <div className="text-center">
            <div className="mb-4 inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-purple-600 border-r-transparent"></div>
            <p className="text-sm text-stone-500">กำลังโหลด...</p>
          </div>
        </div>
      }
    >
      <BookingNewPageContent />
    </Suspense>
  );
}

