import React, { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

export type MapPoint = { id: string; lat: number; lng: number; title: string; label?: string; kind?: "cafe" | "nature" };

// Free OpenStreetMap map (no API key, no billing). Pins are drawn with CSS
// (L.divIcon) so no marker images have to be bundled.
export function LeafletMap({
  points,
  activeId,
  route = false,
  className = "h-64",
  zoom = 15,
  onSelect,
  fitIds,
}: {
  points: MapPoint[];
  activeId?: string;
  route?: boolean;
  className?: string;
  zoom?: number;
  onSelect?: (id: string) => void;
  /** Frame these pins (instead of the active one / all pins) */
  fitIds?: string[];
}) {
  const elRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const layerRef = useRef<L.LayerGroup | null>(null);

  useEffect(() => {
    if (!elRef.current || mapRef.current) return;
    const map = L.map(elRef.current, { zoomControl: true, attributionControl: true, scrollWheelZoom: false });
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a>',
    }).addTo(map);
    layerRef.current = L.layerGroup().addTo(map);
    mapRef.current = map;
    // The card may still be animating in; recompute size once it settles
    setTimeout(() => map.invalidateSize(), 350);
    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    const layer = layerRef.current;
    if (!map || !layer || points.length === 0) return;
    layer.clearLayers();

    if (route && points.length > 1) {
      L.polyline(points.map((p) => [p.lat, p.lng] as [number, number]), {
        color: "#b82e24",
        weight: 3,
        opacity: 0.75,
        dashArray: "6 8",
      }).addTo(layer);
    }

    points.forEach((p) => {
      const active = p.id === activeId;
      const icon = L.divIcon({
        className: "",
        html: `<div class="lm-pin${p.kind ? ` lm-pin-${p.kind}` : ""}${active ? " lm-pin-active" : ""}"><span>${p.label ?? ""}</span></div>`,
        iconSize: [30, 38],
        iconAnchor: [15, 36],
        tooltipAnchor: [0, -34],
      });
      const marker = L.marker([p.lat, p.lng], { icon, zIndexOffset: active ? 1000 : 0 })
        .bindTooltip(p.title, { direction: "top", className: "lm-tip" })
        .addTo(layer);
      if (onSelect) marker.on("click", () => onSelect(p.id));
    });

    const active = points.find((p) => p.id === activeId);
    const fitPoints = fitIds ? points.filter((p) => fitIds.includes(p.id)) : [];
    if (fitPoints.length > 1) {
      map.fitBounds(L.latLngBounds(fitPoints.map((p) => [p.lat, p.lng] as [number, number])), { padding: [30, 30], maxZoom: 17 });
    } else if (active && !route) {
      map.setView([active.lat, active.lng], zoom);
    } else if (points.length === 1) {
      map.setView([points[0].lat, points[0].lng], zoom);
    } else {
      map.fitBounds(L.latLngBounds(points.map((p) => [p.lat, p.lng] as [number, number])), { padding: [30, 30], maxZoom: 17 });
      if (active) map.panTo([active.lat, active.lng]);
    }
  }, [points, activeId, route, zoom, onSelect, fitIds]);

  return <div ref={elRef} dir="ltr" className={`lm-map w-full ${className}`} />;
}

/** Google Maps directions link (a plain link: free, opens the app on phones). */
export const directionsUrl = (lat: number, lng: number) =>
  `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
