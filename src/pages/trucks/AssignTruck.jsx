import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ActionButton } from "@/components/common/ActionButton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ArrowLeft, Truck, Plus, AlertTriangle } from "lucide-react";
import { useAuth } from "@/context/AuthProvider";
import { handleApiError } from "@/components/Utils";

export default function AssignTruck() {
  const navigate = useNavigate();
  const { id: workerId } = useParams();
  const { toast } = useToast();
  const { api } = useAuth();

  const [selectedTruck, setSelectedTruck] = useState("");
  const [loading, setLoading] = useState({ list: false, assign: false, create: false, worker: false });
  const [trucks, setTrucks] = useState([]);
  const [showReassignDialog, setShowReassignDialog] = useState(false);
  const [showCreateWarningDialog, setShowCreateWarningDialog] = useState(false);
  const [workerInfo, setWorkerInfo] = useState(null);

  const [newTruck, setNewTruck] = useState({
    registration_number: "",
    brand: "",
    model: "",
    year: "",
    capacity: "",
    fuel: "",
  });

  useEffect(() => {
    const fetchTrucks = async () => {
      setLoading((p) => ({ ...p, list: true }));
      try {
        const res = await api().get("/trucks/");
        const data = Array.isArray(res.data?.results) ? res.data.results : (res.data || []);
        setTrucks(data);
      } catch (err) {
        const msg = handleApiError(err, "No se pudieron cargar los camiones.");
        toast({ title: "Error", description: msg, variant: "destructive" });
      } finally {
        setLoading((p) => ({ ...p, list: false }));
      }
    };
    fetchTrucks();
  }, [api, toast]);

  useEffect(() => {
    const fetchWorkerInfo = async () => {
      if (!workerId) return;
      setLoading((p) => ({ ...p, worker: true }));
      try {
        const res = await api().get(`/workers/${workerId}/`);
        setWorkerInfo(res.data);
      } catch (err) {
        const msg = handleApiError(err, "No se pudo cargar la información del trabajador.");
        toast({ title: "Error", description: msg, variant: "destructive" });
      } finally {
        setLoading((p) => ({ ...p, worker: false }));
      }
    };
    fetchWorkerInfo();
  }, [workerId, api, toast]);

  const allTrucks = useMemo(() => {
    return trucks.filter((truck) => {
      const isAssignedToCurrentWorker = 
        String(truck.driver_id) === String(workerId) ||
        String(truck.worker_id) === String(workerId);
      return !isAssignedToCurrentWorker;
    });
  }, [trucks, workerId]);

  const workerHasAssignedTruck = useMemo(() => {
    return trucks.some((truck) => 
      String(truck.driver_id) === String(workerId) ||
      String(truck.worker_id) === String(workerId)
    );
  }, [trucks, workerId]);

  const workerCurrentTruck = useMemo(() => {
    return trucks.find((truck) => 
      String(truck.driver_id) === String(workerId) ||
      String(truck.worker_id) === String(workerId)
    );
  }, [trucks, workerId]);

  const selectedTruckObj = selectedTruck
    ? allTrucks.find((t) => String(t.id) === String(selectedTruck))
    : null;

  const isAssigned = !!(
    selectedTruckObj &&
    (selectedTruckObj.worker ||
      selectedTruckObj.driver ||
      selectedTruckObj.worker_id != null ||
      selectedTruckObj.driver_id != null)
  );

  const handleAssignClick = () => {
    if (!selectedTruck) {
      toast({ title: "Error", description: "Por favor selecciona un camión", variant: "destructive" });
      return;
    }

    if (isAssigned) {
      setShowReassignDialog(true);
    } else {
      performAssignment(false);
    }
  };

  const performAssignment = async (force) => {
    setLoading((p) => ({ ...p, assign: true }));
    try {
      await api().post(`/trucks/assign-driver/${workerId}/`, {
        truck_id: Number(selectedTruck),
        force,
      });

      toast({ title: "¡Camión asignado!", description: "Asignación realizada correctamente." });
      navigate("/workers");
    } catch (error) {
      const already =
        error?.response?.status === 400 &&
        (error?.response?.data?.DETAILS?.ALREADY_HAVE_DRIVER || error?.response?.data?.details?.ALREADY_HAVE_DRIVER);

      const description = already
        ? "Este camión ya tiene conductor. Confirma la reasignación para continuar."
        : handleApiError(error, "No se pudo asignar el camión.");
      toast({ title: "Error", description, variant: "destructive" });
    } finally {
      setLoading((p) => ({ ...p, assign: false }));
    }
  };

  const handleCreateAndAssign = async () => {
    if (!newTruck.registration_number) {
      toast({ title: "Error", description: "La matrícula es obligatoria", variant: "destructive" });
      return;
    }

    if (workerHasAssignedTruck) {
      setShowCreateWarningDialog(true);
      return;
    }

    performCreateAndAssign();
  };

  const performCreateAndAssign = async () => {
    setLoading((p) => ({ ...p, create: true }));
    try {
      const payload = {
        registration_number: newTruck.registration_number,
        brand: newTruck.brand || null,
        model: newTruck.model || null,
        year: newTruck.year ? Number(newTruck.year) : null,
        capacity: newTruck.capacity ? Number(newTruck.capacity) : null,
        fuel: newTruck.fuel || null,
        driver: workerId ? Number(workerId) : null,
        company: workerInfo?.company || null,
      };
      const createRes = await api().post("/trucks/", payload);
      const createdTruckId = createRes?.data?.id;

      toast({
        title: "¡Camión creado y asignado!",
        description: `Nuevo camión ${newTruck.registration_number} registrado y asignado.`,
      });
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

  return (
    <div className="space-y-4 sm:space-y-6 p-3 sm:p-4 lg:p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate("/workers")}
          className="flex-shrink-0"
        >
          <ArrowLeft className="w-4 h-4" />
        </Button>

        <div className="w-full sm:w-auto">
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-foreground flex items-center gap-2 sm:gap-3">
            <Truck className="w-5 h-5 sm:w-6 sm:h-6 lg:w-8 lg:h-8 text-primary" />
            Asignar Camión
          </h1>
          <p className="text-xs sm:text-sm lg:text-base text-muted-foreground mt-1">
            {loading.worker ? (
              "Cargando información..."
            ) : (
              "Asigna un camión existente o crea uno nuevo"
            )}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4 lg:gap-6">
        {/* Info del Trabajador */}
        {workerInfo && (
          <Card className="lg:col-span-2">
            <CardHeader className="pb-2 sm:pb-3">
              <CardTitle className="text-sm sm:text-base lg:text-lg">Información del Trabajador</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3 text-xs sm:text-sm">
                <div>
                  <p className="text-muted-foreground text-xs sm:text-sm">Nombre</p>
                  <p className="font-medium">{workerInfo.name}</p>
                </div>
                {workerInfo.phone && (
                  <div>
                    <p className="text-muted-foreground text-xs sm:text-sm">Teléfono</p>
                    <p className="font-medium">{workerInfo.phone}</p>
                  </div>
                )}
                {workerInfo.email && (
                  <div>
                    <p className="text-muted-foreground text-xs sm:text-sm">Email</p>
                    <p className="font-medium truncate" title={workerInfo.email}>{workerInfo.email}</p>
                  </div>
                )}
                {workerInfo.dni && (
                  <div>
                    <p className="text-muted-foreground text-xs sm:text-sm">DNI</p>
                    <p className="font-medium">{workerInfo.dni}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Asignar Camión Existente */}
        <Card>
          <CardHeader className="space-y-1 pb-3 sm:pb-4">
            <CardTitle className="flex items-center gap-2 text-base sm:text-lg lg:text-xl">
              <Truck className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
              Asignar Camión Existente
            </CardTitle>
            <CardDescription className="text-left text-xs sm:text-sm">
              Selecciona un camión de la flota
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 sm:space-y-4">
            <div className="space-y-1.5 sm:space-y-2">
              <Label htmlFor="truck-select" className="text-xs sm:text-sm">Camión</Label>
              <Select value={selectedTruck} onValueChange={setSelectedTruck} disabled={loading.list}>
                <SelectTrigger className="w-full text-xs sm:text-sm">
                  <SelectValue placeholder={loading.list ? "Cargando camiones..." : "Selecciona un camión..."} />
                </SelectTrigger>
                <SelectContent>
                  {allTrucks.map((truck) => {
                    const assigned =
                      truck.worker || truck.driver || truck.worker_id != null || truck.driver_id != null;
                    return (
                      <SelectItem key={truck.id} value={String(truck.id)}>
                        <span className="text-xs sm:text-sm">
                          {truck.registration_number || truck.registration} - {truck.brand} {truck.model}{" "}
                          {truck.year ? `(${truck.year})` : ""} {assigned ? " • ASIGNADO" : ""}
                        </span>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>

            {selectedTruckObj && (
              <div className="p-2.5 sm:p-3 lg:p-4 rounded-lg border bg-background">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-1.5 sm:gap-2">
                  <h4 className="font-medium text-xs sm:text-sm lg:text-base">Detalles del Camión</h4>
                  {isAssigned && (
                    <span className="inline-flex items-center gap-1 text-[10px] sm:text-xs px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-md bg-destructive/10 text-destructive">
                      <AlertTriangle className="w-3 h-3 sm:w-4 sm:h-4" />
                      Ya asignado
                    </span>
                  )}
                </div>

                <div className="mt-2 sm:mt-3 space-y-1 sm:space-y-1.5 text-[11px] sm:text-xs lg:text-sm text-muted-foreground">
                  <p>
                    <span className="font-medium text-foreground">Matrícula:</span>{" "}
                    {selectedTruckObj.registration || selectedTruckObj.registration_number}
                  </p>
                  <p>
                    <span className="font-medium text-foreground">Modelo:</span> {selectedTruckObj.model}
                  </p>
                  {selectedTruckObj.capacity != null && (
                    <p>
                      <span className="font-medium text-foreground">Capacidad:</span> {selectedTruckObj.capacity}L
                    </p>
                  )}
                  {selectedTruckObj.year && (
                    <p>
                      <span className="font-medium text-foreground">Año:</span> {selectedTruckObj.year}
                    </p>
                  )}
                  {isAssigned && (
                    <p className="mt-1.5 sm:mt-2">
                      <span className="font-medium text-foreground">Asignado a:</span>{" "}
                      {selectedTruckObj.driver_name || 
                        `ID: ${selectedTruckObj.driver_id}`}
                    </p>
                  )}
                </div>

                {isAssigned && (
                  <div className="mt-2 sm:mt-3 text-[10px] sm:text-xs lg:text-sm rounded-md p-2 sm:p-2.5 lg:p-3 bg-destructive/10 text-destructive">
                    Este camión ya está asignado. Al continuar, se reasignará al trabajador actual.
                  </div>
                )}
              </div>
            )}

            <ActionButton
              className="w-full text-xs sm:text-sm lg:text-base"
              onClick={handleAssignClick}
              disabled={!selectedTruck || loading.assign}
            >
              {loading.assign ? "Asignando..." : isAssigned ? "Reasignar Camión" : "Asignar Camión Seleccionado"}
            </ActionButton>
          </CardContent>
        </Card>

        {/* Crear Nuevo Camión */}
        <Card>
          <CardHeader className="space-y-1 pb-3 sm:pb-4">
            <CardTitle className="flex items-center gap-2 text-base sm:text-lg lg:text-xl">
              <Plus className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
              Crear Nuevo Camión
            </CardTitle>
            <CardDescription className="text-left text-xs sm:text-sm">
              Registra un nuevo camión y asígnalo al trabajador
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 sm:space-y-4">
            <div className="grid grid-cols-1 gap-2.5 sm:gap-3 lg:gap-4">
              <div className="space-y-1.5 sm:space-y-2">
                <Label htmlFor="registration_number" className="text-xs sm:text-sm">Matrícula *</Label>
                <Input
                  id="registration_number"
                  placeholder="Ej: 1234-ABC"
                  value={newTruck.registration_number}
                  onChange={(e) => handleInputChange("registration_number", e.target.value)}
                  className="text-xs sm:text-sm h-8 sm:h-9 lg:h-10"
                />
              </div>

              <div className="grid grid-cols-2 gap-2 sm:gap-2.5 lg:gap-3">
                <div className="space-y-1.5 sm:space-y-2">
                  <Label htmlFor="brand" className="text-xs sm:text-sm">Marca</Label>
                  <Input
                    id="brand"
                    placeholder="Ej: Volvo"
                    value={newTruck.brand}
                    onChange={(e) => handleInputChange("brand", e.target.value)}
                    className="text-xs sm:text-sm h-8 sm:h-9 lg:h-10"
                  />
                </div>

                <div className="space-y-1.5 sm:space-y-2">
                  <Label htmlFor="model" className="text-xs sm:text-sm">Modelo</Label>
                  <Input
                    id="model"
                    placeholder="Ej: FH16"
                    value={newTruck.model}
                    onChange={(e) => handleInputChange("model", e.target.value)}
                    className="text-xs sm:text-sm h-8 sm:h-9 lg:h-10"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 sm:gap-2.5 lg:gap-3">
                <div className="space-y-1.5 sm:space-y-2">
                  <Label htmlFor="year" className="text-xs sm:text-sm">Año</Label>
                  <Input
                    id="year"
                    type="number"
                    placeholder="2023"
                    min="1990"
                    max="2035"
                    value={newTruck.year}
                    onChange={(e) => handleInputChange("year", e.target.value)}
                    className="text-xs sm:text-sm h-8 sm:h-9 lg:h-10"
                  />
                </div>

                <div className="space-y-1.5 sm:space-y-2">
                  <Label htmlFor="capacity" className="text-xs sm:text-sm">Capacidad (L)</Label>
                  <Input
                    id="capacity"
                    type="number"
                    placeholder="25000"
                    min="0"
                    step="0.01"
                    value={newTruck.capacity}
                    onChange={(e) => handleInputChange("capacity", e.target.value)}
                    className="text-xs sm:text-sm h-8 sm:h-9 lg:h-10"
                  />
                </div>
              </div>

              <div className="space-y-1.5 sm:space-y-2">
                <Label htmlFor="fuel" className="text-xs sm:text-sm">Combustible</Label>
                <Select value={newTruck.fuel} onValueChange={(value) => handleInputChange("fuel", value)}>
                  <SelectTrigger className="w-full text-xs sm:text-sm h-8 sm:h-9 lg:h-10">
                    <SelectValue placeholder="Selecciona tipo de combustible..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="DIESEL">Diesel</SelectItem>
                    <SelectItem value="PETROL">Gasolina</SelectItem>
                    <SelectItem value="ELECTRIC">Eléctrico</SelectItem>
                    <SelectItem value="HYBRID">Híbrido</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <ActionButton
              className="w-full text-xs sm:text-sm lg:text-base"
              onClick={handleCreateAndAssign}
              disabled={!newTruck.registration_number || loading.create}
            >
              {loading.create ? "Creando..." : "Crear y Asignar Camión"}
            </ActionButton>
          </CardContent>
        </Card>
      </div>

      {/* Modal de Confirmación de Reasignación */}
      <AlertDialog open={showReassignDialog} onOpenChange={setShowReassignDialog}>
        <AlertDialogContent className="max-w-[95vw] sm:max-w-lg lg:max-w-xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-base sm:text-lg lg:text-xl">
              <AlertTriangle className="w-4 h-4 sm:w-5 sm:h-5 text-destructive flex-shrink-0" />
              Confirmar Reasignación
            </AlertDialogTitle>
            <AlertDialogDescription className="text-left space-y-2 sm:space-y-3 text-xs sm:text-sm lg:text-base">
              <p>
                Este camión ya está asignado a{" "}
                <span className="font-semibold text-foreground">
                  {selectedTruckObj?.driver_name || 
                    `ID: ${selectedTruckObj?.driver_id}`}
                </span>
              </p>
              <p>
                ¿Estás seguro de que quieres reasignarlo a{" "}
                <span className="font-semibold text-foreground">{workerInfo?.name || "este trabajador"}</span>?
              </p>
              <div className="p-2.5 sm:p-3 lg:p-4 rounded-md bg-destructive/10 text-destructive text-[11px] sm:text-xs lg:text-sm">
                <p className="font-medium">⚠️ Importante:</p>
                <p className="mt-1">
                  La asignación anterior se eliminará y el camión quedará vinculado al nuevo trabajador.
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col sm:flex-row gap-2">
            <AlertDialogCancel className="w-full sm:w-auto text-xs sm:text-sm">
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setShowReassignDialog(false);
                performAssignment(true);
              }}
              className="w-full sm:w-auto bg-destructive hover:bg-destructive/90 text-xs sm:text-sm"
            >
              Sí, Reasignar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Modal de Advertencia al Crear Camión */}
      <AlertDialog open={showCreateWarningDialog} onOpenChange={setShowCreateWarningDialog}>
        <AlertDialogContent className="max-w-[95vw] sm:max-w-lg lg:max-w-xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-base sm:text-lg lg:text-xl">
              <AlertTriangle className="w-4 h-4 sm:w-5 sm:h-5 text-destructive flex-shrink-0" />
              Este Trabajador Ya Tiene un Camión Asignado
            </AlertDialogTitle>
            <AlertDialogDescription className="text-left space-y-2 sm:space-y-3 text-xs sm:text-sm lg:text-base">
              <p>
                <span className="font-semibold text-foreground">{workerInfo?.name}</span> ya tiene asignado el camión:
              </p>
              
              {workerCurrentTruck && (
                <div className="p-2.5 sm:p-3 rounded-lg border bg-background">
                  <div className="space-y-1 text-xs sm:text-sm">
                    <p>
                      <span className="font-medium text-foreground">Matrícula:</span>{" "}
                      {workerCurrentTruck.registration_number || workerCurrentTruck.registration}
                    </p>
                    {workerCurrentTruck.brand && (
                      <p>
                        <span className="font-medium text-foreground">Marca:</span> {workerCurrentTruck.brand}
                      </p>
                    )}
                    {workerCurrentTruck.model && (
                      <p>
                        <span className="font-medium text-foreground">Modelo:</span> {workerCurrentTruck.model}
                      </p>
                    )}
                  </div>
                </div>
              )}

              <p>
                ¿Deseas crear el nuevo camión <span className="font-semibold text-foreground">{newTruck.registration_number}</span> y reasignarlo a este trabajador?
              </p>
              
              <div className="p-2.5 sm:p-3 lg:p-4 rounded-md bg-destructive/10 text-destructive text-[11px] sm:text-xs lg:text-sm">
                <p className="font-medium">⚠️ Importante:</p>
                <p className="mt-1">
                  El camión anterior quedará sin asignar y el nuevo camión será asignado al trabajador.
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col sm:flex-row gap-2">
            <AlertDialogCancel className="w-full sm:w-auto text-xs sm:text-sm">
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setShowCreateWarningDialog(false);
                performCreateAndAssign();
              }}
              className="w-full sm:w-auto bg-destructive hover:bg-destructive/90 text-xs sm:text-sm"
            >
              Sí, Crear y Reasignar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}