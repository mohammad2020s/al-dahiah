import React, { useEffect, useRef, useState } from "react";
import { MapPin, Navigation } from "lucide-react";
import { translations } from "../i18n";

export const MAP_FALLBACK_MESSAGE = "تعذر تحميل خرائط Google";

interface MapViewProps {
  className?: string;
  initialCenter?: { lat: number; lng: number };
  initialZoom?: number;
  locationName?: string;
  language?: "ar" | "en";
  onMapReady?: (map: any) => void;
  onMapError?: () => void;
}

type MapStatus = "loading" | "ready" | "missing-key" | "error";

declare global {
  interface Window {
    google?: {
      maps?: any;
    };
    gm_authFailure?: () => void;
    __alQasabGoogleMapsLoaded?: () => void;
  }
}

let googleMapsApiPromise: Promise<void> | null = null;
let googleMapsAuthFailed = false;
const googleMapsAuthFailureListeners = new Set<() => void>();
let googleMapsAuthFailureHookInstalled = false;

function listenForGoogleMapsAuthFailure(listener: () => void) {
  googleMapsAuthFailureListeners.add(listener);
  if (!googleMapsAuthFailureHookInstalled) {
    window.gm_authFailure = () => {
      googleMapsAuthFailed = true;
      googleMapsApiPromise = null;
      googleMapsAuthFailureListeners.forEach((handleFailure) => handleFailure());
    };
    googleMapsAuthFailureHookInstalled = true;
  }
  return () => googleMapsAuthFailureListeners.delete(listener);
}

function loadGoogleMapsApi(apiKey: string): Promise<void> {
  if (googleMapsAuthFailed) {
    return Promise.reject(new Error("Google Maps rejected the API key."));
  }
  if (window.google?.maps?.importLibrary) return Promise.resolve();
  if (googleMapsApiPromise) return googleMapsApiPromise;

  googleMapsApiPromise = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    window.__alQasabGoogleMapsLoaded = () => {
      delete window.__alQasabGoogleMapsLoaded;
      if (window.google?.maps?.importLibrary) resolve();
      else {
        googleMapsApiPromise = null;
        reject(new Error("Google Maps API loaded without its library loader."));
      }
    };
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(apiKey)}&v=weekly&loading=async&callback=__alQasabGoogleMapsLoaded`;
    script.async = true;
    script.defer = true;
    script.dataset.googleMapsApi = "true";
    script.onerror = () => {
      delete window.__alQasabGoogleMapsLoaded;
      googleMapsApiPromise = null;
      reject(new Error("Google Maps JavaScript API could not be loaded."));
    };
    document.head.appendChild(script);
  });

  return googleMapsApiPromise;
}

export const MapView: React.FC<MapViewProps> = ({
  className = "h-64 sm:h-72",
  initialCenter = { lat: 25.2984, lng: 45.5073 },
  initialZoom = 15,
  locationName = "موسم ملح القصب - أرض الفعاليات",
  language = "ar",
  onMapReady,
  onMapError,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markerRef = useRef<any>(null);
  const [mapStatus, setMapStatus] = useState<MapStatus>("loading");
  const isEn = language === "en";
  const t = translations[language];
  const { lat, lng } = initialCenter;
  const directionsUrl = `https://www.google.com/maps/dir/?api=1&destination=${lat.toFixed(4)},${lng.toFixed(4)}`;

  useEffect(() => {
    let cancelled = false;
    const removeAuthFailureListener = listenForGoogleMapsAuthFailure(() => {
      if (!cancelled) {
        onMapError?.();
        setMapStatus("error");
      }
    });

    const initializeMap = async () => {
      setMapStatus("loading");
      try {
        const configResponse = await fetch("/api/maps/config", { cache: "no-store" });
        if (!configResponse.ok) throw new Error("Unable to read Google Maps configuration.");

        const { apiKey } = await configResponse.json();
        if (typeof apiKey !== "string" || apiKey.trim().length === 0) {
          if (!cancelled) {
            onMapError?.();
            setMapStatus("missing-key");
          }
          return;
        }

        await loadGoogleMapsApi(apiKey.trim());
        if (cancelled || !mapContainerRef.current || !window.google?.maps?.importLibrary) return;

        const mapsLibrary = await window.google.maps.importLibrary("maps");
        if (cancelled || !mapContainerRef.current) return;

        const map = new mapsLibrary.Map(mapContainerRef.current, {
          center: { lat, lng },
          zoom: initialZoom,
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: true,
          clickableIcons: true,
          gestureHandling: "cooperative",
        });
        const marker = new window.google.maps.Marker({
          map,
          position: { lat, lng },
          title: locationName,
        });

        mapInstanceRef.current = map;
        markerRef.current = marker;
        onMapReady?.(map);
        setMapStatus("ready");
      } catch (error) {
        console.error("Google Maps initialization failed:", error);
        if (!cancelled) {
          onMapError?.();
          setMapStatus("error");
        }
      }
    };

    void initializeMap();

    return () => {
      cancelled = true;
      removeAuthFailureListener();
      markerRef.current?.setMap(null);
      markerRef.current = null;
      if (mapInstanceRef.current && window.google?.maps?.event) {
        window.google.maps.event.clearInstanceListeners(mapInstanceRef.current);
      }
      mapInstanceRef.current = null;
    };
  }, [lat, lng, initialZoom, locationName, onMapReady, onMapError]);

  const statusMessage =
    mapStatus === "loading" ? t.mapLoading :
    mapStatus === "missing-key" ? t.mapApiKeyMissing :
    mapStatus === "error" ? t.mapLoadError :
    "";

  return (
    <div className="relative w-full overflow-hidden">
      <div className={`relative w-full ${className}`}>
        <div ref={mapContainerRef} className="h-full w-full" />

        {mapStatus !== "ready" && (
          <div
            className="absolute inset-0 z-[300] grid place-items-center bg-[#f7f1ed] px-6 text-center"
            role={mapStatus === "error" ? "alert" : undefined}
          >
            <div className="max-w-sm">
              <MapPin className="mx-auto mb-2 size-6 text-[#A52A2A]" />
              <p className="text-sm font-semibold text-[#3a1210]">{statusMessage}</p>
            </div>
          </div>
        )}

        <div className="absolute top-3 end-3 z-[400] flex max-w-[80%] items-center gap-1.5 rounded-full border border-[#f0d0cc] bg-white/90 px-3.5 py-1.5 text-xs font-bold text-[#3a1210] shadow-md backdrop-blur-sm pointer-events-none">
          <MapPin className="size-3.5 shrink-0 text-[#A52A2A]" />
          <span className="truncate">{locationName}</span>
        </div>
      </div>

      <div className="border-t border-[#f6dedc] bg-white/90 p-3 backdrop-blur-sm sm:p-4">
        <a
          href={directionsUrl}
          target="_blank"
          rel="noreferrer"
          className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#A52A2A] px-4 py-3 text-xs font-bold text-white shadow-sm transition hover:bg-[#8e1b12] active:scale-[0.99] sm:text-sm"
        >
          <Navigation className="size-4" />
          <span>{t.mapOpenGoogle}</span>
        </a>
      </div>
    </div>
  );
};
