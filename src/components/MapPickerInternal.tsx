'use client';

import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';

interface MapPickerInternalProps {
  center: [number, number];
  onLocationChange: (lat: number, lng: number) => void;
  initialLat: number | null;
  initialLng: number | null;
}

function LocationMarker({ 
  onLocationChange, 
  initialLat, 
  initialLng 
}: { 
  onLocationChange: (lat: number, lng: number) => void;
  initialLat: number | null;
  initialLng: number | null;
}) {
  const [position, setPosition] = useState<[number, number] | null>(
    initialLat && initialLng ? [initialLat, initialLng] : null
  );

  const map = useMapEvents({
    click(e) {
      const { lat, lng } = e.latlng;
      setPosition([lat, lng]);
      onLocationChange(lat, lng);
    },
  });

  useEffect(() => {
    if (initialLat && initialLng) {
      const newPos: [number, number] = [initialLat, initialLng];
      setPosition(newPos);
      map.setView(newPos, map.getZoom());
    }
  }, [initialLat, initialLng, map]);

  return position === null ? null : (
    <Marker 
      position={position}
      draggable={true}
      eventHandlers={{
        dragend: (e) => {
          const marker = e.target;
          const newPos = marker.getLatLng();
          setPosition([newPos.lat, newPos.lng]);
          onLocationChange(newPos.lat, newPos.lng);
        },
      }}
    />
  );
}

export default function MapPickerInternal({ 
  center, 
  onLocationChange, 
  initialLat, 
  initialLng 
}: MapPickerInternalProps) {
  return (
    <MapContainer
      center={center}
      zoom={13}
      style={{ height: '100%', width: '100%' }}
      scrollWheelZoom={true}
      key={`${center[0]}-${center[1]}`}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <LocationMarker
        onLocationChange={onLocationChange}
        initialLat={initialLat}
        initialLng={initialLng}
      />
    </MapContainer>
  );
}

