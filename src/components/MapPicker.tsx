'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix for default marker icon in Next.js
if (typeof window !== 'undefined') {
  delete (L.Icon.Default.prototype as any)._getIconUrl;
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
  });
}

interface MapPickerProps {
  latitude: number | null;
  longitude: number | null;
  onLocationChange: (lat: number, lng: number) => void;
}

// Dynamic import for the entire map component to avoid SSR issues
const DynamicMap = dynamic(
  () => import('./MapPickerInternal'),
  { 
    ssr: false,
    loading: () => (
      <div className="h-[400px] w-full rounded-lg border border-stone-300 bg-stone-100 flex items-center justify-center">
        <div className="text-sm text-stone-500">กำลังโหลดแผนที่...</div>
      </div>
    )
  }
);

export function MapPicker({ latitude, longitude, onLocationChange }: MapPickerProps) {
  const [mounted, setMounted] = useState(false);
  const [currentPosition, setCurrentPosition] = useState<[number, number] | null>(null);
  const [isLoadingLocation, setIsLoadingLocation] = useState(true);

  useEffect(() => {
    setMounted(true);
    
    // Always get current location as default
    if (navigator.geolocation) {
      setIsLoadingLocation(true);
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude: lat, longitude: lng } = position.coords;
          const pos: [number, number] = [lat, lng];
          setCurrentPosition(pos);
          
          // Always use current location as default and call onLocationChange
          // This ensures the form always has a location value
          onLocationChange(lat, lng);
          setIsLoadingLocation(false);
        },
        () => {
          // Default to Bangkok if geolocation fails
          const defaultPos: [number, number] = [13.7563, 100.5018];
          setCurrentPosition(defaultPos);
          // Always set default position
          onLocationChange(defaultPos[0], defaultPos[1]);
          setIsLoadingLocation(false);
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0
        }
      );
    } else {
      // Default to Bangkok if geolocation not available
      const defaultPos: [number, number] = [13.7563, 100.5018];
      setCurrentPosition(defaultPos);
      // Always set default position
      onLocationChange(defaultPos[0], defaultPos[1]);
      setIsLoadingLocation(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run once on mount

  if (!mounted) {
    return (
      <div className="h-[400px] w-full rounded-lg border border-stone-300 bg-stone-100 flex items-center justify-center">
        <div className="text-sm text-stone-500">กำลังโหลดแผนที่...</div>
      </div>
    );
  }

  // Always use current position as center for better UX
  // This allows user to see their current location first
  const center: [number, number] = 
    currentPosition || 
    (latitude && longitude ? [latitude, longitude] : [13.7563, 100.5018]);

  // Use existing coordinates for marker if available
  // Otherwise use current position as default marker
  const markerLat = (latitude !== null && latitude !== undefined) 
    ? latitude 
    : (currentPosition ? currentPosition[0] : null);
  const markerLng = (longitude !== null && longitude !== undefined) 
    ? longitude 
    : (currentPosition ? currentPosition[1] : null);

  return (
    <div className="h-[400px] w-full rounded-lg border border-stone-300 overflow-hidden relative">
      {isLoadingLocation && (
        <div className="absolute top-2 left-2 z-[1000] bg-white/90 px-3 py-1.5 rounded-lg text-xs text-stone-600 shadow-sm">
          กำลังค้นหาตำแหน่งปัจจุบัน...
        </div>
      )}
      <DynamicMap
        center={center}
        onLocationChange={onLocationChange}
        initialLat={markerLat}
        initialLng={markerLng}
      />
    </div>
  );
}
