import { useEffect, useMemo } from "react";
import L from "leaflet";
import { MapContainer, Marker, TileLayer, useMap, useMapEvents } from "react-leaflet";
import "leaflet/dist/leaflet.css";
function isValidLocation(location) {
  return Number.isFinite(Number(location?.lat)) && Number.isFinite(Number(location?.lng));
}

function createHubMarker() {
  return L.divIcon({
    className: "company-hub-marker",
    html: `
      <div style="display:flex;align-items:center;justify-content:center;width:36px;height:36px;border-radius:14px;background:#0f3d2e;color:#ffffff;border:3px solid rgba(255,255,255,0.95);box-shadow:0 18px 32px -20px rgba(15,61,46,0.75);font-weight:800;font-size:13px;">
        H
      </div>
    `,
    iconSize: [36, 36],
    iconAnchor: [18, 18],
    popupAnchor: [0, -14],
  });
}

function MapClickHandler({ onChange }) {
  useMapEvents({
    click(event) {
      onChange?.({
        lat: Number(event.latlng.lat.toFixed(6)),
        lng: Number(event.latlng.lng.toFixed(6)),
      });
    },
  });

  return null;
}

function MapViewportController({ position }) {
  const map = useMap();

  useEffect(() => {
    const timer = setTimeout(() => {
      map.invalidateSize();
      if (!Array.isArray(position)) return;
      map.setView(position, 15, { animate: true });
    }, 80);

    return () => clearTimeout(timer);
  }, [map, position]);

  return null;
}

export default function CompanyHubPicker({ value, onChange }) {
  const selectedPosition = useMemo(() => {
    if (!isValidLocation(value)) return null;
    return [Number(value.lat), Number(value.lng)];
  }, [value]);

  const defaultCenter = selectedPosition || [37.3891, -5.9845];

  return (
    <div className="space-y-3">
      <div className="overflow-hidden rounded-2xl border border-border/80">
        <MapContainer
          center={defaultCenter}
          zoom={selectedPosition ? 15 : 12}
          scrollWheelZoom
          className="h-[240px] w-full sm:h-[300px] lg:h-[360px]"
        >
          <TileLayer
            attribution="&copy; OpenStreetMap contributors"
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <MapClickHandler onChange={onChange} />
          <MapViewportController position={selectedPosition} />
          {selectedPosition ? <Marker position={selectedPosition} icon={createHubMarker()} /> : null}
        </MapContainer>
      </div>
    </div>
  );
}
