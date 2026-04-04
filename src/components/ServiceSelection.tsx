// Booking Step 2: Service Selection (ขั้นตอนที่ 2: เลือกบริการ)
import React, { useState, useEffect } from 'react';
import { Service, Branch } from '../types';
import { Loader2, Clock, Sparkles } from 'lucide-react';

interface ServiceSelectionProps {
  branchId: string;
  onSelect: (s: Service) => void;
  onBack?: () => void;
  recommendedId?: string;
}

export const ServiceSelection: React.FC<ServiceSelectionProps> = ({ 
  branchId,
  onSelect, 
  onBack,
  recommendedId 
}) => {
  const [services, setServices] = useState<Service[]>([]);
  const [branch, setBranch] = useState<Branch | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        // Load branch to get availableServices
        const branchRes = await fetch('/api/branches');
        const branchData = await branchRes.json();
        if (branchRes.ok) {
          const foundBranch = branchData.branches?.find((b: Branch) => b.id === branchId);
          setBranch(foundBranch || null);
          if (foundBranch) {
          } else {
            console.warn('Branch not found:', branchId);
          }
        }

        // Load all services
        const servicesRes = await fetch('/api/services');
        const servicesData = await servicesRes.json();
        if (servicesRes.ok) {
          const loadedServices = servicesData.services || [];
          setServices(loadedServices);
        } else {
          console.error('Failed to load services:', servicesData);
        }
        setError(null);
      } catch (err: any) {
        setError(err.message || 'Failed to load services');
        console.error('Error loading services:', err);
      } finally {
        setLoading(false);
      }
    }
    void loadData();
  }, [branchId]);

  // Filter services based on the selected branch
  // ถ้า branch มี availableServices และไม่ว่าง ให้ filter ตามนั้น
  // ถ้าไม่มีหรือว่าง ให้แสดง services ทั้งหมด
  const availableServices = React.useMemo(() => {
    // ถ้ายังไม่มี services ให้ return empty array
    if (services.length === 0) {
      return [];
    }
    
    // ถ้ายังไม่มี branch ให้แสดง services ทั้งหมด
    if (!branch) {
      return services;
    }
    
    // ถ้า availableServices เป็น empty array หรือไม่มี ให้แสดง services ทั้งหมด
    if (!branch.availableServices || branch.availableServices.length === 0) {
      return services;
    }
    
    // Filter ตาม availableServices
    const filtered = services.filter(s => branch.availableServices.includes(s.id));
    
    // ถ้า filter แล้วไม่มีเลย แต่มี services ทั้งหมด ให้แสดงทั้งหมดแทน
    if (filtered.length === 0 && services.length > 0) {
      console.warn('No services match availableServices, showing all services');
      return services;
    }
    
    return filtered;
  }, [services, branch]);

  return (
    <div className="space-y-6 animate-fade-in pb-20">
      {/* Services List - Large Cards */}
      <div className="space-y-4">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="animate-spin text-primary-600" size={32} />
          </div>
        ) : error ? (
          <div className="text-center py-12 text-rose-600">
            {error}
          </div>
        ) : availableServices.length === 0 ? (
           <div className="text-center py-10 text-stone-500">
             ไม่พบรายการบริการสำหรับสาขานี้
           </div>
        ) : (
          availableServices.map((service) => {
            const isRecommended = recommendedId === service.id;
            return (
              <div 
                key={service.id}
                onClick={() => onSelect(service)}
                className={`
                  relative flex items-center p-5 rounded-3xl border-2 transition-all cursor-pointer shadow-sm
                  active:scale-[0.98] touch-manipulation
                  ${isRecommended ? 'border-primary-500 bg-primary-50 ring-1 ring-primary-500' : 'border-stone-200 bg-white hover:border-primary-300'}
                `}
              >
                {isRecommended && (
                  <div className="absolute -top-4 right-6 bg-primary-600 text-white text-sm px-4 py-1.5 rounded-full font-bold shadow-md flex items-center gap-1">
                    <Sparkles size={14} /> แนะนำสำหรับคุณ
                  </div>
                )}
                
                <img src={service.image} alt={service.name} className="w-24 h-24 rounded-2xl object-cover shadow-md" />
                
                <div className="ml-5 flex-1 min-w-0">
                  <h3 className="text-xl font-bold text-stone-900 leading-tight mb-2">{service.name}</h3>
                  <p className="text-base text-stone-500 line-clamp-2 leading-relaxed mb-3">{service.description}</p>
                  <div className="flex items-center gap-3">
                    <span className="inline-block bg-primary-100 text-primary-800 px-3 py-1 rounded-lg text-base font-bold">
                      {service.price} บ.
                    </span>
                    <span className="text-stone-500 text-base flex items-center gap-1">
                      <Clock size={16} /> {service.duration} นาที
                    </span>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
