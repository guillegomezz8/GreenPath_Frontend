import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet-draw/dist/leaflet.draw.css";
import "leaflet-draw";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Map, Users } from "lucide-react";
import { useAuth } from "@/context/AuthProvider";
import { useToast } from "@/hooks/use-toast";
import { handleApiError } from "@/components/Utils";

export default function CollectionZonesList() {
  const mapRef = useRef(null);
  const drawnItemsRef = useRef(null);
  const clientMarkersLayerRef = useRef(null);
  const resizeObserverRef = useRef(null);
  const [zones, setZones] = useState([]);
  const { api } = useAuth();
  const { toast } = useToast();
  const [showZoneClients, setShowZoneClients] = useState(false);

  const [modalOpen, setModalOpen] = useState(false);
  const [newZoneName, setNewZoneName] = useState("");
  const [pendingLayer, setPendingLayer] = useState(null);
  const [saving, setSaving] = useState(false);

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
    if (mapRef.current) return;

    const map = L.map("map", {
      center: [37.38, -5.99],
      zoom: 12,
      zoomControl: true,
    });
    mapRef.current = map;

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "© OpenStreetMap contributors",
    }).addTo(map);

    const drawnItems = new L.FeatureGroup();
    drawnItemsRef.current = drawnItems;
    map.addLayer(drawnItems);

    const clientMarkersLayer = new L.LayerGroup();
    clientMarkersLayerRef.current = clientMarkersLayer;
    map.addLayer(clientMarkersLayer);

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
        remove: true,
      },
    });
    map.addControl(drawControl);

    map.on(L.Draw.Event.CREATED, (e) => {
      const layer = e.layer;
      drawnItems.addLayer(layer);
      setPendingLayer(layer);
      setNewZoneName("");
      setModalOpen(true);
    });

    // Editar zona
    map.on(L.Draw.Event.EDITED, async (e) => {
      const layers = e.layers.getLayers();
      for (const layer of layers) {
        const popup = layer.getPopup();
        const zoneName = popup ? popup.getContent().replace(/<[^>]+>/g, "") : "Zona";
        const coords = layer
          .toGeoJSON()
          .geometry.coordinates[0]
          .map(([lng, lat]) => [lng, lat]);

        try {
          await api().put(`/zones/${layer.zoneId}/`, {
            name: zoneName,
            polygon: `SRID=4326;POLYGON((${coords
              .map(([lng, lat]) => `${lng} ${lat}`)
              .join(", ")}))`,
          });
          toast({ title: "Zona actualizada", description: `${zoneName} modificada correctamente.` });
        } catch (err) {
          const msg = handleApiError(err, "Error al actualizar la zona.");
          toast({ title: "Error", description: msg, variant: "destructive" });
        }
      }
    });

    map.on(L.Draw.Event.DELETED, async (e) => {
      const layers = e.layers.getLayers();
      for (const layer of layers) {
        try {
          await api().delete(`/zones/${layer.zoneId}/`);
          toast({ title: "Zona eliminada", description: "Zona borrada correctamente." });
        } catch (err) {
          const msg = handleApiError(err, "No se pudo eliminar la zona.");
          toast({ title: "Error", description: msg, variant: "destructive" });
        }
      }
      fetchZones();
    });

    resizeObserverRef.current = new ResizeObserver(() => {
      setTimeout(() => map.invalidateSize(), 300);
    });
    resizeObserverRef.current.observe(document.getElementById("map"));

    return () => {
      resizeObserverRef.current?.disconnect();
    };
  }, [api, toast]);

  useEffect(() => {
    const map = mapRef.current;
    const drawnItems = drawnItemsRef.current;
    const clientMarkersLayer = clientMarkersLayerRef.current;
    if (!map || !drawnItems || !clientMarkersLayer) return;

    drawnItems.clearLayers();
    clientMarkersLayer.clearLayers();

    zones.forEach((zone) => {
      try {
        const coords = parsePolygonWKT(zone.polygon);
        const polygon = L.polygon(coords, {
          color: "#2563eb",
          fillColor: "#3b82f6",
          fillOpacity: 0.3,
          weight: 2,
        }).addTo(drawnItems);

        const clientsPreview = zone.clients_count
          ? `<div style="margin-top:6px;font-size:12px;color:#475569;">${zone.clients_count} cliente${zone.clients_count === 1 ? "" : "s"} en esta zona</div>`
          : `<div style="margin-top:6px;font-size:12px;color:#94a3b8;">Sin clientes asignados</div>`;

        polygon.bindPopup(`<strong>${zone.name}</strong>${clientsPreview}`);
        polygon.zoneId = zone.id;

        if (showZoneClients && Array.isArray(zone.clients)) {
          zone.clients.forEach((client) => {
            if (client.latitude == null || client.longitude == null) return;

            const marker = L.circleMarker([client.latitude, client.longitude], {
              radius: 7,
              color: "#065f46",
              fillColor: "#10b981",
              fillOpacity: 0.95,
              weight: 2,
            });

            marker.bindPopup(`
              <div style="min-width:220px;">
                <strong>${client.name}</strong>
                <div style="margin-top:4px;font-size:12px;color:#475569;">${client.address}</div>
                <div style="font-size:12px;color:#475569;">${client.postal_code} ${client.city}</div>
                <div style="margin-top:6px;font-size:12px;color:#047857;font-weight:600;">${client.frequency}</div>
                <div style="margin-top:6px;font-size:11px;color:#64748b;">Zona: ${zone.name}</div>
              </div>
            `);

            marker.addTo(clientMarkersLayer);
          });
        }
      } catch (err) {
        console.warn("Error parsing polygon:", zone.name, err);
      }
    });

    if (drawnItems.getLayers().length > 0) {
      map.fitBounds(drawnItems.getBounds());
    }
  }, [zones, showZoneClients]);

  const parsePolygonWKT = (wkt) => {
    const match = wkt.match(/\(\((.*)\)\)/);
    if (!match) return [];
    const coords = match[1].split(",").map((pair) => {
      const [lng, lat] = pair.trim().split(" ").map(Number);
      return [lat, lng];
    });
    return coords;
  };

  const handleSaveZone = async () => {
    if (!pendingLayer || !newZoneName.trim()) return;
    setSaving(true);

    try {
      const coords = pendingLayer
        .toGeoJSON()
        .geometry.coordinates[0]
        .map(([lng, lat]) => [lng, lat]);

      await api().post("/zones/", {
        name: newZoneName.trim(),
        polygon: `SRID=4326;POLYGON((${coords
          .map(([lng, lat]) => `${lng} ${lat}`)
          .join(", ")}))`,
      });

      toast({ title: "Zona creada", description: `${newZoneName} guardada correctamente.` });
      fetchZones();
    } catch (err) {
      const msg = handleApiError(err, "No se pudo crear la zona.");
      toast({ title: "Error", description: msg, variant: "destructive" });
    } finally {
      setModalOpen(false);
      setNewZoneName("");
      setPendingLayer(null);
      setSaving(false);
    }
  };

  // Cancelar creación de zona
  const handleCancelZone = () => {
    if (pendingLayer && drawnItemsRef.current) {
      drawnItemsRef.current.removeLayer(pendingLayer);
    }
    setModalOpen(false);
    setNewZoneName("");
    setPendingLayer(null);
  };

  return (
    <>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex-1 text-left">
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-foreground flex flex-wrap items-center gap-2 lg:gap-3 leading-tight">
              <Map className="w-8 h-8 text-primary" />
              Zonas de Recogida
            </h1>
            <p className="text-sm sm:text-base text-muted-foreground leading-relaxed max-w-2xl text-left">
              Visualiza, crea y edita las zonas de recogida de aceite.
            </p>
          </div>
          <Button
            type="button"
            variant={showZoneClients ? "default" : "outline"}
            className="w-full md:w-auto"
            onClick={() => setShowZoneClients((prev) => !prev)}
          >
            <Users className="w-4 h-4 mr-2" />
            {showZoneClients ? "Ocultar clientes" : "Mostrar clientes"}
          </Button>
        </div>

        {/* Mapa */}
        <Card className="sm:mx-0 -mx-4 sm:rounded-lg rounded-none">
          <CardHeader className="pb-3">
            <CardTitle>Mapa de Zonas</CardTitle>
          </CardHeader>
          <CardContent className="p-2 sm:p-6">
            <div
              id="map"
              className="w-full h-[65vh] sm:h-[70vh] rounded-lg border relative z-0"
            />
          </CardContent>
        </Card>

      </div>

      {/* Modal para crear nueva zona */}
      <Dialog open={modalOpen} onOpenChange={(open) => {
        if (!open) handleCancelZone();
      }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Nueva Zona de Recogida</DialogTitle>
          </DialogHeader>

          <div className="py-2">
            <Input
              placeholder="Nombre de la zona"
              value={newZoneName}
              onChange={(e) => setNewZoneName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && newZoneName.trim() && !saving) {
                  handleSaveZone();
                }
              }}
              autoFocus
            />
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={handleCancelZone}
              disabled={saving}
            >
              Cancelar
            </Button>
            <Button 
              onClick={handleSaveZone} 
              disabled={saving || !newZoneName.trim()}
            >
              {saving ? "Guardando..." : "Guardar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
