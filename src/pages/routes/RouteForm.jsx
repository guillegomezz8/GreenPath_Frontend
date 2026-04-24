import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthProvider";
import { useSnackbar } from "@/context/SnackbarProvider";
import { handleApiError, normalizeZoneName } from "@/components/Utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Save, Route, Users, MapPin, CalendarDays } from "lucide-react";

const WEEKDAYS = [
  { value: 0, label: "Lunes" },
  { value: 1, label: "Martes" },
  { value: 2, label: "Miercoles" },
  { value: 3, label: "Jueves" },
  { value: 4, label: "Viernes" },
  { value: 5, label: "Sabado" },
  { value: 6, label: "Domingo" },
];

function getOperationalWeekdays(weekStart, weekEnd) {
  const start = Number(weekStart);
  const end = Number(weekEnd);
  if (!Number.isInteger(start) || !Number.isInteger(end) || start < 0 || start > 6 || end < 0 || end > 6) {
    return WEEKDAYS;
  }

  const values = [];
  let current = start;
  values.push(current);
  while (current !== end) {
    current = (current + 1) % 7;
    values.push(current);
  }

  return values
    .map((value) => WEEKDAYS.find((day) => day.value === value))
    .filter(Boolean);
}

function buildEmptyZoneConfig() {
  return { 0: [], 1: [], 2: [], 3: [], 4: [], 5: [], 6: [] };
}

function normalizeZoneConfig(zoneDays) {
  const config = buildEmptyZoneConfig();
  if (!Array.isArray(zoneDays)) return config;
  zoneDays.forEach((item) => {
    const weekday = Number(item?.weekday);
    if (!Number.isInteger(weekday) || weekday < 0 || weekday > 6) return;
    const zones = Array.isArray(item?.zones) ? item.zones : [];
    config[weekday] = zones
      .map((zone) => {
        if (typeof zone === "number") return zone;
        if (typeof zone === "object" && zone?.id) return zone.id;
        return null;
      })
      .filter((id) => Number.isInteger(id));
  });
  return config;
}

export default function RouteForm({ mode = "create", routeId = null }) {
  const navigate = useNavigate();
  const { api } = useAuth();
  const showSnackbar = useSnackbar();
  const isEdit = mode === "edit";

  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [workers, setWorkers] = useState([]);
  const [zones, setZones] = useState([]);

  const [formData, setFormData] = useState({
    name: "",
    start_date: "",
    end_date: "",
    week_start: "0",
    week_end: "6",
    worker: "",
  });
  const [zoneConfig, setZoneConfig] = useState(buildEmptyZoneConfig());

  const fetchBaseData = useCallback(async () => {
    try {
      setLoading(true);
      const [workersRes, zonesRes] = await Promise.all([
        api().get("workers", { params: { page: 1, page_size: 300 } }),
        api().get("zones", { params: { page: 1, page_size: 300 } }),
      ]);

      setWorkers(Array.isArray(workersRes.data?.results) ? workersRes.data.results : []);
      setZones(Array.isArray(zonesRes.data?.results) ? zonesRes.data.results : []);
    } catch (e) {
      const msg = handleApiError(e, "No se pudieron cargar trabajadores o zonas.");
      showSnackbar(msg, "error");
    } finally {
      setLoading(false);
    }
  }, [api, showSnackbar]);

  const fetchRouteData = useCallback(async () => {
    if (!isEdit || !routeId) return;
    try {
      setLoading(true);
      const [routeRes, zoneConfigRes] = await Promise.all([
        api().get(`routes/${encodeURIComponent(routeId)}/`),
        api().get(`routes/${encodeURIComponent(routeId)}/zone-config/`),
      ]);
      const route = routeRes.data || {};
      const zoneDays = zoneConfigRes.data?.zone_days || [];

      setFormData({
        name: route.name || "",
        start_date: route.start_date || "",
        end_date: route.end_date || "",
        week_start: String(route.week_start ?? 0),
        week_end: String(route.week_end ?? 6),
        worker: route.worker ? String(route.worker) : "",
      });
      setZoneConfig(normalizeZoneConfig(zoneDays));
    } catch (e) {
      const msg = handleApiError(e, "No se pudo cargar la ruta.");
      showSnackbar(msg, "error");
      navigate("/routes");
    } finally {
      setLoading(false);
    }
  }, [api, isEdit, navigate, routeId, showSnackbar]);

  useEffect(() => {
    fetchBaseData();
  }, [fetchBaseData]);

  useEffect(() => {
    fetchRouteData();
  }, [fetchRouteData]);

  const operationalWeekdays = useMemo(
    () => getOperationalWeekdays(formData.week_start, formData.week_end),
    [formData.week_start, formData.week_end]
  );

  const toggleZoneForWeekday = (weekday, zoneId) => {
    setZoneConfig((prev) => {
      const current = Array.isArray(prev[weekday]) ? prev[weekday] : [];
      const exists = current.includes(zoneId);
      return {
        ...prev,
        [weekday]: exists ? current.filter((id) => id !== zoneId) : [...current, zoneId],
      };
    });
  };

  const buildZoneDaysPayload = () => {
    const payload = [];
    operationalWeekdays.forEach((day) => {
      const zoneIds = Array.isArray(zoneConfig[day.value]) ? zoneConfig[day.value] : [];
      if (zoneIds.length > 0) {
        payload.push({ weekday: day.value, zones: zoneIds });
      }
    });
    return payload;
  };

  const resolveCreatedRouteId = (responseData) => {
    const rawId = responseData?.id ?? responseData?.route?.id ?? null;
    const parsedId = Number(rawId);
    return Number.isInteger(parsedId) && parsedId > 0 ? parsedId : null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      showSnackbar("El nombre de ruta es obligatorio.", "error");
      return;
    }
    if (!formData.start_date) {
      showSnackbar("La fecha de inicio es obligatoria.", "error");
      return;
    }
    if (!formData.worker) {
      showSnackbar("Debes seleccionar un trabajador para la ruta.", "error");
      return;
    }

    try {
      setSubmitting(true);
      const payload = {
        name: formData.name.trim(),
        worker: Number(formData.worker),
        start_date: formData.start_date,
        end_date: formData.end_date || null,
        week_start: Number(formData.week_start),
        week_end: Number(formData.week_end),
      };

      let targetRouteId = routeId;
      if (isEdit && routeId) {
        await api().put(`routes/${encodeURIComponent(routeId)}/`, payload);
      } else {
        const created = await api().post("routes/", payload);
        targetRouteId = resolveCreatedRouteId(created.data);
      }

      if (!targetRouteId) {
        throw new Error("No se recibio id de ruta.");
      }

      await api().put(`routes/${encodeURIComponent(targetRouteId)}/zone-config/`, {
        zone_days: buildZoneDaysPayload(),
      });

      showSnackbar(isEdit ? "Ruta actualizada correctamente." : "Ruta creada correctamente.", "success");
      navigate(`/routes/${targetRouteId}`);
    } catch (e) {
      const msg = handleApiError(e, "No se pudo guardar la ruta.");
      showSnackbar(msg, "error");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start gap-3 sm:items-center sm:gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate("/routes")} className="flex-shrink-0 mt-1 sm:mt-0">
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div className="min-w-0 flex-1">
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-foreground flex flex-wrap items-center gap-2 lg:gap-3 leading-tight">
            <Route className="w-6 h-6 sm:w-7 sm:h-7 lg:w-8 lg:h-8 text-primary flex-shrink-0" />
            <span>{isEdit ? "Editar Ruta" : "Crear Ruta"}</span>
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground mt-1 text-left">
            {isEdit ? "Actualiza la configuracion de la ruta y sus zonas por dia." : "Configura una nueva ruta con un trabajador y zonas por dia."}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CalendarDays className="w-5 h-5 text-primary" />
              Datos de la Ruta
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 gap-4 max-w-xl mx-auto w-full">
              <div className="space-y-2">
                <Label htmlFor="route_name">Nombre *</Label>
                <Input
                  id="route_name"
                  value={formData.name}
                  onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                  placeholder="Ej: Ruta Centro"
                  disabled={loading || submitting}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="start_date">Fecha inicio *</Label>
                <Input
                  id="start_date"
                  type="date"
                  value={formData.start_date}
                  onChange={(e) => setFormData((prev) => ({ ...prev, start_date: e.target.value }))}
                  disabled={loading || submitting}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="end_date">Fecha fin</Label>
                <Input
                  id="end_date"
                  type="date"
                  value={formData.end_date}
                  onChange={(e) => setFormData((prev) => ({ ...prev, end_date: e.target.value }))}
                  disabled={loading || submitting}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Dia inicio semana operativa</Label>
                <Select
                  value={formData.week_start}
                  onValueChange={(value) => setFormData((prev) => ({ ...prev, week_start: value }))}
                  disabled={loading || submitting}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona dia de inicio" />
                  </SelectTrigger>
                  <SelectContent>
                    {WEEKDAYS.map((day) => (
                      <SelectItem key={day.value} value={String(day.value)}>
                        {day.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Dia fin semana operativa</Label>
                <Select
                  value={formData.week_end}
                  onValueChange={(value) => setFormData((prev) => ({ ...prev, week_end: value }))}
                  disabled={loading || submitting}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona dia de fin" />
                  </SelectTrigger>
                  <SelectContent>
                    {WEEKDAYS.map((day) => (
                      <SelectItem key={day.value} value={String(day.value)}>
                        {day.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5 text-primary" />
              Trabajador Asignado
            </CardTitle>
          </CardHeader>
          <CardContent>
            {workers.length === 0 ? (
              <p className="text-sm text-muted-foreground text-left">No hay trabajadores disponibles.</p>
            ) : (
              <div className="space-y-2">
                <Label htmlFor="route_worker">Trabajador</Label>
                <Select
                  value={formData.worker}
                  onValueChange={(value) => setFormData((prev) => ({ ...prev, worker: value }))}
                  disabled={loading || submitting}
                >
                  <SelectTrigger id="route_worker">
                    <SelectValue placeholder="Selecciona trabajador" />
                  </SelectTrigger>
                  <SelectContent>
                    {workers.map((worker) => {
                      const workerLabel = `${worker.name || ""} ${worker.surname || ""}`.trim() || worker.username || `Trabajador ${worker.id}`;
                      return (
                        <SelectItem key={worker.id} value={String(worker.id)}>
                          {workerLabel}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="w-5 h-5 text-primary" />
              Zonas por dia
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {zones.length === 0 ? (
              <p className="text-sm text-muted-foreground text-left">No hay zonas disponibles para asignar.</p>
            ) : (
              operationalWeekdays.map((day) => (
                <div key={day.value} className="border rounded-lg p-3">
                  <p className="font-medium text-left mb-2">{day.label}</p>
                  <div className="flex flex-wrap gap-2">
                    {zones.map((zone) => {
                      const selected = (zoneConfig[day.value] || []).includes(zone.id);
                      return (
                        <Badge
                          key={`${day.value}-${zone.id}`}
                          variant={selected ? "default" : "outline"}
                          className="cursor-pointer"
                          onClick={() => toggleZoneForWeekday(day.value, zone.id)}
                        >
                          {normalizeZoneName(zone.name)}
                        </Badge>
                      );
                    })}
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 pt-2">
          <Button type="button" variant="outline" onClick={() => navigate("/routes")} className="flex-1 order-2 sm:order-1 h-10 sm:h-9">
            Cancelar
          </Button>
          <Button type="submit" disabled={loading || submitting} className="flex-1 order-1 sm:order-2 gap-2 h-10 sm:h-9">
            <Save className="w-4 h-4 flex-shrink-0" />
            <span>{submitting ? "Guardando..." : isEdit ? "Actualizar Ruta" : "Crear Ruta"}</span>
          </Button>
        </div>
      </form>
    </div>
  );
}
