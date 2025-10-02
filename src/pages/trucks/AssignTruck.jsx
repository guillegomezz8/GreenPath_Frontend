import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ActionButton } from "@/components/common/ActionButton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Truck, Plus } from "lucide-react";
import { useAuth } from "@/context/AuthProvider";
import { handleApiError } from "@/components/Utils";

export default function AssignTruck() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { toast } = useToast();
  const { api } = useAuth();

  const [selectedTruck, setSelectedTruck] = useState("");
  const [loading, setLoading] = useState({ list: false, assign: false, create: false });
  const [trucks, setTrucks] = useState([]);

  const [newTruck, setNewTruck] = useState({
    registration: "",
    model: "",
    year: "",
    capacity: "",
    observations: "",
  });

  useEffect(() => {
    const fetchTrucks = async () => {
      setLoading((p) => ({ ...p, list: true }));
      try {
        const res = await api().get("/trucks/");
        const data = Array.isArray(res.data?.results) ? res.data.results : (res.data || []);
        setTrucks(data);
      } catch (err) {
        try {
          const resAll = await api().get("/trucks/");
          const all = Array.isArray(resAll.data?.results) ? resAll.data.results : (resAll.data || []);
          const free = all.filter((t) => !t.worker && !t.driver && (t.worker_id == null) && (t.driver_id == null));
          setTrucks(free);
        } catch (err2) {
          const msg = handleApiError(err2, "No se pudieron cargar los camiones.");
          toast({ title: "Error", description: msg, variant: "destructive" });
        }
      } finally {
        setLoading((p) => ({ ...p, list: false }));
      }
    };
    fetchTrucks();
  }, [api, toast]);

  const availableTrucks = useMemo(() => {
    // Si el endpoint ya devuelve disponibles, no filtramos más; si no, garantizamos que no estén asignados
    return trucks.filter((t) => !t.worker && !t.driver && (t.worker_id == null) && (t.driver_id == null));
  }, [trucks]);

  const handleAssignExisting = async () => {
    if (!selectedTruck) {
      toast({ title: "Error", description: "Por favor selecciona un camión", variant: "destructive" });
      return;
    }
    setLoading((p) => ({ ...p, assign: true }));
    try {
      // Ajusta la clave "worker" si tu backend espera "driver" o "driver_id"
      await api().patch(`/trucks/${selectedTruck}/`, { worker: id });
      toast({ title: "¡Camión asignado!", description: "Asignación realizada correctamente." });
      navigate("/workers");
    } catch (error) {
      const msg = handleApiError(error, "No se pudo asignar el camión.");
      toast({ title: "Error", description: msg, variant: "destructive" });
    } finally {
      setLoading((p) => ({ ...p, assign: false }));
    }
  };

  const handleCreateAndAssign = async () => {
    if (!newTruck.registration || !newTruck.model) {
      toast({ title: "Error", description: "Matrícula y modelo son obligatorios", variant: "destructive" });
      return;
    }
    setLoading((p) => ({ ...p, create: true }));
    try {
      const payload = {
        registration: newTruck.registration,
        model: newTruck.model,
        year: newTruck.year ? Number(newTruck.year) : null,
        capacity: newTruck.capacity ? Number(newTruck.capacity) : null,
        observations: newTruck.observations || "",
        // Ajusta la clave "worker" si tu backend espera "driver" o "driver_id"
        worker: id,
      };
      await api().post("/trucks/", payload);
      toast({ title: "¡Camión creado y asignado!", description: `Nuevo camión ${newTruck.registration} registrado.` });
      navigate("/workers");
    } catch (error) {
      const msg = handleApiError(error, "No se pudo crear/asignar el camión.");
      toast({ title: "Error", description: msg, variant: "destructive" });
    } finally {
      setLoading((p) => ({ ...p, create: false }));
    }
  };

  const handleInputChange = (field, value) => {
    setNewTruck((prev) => ({ ...prev, [field]: value }));
  };

  const selectedTruckObj = selectedTruck ? availableTrucks.find((t) => String(t.id) === String(selectedTruck)) : null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
            <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => navigate("/workers")}
            className="flex-shrink-0 mt-2 sm:mt-0"
            >
            <ArrowLeft className="w-4 h-4" />
            </Button>

        <div>
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
            <Truck className="w-8 h-8 text-primary" />
            Asignar Camión
          </h1>
          <p className="text-muted-foreground">Asigna un camión existente o crea uno nuevo</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Asignar Camión Existente */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Truck className="w-5 h-5 text-primary" />
              Asignar Camión Existente
            </CardTitle>
            <CardDescription className="text-left">Selecciona un camión disponible de la flota</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="truck-select">Camión Disponible</Label>
              <Select value={selectedTruck} onValueChange={setSelectedTruck} disabled={loading.list}>
                <SelectTrigger>
                  <SelectValue placeholder={loading.list ? "Cargando camiones..." : "Selecciona un camión..."} />
                </SelectTrigger>
                <SelectContent>
                  {availableTrucks.map((truck) => (
                    <SelectItem key={truck.id} value={String(truck.id)}>
                      {truck.registration_number} - {truck.brand} {truck.model} {truck.year ? `(${truck.year})` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedTruckObj && (
              <div className="p-3 bg-accent rounded-lg">
                <h4 className="font-medium text-accent-foreground">Detalles del Camión</h4>
                <div className="mt-2 space-y-1 text-sm text-muted-foreground">
                  <p>
                    <span className="font-medium">Matrícula:</span> {selectedTruckObj.registration}
                  </p>
                  <p>
                    <span className="font-medium">Modelo:</span> {selectedTruckObj.model}
                  </p>
                  {selectedTruckObj.capacity != null && (
                    <p>
                      <span className="font-medium">Capacidad:</span> {selectedTruckObj.capacity}L
                    </p>
                  )}
                  {selectedTruckObj.year && (
                    <p>
                      <span className="font-medium">Año:</span> {selectedTruckObj.year}
                    </p>
                  )}
                </div>
              </div>
            )}

            <ActionButton
              className="w-full"
              onClick={handleAssignExisting}
              disabled={!selectedTruck || loading.assign}
            >
              {loading.assign ? "Asignando..." : "Asignar Camión Seleccionado"}
            </ActionButton>
          </CardContent>
        </Card>

        {/* Crear Nuevo Camión */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Plus className="w-5 h-5 text-primary" />
              Crear Nuevo Camión
            </CardTitle>
            <CardDescription className="text-left">Registra un nuevo camión y asígnalo al trabajador</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 gap-4">
              <div className="space-y-2">
                <Label htmlFor="registration">Matrícula *</Label>
                <Input
                  id="registration"
                  placeholder="Ej: ABC-123"
                  value={newTruck.registration}
                  onChange={(e) => handleInputChange("registration", e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="model">Modelo *</Label>
                <Input
                  id="model"
                  placeholder="Ej: Volvo FH16"
                  value={newTruck.model}
                  onChange={(e) => handleInputChange("model", e.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-2">
                  <Label htmlFor="year">Año</Label>
                  <Input
                    id="year"
                    type="number"
                    placeholder="2023"
                    min="1990"
                    max="2035"
                    value={newTruck.year}
                    onChange={(e) => handleInputChange("year", e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="capacity">Capacidad (L)</Label>
                  <Input
                    id="capacity"
                    type="number"
                    placeholder="25000"
                    min="1"
                    value={newTruck.capacity}
                    onChange={(e) => handleInputChange("capacity", e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="observations">Observaciones</Label>
                <Textarea
                  id="observations"
                  placeholder="Información adicional del camión..."
                  rows={3}
                  value={newTruck.observations}
                  onChange={(e) => handleInputChange("observations", e.target.value)}
                />
              </div>
            </div>

            <ActionButton
              className="w-full"
              onClick={handleCreateAndAssign}
              disabled={!newTruck.registration || !newTruck.model || loading.create}
            >
              {loading.create ? "Creando..." : "Crear y Asignar Camión"}
            </ActionButton>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
