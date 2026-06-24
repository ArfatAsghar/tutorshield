import { useEffect, useRef } from "react";
import L from "leaflet";

interface InteractiveMapProps {
  homeCoords: { lat: number; lng: number };
  tutorCoords: { lat: number; lng: number } | null;
  className?: string;
  zoom?: number;
}

export function InteractiveMap({ homeCoords, tutorCoords, className = "w-full h-full", zoom = 14 }: InteractiveMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const homeMarkerRef = useRef<L.Marker | null>(null);
  const tutorMarkerRef = useRef<L.Marker | null>(null);
  const polylineRef = useRef<L.Polyline | null>(null);

  // Custom premium SVG Icons using Leaflet's divIcon
  const homeIcon = L.divIcon({
    className: "custom-home-icon",
    html: `
      <div style="
        background-color: #064e3b;
        border: 2px solid #ffffff;
        border-radius: 50%;
        width: 34px;
        height: 34px;
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.25);
      ">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
          <polyline points="9 22 9 12 15 12 15 22"/>
        </svg>
      </div>
    `,
    iconSize: [34, 34],
    iconAnchor: [17, 17],
  });

  const tutorIcon = L.divIcon({
    className: "custom-tutor-icon",
    html: `
      <div style="position: relative; width: 34px; height: 34px;">
        <div style="
          position: absolute;
          inset: -8px;
          background-color: #10b981;
          opacity: 0.35;
          border-radius: 50%;
          animation: pulse-ping 2s cubic-bezier(0, 0, 0.2, 1) infinite;
        "></div>
        <div style="
          position: absolute;
          inset: 0;
          background-color: #10b981;
          border: 2px solid #ffffff;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.25);
        ">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="10"/>
            <polyline points="12 6 12 12 16 14"/>
          </svg>
        </div>
      </div>
      <style>
        @keyframes pulse-ping {
          0% { transform: scale(1); opacity: 0.45; }
          100% { transform: scale(2.2); opacity: 0; }
        }
      </style>
    `,
    iconSize: [34, 34],
    iconAnchor: [17, 17],
  });

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    // Create Leaflet Map Instance
    const map = L.map(mapContainerRef.current, {
      zoomControl: true,
      attributionControl: false,
    }).setView([homeCoords.lat, homeCoords.lng], zoom);

    mapRef.current = map;

    // Use a premium dark-themed or clean map tile layer (CartoDB Positron / Voyager)
    L.tileLayer("https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png", {
      maxZoom: 19,
    }).addTo(map);

    // Add Home Marker
    const homeMarker = L.marker([homeCoords.lat, homeCoords.lng], { icon: homeIcon })
      .bindPopup("<div class='font-sans font-semibold text-xs text-primary'>Student's Home Address</div>")
      .addTo(map);
    homeMarkerRef.current = homeMarker;

    return () => {
      // Clean up maps and events on component unmount to prevent memory leaks
      map.remove();
      mapRef.current = null;
      homeMarkerRef.current = null;
      tutorMarkerRef.current = null;
      polylineRef.current = null;
    };
  }, []);

  // Update Markers, Polyline and Center Bounds Dynamically when Coordinates Change
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const homeLatLng: L.LatLngExpression = [homeCoords.lat, homeCoords.lng];

    // Update Home location if changed
    if (homeMarkerRef.current) {
      homeMarkerRef.current.setLatLng(homeLatLng);
    }

    if (tutorCoords) {
      const tutorLatLng: L.LatLngExpression = [tutorCoords.lat, tutorCoords.lng];

      // Update or create Tutor marker
      if (tutorMarkerRef.current) {
        tutorMarkerRef.current.setLatLng(tutorLatLng);
      } else {
        tutorMarkerRef.current = L.marker(tutorLatLng, { icon: tutorIcon })
          .bindPopup("<div class='font-sans font-semibold text-xs text-emerald-600'>Tutor's Current Location</div>")
          .addTo(map);
      }

      // Update or create Route line
      if (polylineRef.current) {
        polylineRef.current.setLatLngs([tutorLatLng, homeLatLng]);
      } else {
        polylineRef.current = L.polyline([tutorLatLng, homeLatLng], {
          color: "#10b981",
          weight: 4,
          dashArray: "8, 8",
          opacity: 0.8,
        }).addTo(map);
      }

      // Zoom/pan map dynamically to fit both markers perfectly
      const bounds = L.latLngBounds([tutorLatLng, homeLatLng]);
      map.fitBounds(bounds, { padding: [40, 40] });
    } else {
      // Remove tutor marker and polyline if tutor goes offline
      if (tutorMarkerRef.current) {
        tutorMarkerRef.current.remove();
        tutorMarkerRef.current = null;
      }
      if (polylineRef.current) {
        polylineRef.current.remove();
        polylineRef.current = null;
      }
      map.setView(homeLatLng, zoom);
    }
  }, [homeCoords.lat, homeCoords.lng, tutorCoords?.lat, tutorCoords?.lng]);

  return (
    <div className="w-full h-full relative">
      <div ref={mapContainerRef} className={className} />
    </div>
  );
}
