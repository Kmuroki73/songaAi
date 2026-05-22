import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix default marker icons broken by bundlers
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

const driverIcon = L.divIcon({
  className: '',
  html: `<div style="
    width:40px;height:40px;
    background:#FF6A00;
    border:3px solid white;
    border-radius:50%;
    box-shadow:0 2px 12px rgba(255,106,0,0.5);
    display:flex;align-items:center;justify-content:center;
    font-size:18px;
  ">🚐</div>`,
  iconSize: [40, 40],
  iconAnchor: [20, 20],
});

const pickupIcon = (label: string | number) => L.divIcon({
  className: '',
  html: `<div style="
    position:relative;
    display:flex;flex-direction:column;align-items:center;
  ">
    <div style="
      background:#10B981;color:white;
      font-size:11px;font-weight:700;
      padding:3px 7px;border-radius:12px;
      box-shadow:0 2px 8px rgba(16,185,129,0.4);
      white-space:nowrap;
    ">${label}</div>
    <div style="width:2px;height:8px;background:#10B981;"></div>
    <div style="width:8px;height:8px;background:#10B981;border-radius:50%;"></div>
  </div>`,
  iconSize: [60, 36],
  iconAnchor: [30, 36],
});

export type MapMarker = {
  lat: number;
  lng: number;
  type: 'driver' | 'pickup';
  label?: string;
  popupHtml?: string;
};

type Props = {
  markers: MapMarker[];
  className?: string;
  centerOnDriver?: boolean;
};

export const TripMap: React.FC<Props> = ({ markers, className = '', centerOnDriver }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markersRef = useRef<L.Marker[]>([]);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    // Default center: Kenya
    const center: [number, number] = [-0.0236, 37.9062];
    mapRef.current = L.map(containerRef.current, {
      center,
      zoom: 7,
      zoomControl: true,
      attributionControl: false,
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
    }).addTo(mapRef.current);

    // Subtle attribution
    L.control.attribution({ prefix: '© <a href="https://osm.org/copyright">OpenStreetMap</a>' })
      .addTo(mapRef.current);

    return () => {
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, []);

  // Update markers when data changes
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    // Remove old markers
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    if (markers.length === 0) return;

    const bounds: [number, number][] = [];

    markers.forEach((m) => {
      const icon = m.type === 'driver' ? driverIcon : pickupIcon(m.label ?? '');
      const marker = L.marker([m.lat, m.lng], { icon }).addTo(map);
      if (m.popupHtml) {
        marker.bindPopup(m.popupHtml, { maxWidth: 220 });
      }
      markersRef.current.push(marker);
      bounds.push([m.lat, m.lng]);
    });

    // Center on driver if requested, else fit all markers
    const driverMarker = markers.find((m) => m.type === 'driver');
    if (centerOnDriver && driverMarker) {
      map.setView([driverMarker.lat, driverMarker.lng], 14, { animate: true });
    } else if (bounds.length === 1) {
      map.setView(bounds[0], 13, { animate: true });
    } else {
      map.fitBounds(bounds as L.LatLngBoundsExpression, { padding: [40, 40], animate: true });
    }
  }, [markers, centerOnDriver]);

  return (
    <div
      ref={containerRef}
      className={`rounded-2xl overflow-hidden ${className}`}
      style={{ minHeight: 240 }}
    />
  );
};
