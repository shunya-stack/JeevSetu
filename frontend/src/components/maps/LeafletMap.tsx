import React, { useEffect, useRef } from 'react';
import L from 'leaflet';

interface MapPoint {
  id: string;
  name: string;
  service_type?: string;
  latitude: number;
  longitude: number;
  urgency?: string;
  phone?: string;
  address?: string;
}

interface LeafletMapProps {
  center?: [number, number];
  zoom?: number;
  points?: MapPoint[];
  selectedPointId?: string;
  onSelectPoint?: (id: string) => void;
  className?: string;
}

export const LeafletMap: React.FC<LeafletMapProps> = ({
  center = [20.2961, 85.8245], // Bhubaneswar default
  zoom = 11,
  points = [],
  selectedPointId,
  onSelectPoint,
  className = "h-[360px] w-full rounded-2xl overflow-hidden border border-[#E2E7DF] shadow-xs"
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersRef = useRef<{ [key: string]: L.Marker }>({});

  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current, {
        center,
        zoom,
        zoomControl: true,
        scrollWheelZoom: false
      });

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
      }).addTo(map);

      mapInstanceRef.current = map;
    }

    const map = mapInstanceRef.current;

    // Clear old markers
    Object.values(markersRef.current).forEach(marker => marker.remove());
    markersRef.current = {};

    // Add point markers
    points.forEach(point => {
      const isUrgent = point.urgency === 'urgent';
      const isSelected = point.id === selectedPointId;

      const markerColor = isUrgent ? '#B83A35' : '#174B35';
      const markerHtml = `
        <div style="
          background-color: ${markerColor};
          color: white;
          width: 32px;
          height: 32px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          border: 3px solid white;
          box-shadow: 0 4px 10px rgba(0,0,0,0.25);
          cursor: pointer;
          font-weight: bold;
          font-size: 13px;
          transform: ${isSelected ? 'scale(1.2)' : 'scale(1)'};
          transition: transform 0.2s ease;
        ">
          ${isUrgent ? '!' : '✚'}
        </div>
      `;

      const customIcon = L.divIcon({
        className: 'custom-leaflet-marker',
        html: markerHtml,
        iconSize: [32, 32],
        iconAnchor: [16, 16]
      });

      const marker = L.marker([point.latitude, point.longitude], { icon: customIcon }).addTo(map);
      
      const popupContent = `
        <div style="font-family: inherit; font-size: 13px; min-width: 180px; padding: 2px;">
          <h4 style="margin: 0 0 4px 0; font-weight: bold; color: #17251D;">${point.name}</h4>
          ${point.service_type ? `<div style="font-size: 11px; color: #174B35; font-weight: 600; margin-bottom: 4px;">${point.service_type}</div>` : ''}
          ${point.address ? `<p style="margin: 0 0 4px 0; color: #647168; font-size: 11px;">${point.address}</p>` : ''}
          ${point.phone ? `<p style="margin: 0; color: #174B35; font-size: 11px;"><strong>📞 ${point.phone}</strong></p>` : ''}
        </div>
      `;
      marker.bindPopup(popupContent);

      marker.on('click', () => {
        if (onSelectPoint) onSelectPoint(point.id);
      });

      markersRef.current[point.id] = marker;
    });

    if (points.length > 0 && map) {
      const bounds = L.latLngBounds(points.map(p => [p.latitude, p.longitude]));
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 14 });
    }

    return () => {
      // Keep instance intact during component remounts
    };
  }, [points, selectedPointId]);

  return <div ref={mapContainerRef} className={className} />;
};

