import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet-draw/dist/leaflet.draw.css";
import "leaflet-draw";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Map, Plus } from "lucide-react";
import { useAuth } from "@/context/AuthProvider";
import { useToast } from "@/hooks/use-toast";
import { handleApiError } from "@/components/Utils";

export default function CollectionZonesList() {
  const mapRef = useRef(null);
  const drawnItemsRef = useRef(null);
  const [zones, setZones] = useState([]);
  const { api } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    fetchZones();
  }, []);

  const fetchZones = async () => {
    try {
      const res = await api().get("/zones/");
      setZones(res.data.results || []);
    } catch (err) {
      const msg = handleApiError(err, "No se pudieron cargar las zonas.");
      toast({ title: "Error", description: msg, variant: "destructive" });
    }
  };

  useEffect(() => {
    if (mapRef.current) return; // evitar recrear el mapa

    const map = L.map("map", {
      center: [37.38, -5.99], // Sevilla centro aprox
      zoom: 12,
      zoomControl: true,
    });
    mapRef.current = map;

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "© OpenStreetMap contributors",
    }).addTo(map);

    // Grupo donde se dibujan y cargan zonas
    const drawnItems = new L.FeatureGroup();
    drawnItemsRef.current = drawnItems;
    map.addLayer(drawnItems);

    // Control de dibujo
    const drawControl = new L.Control.Draw({
      draw: {
        polygon: {
          shapeOptions: { color: "#16a34a" },
          allowIntersection: false,
          showArea: true,
        },
        rectangle: false,
        circle: false,
        circlemarker: false,
        marker: false,
        polyline: false,
      },
      edit: {
        featureGroup: drawnItems,
      },
    });
    map.addControl(drawControl);

    // Evento al crear nueva zona
    map.on(L.Draw.Event.CREATED, (e) => {
      const layer = e.layer;
      drawnItems.addLayer(layer);
      const coords = layer.toGeoJSON().geometry.coordinates[0].map(([lng, lat]) => [lng, lat]);
      console.log("Nuevo polígono:", coords);

      toast({
        title: "Zona creada localmente",
        description: "Puedes guardar esta zona en el backend enviando las coordenadas.",
      });
    });
  }, [toast]);

  // Renderizar zonas desde el backend
  useEffect(() => {
    const map = mapRef.current;
    const drawnItems = drawnItemsRef.current;
    if (!map || !zones.length) return;

    drawnItems.clearLayers();

    zones.forEach((zone) => {
      try {
        const coords = parsePolygonWKT(zone.polygon);
        const polygon = L.polygon(coords, {
          color: "#2563eb",
          fillColor: "#3b82f6",
          fillOpacity: 0.3,
          weight: 2,
        }).addTo(drawnItems);

        polygon.bindPopup(`<strong>${zone.name}</strong>`);
      } catch (err) {
        console.warn("Error parsing polygon:", zone.name, err);
      }
    });

    map.fitBounds(drawnItems.getBounds());
  }, [zones]);

  // Función para parsear el WKT "POLYGON ((lng lat, ...))"
  const parsePolygonWKT = (wkt) => {
    const match = wkt.match(/\(\((.*)\)\)/);
    if (!match) return [];
    const coords = match[1].split(",").map((pair) => {
      const [lng, lat] = pair.trim().split(" ").map(Number);
      return [lat, lng]; // Leaflet usa [lat, lng]
    });
    return coords;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start gap-4 text-left">
        <div className="flex-1">
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-foreground flex items-center gap-2 md:gap-3">
            <Map className="w-6 h-6 md:w-8 md:h-8 text-primary flex-shrink-0" />
            <span className="leading-tight">Zonas de Recogida</span>
          </h1>
          <p className="text-xs sm:text-sm md:text-base text-muted-foreground mt-1">
            Visualiza y gestiona las zonas de recogida
          </p>
        </div>

        <div className="flex gap-2">
          <Button onClick={fetchZones} variant="outline" className="gap-2">
            <Map className="w-4 h-4" />
            Actualizar
          </Button>
          <Button className="gap-2">
            <Plus className="w-4 h-4" />
            Nueva Zona
          </Button>
        </div>
      </div>

      {/* Mapa */}
      <Card>
        <CardHeader>
          <CardTitle>Mapa de Zonas</CardTitle>
        </CardHeader>
        <CardContent>
          <div id="map" className="w-full h-[70vh] rounded-lg border" />
        </CardContent>
      </Card>
    </div>
  );
}
