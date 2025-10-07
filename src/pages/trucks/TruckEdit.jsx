import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/context/AuthProvider";
import { handleApiError } from "@/components/Utils";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { ArrowLeft, Truck, SquarePen, Save  } from "lucide-react";
import { ActionButton } from "@/components/common/ActionButton";

export default function TruckEdit() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { toast } = useToast();
  const { api, user } = useAuth();

  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [truck, setTruck] = useState({
    registration_number: "",
    brand: "",
    model: "",
    year: "",
    capacity: "",
    fuel: "",
    status: "",
  });

  const handleInputChange = (field, value) => {
    setTruck((prev) => ({ ...prev, [field]: value }));
  };

  const fetchTruck = async () => {
    try {
      setFetching(true);
      const { data } = await api().get(`/trucks/${id}/`);
      setTruck({
        registration_number: data?.registration_number ?? "",
        brand: data?.brand ?? "",
        model: data?.model ?? "",
        year: data?.year ?? "",
        capacity: data?.capacity ?? "",
        fuel: data?.fuel ?? "",
        status: data?.status ?? "",
      });
    } catch (err) {
      const msg = handleApiError(err, "Error al obtener los datos del camión.");
      toast({ title: "Error", description: msg, variant: "destructive" });
      navigate("/trucks");
    } finally {
      setFetching(false);
    }
  };

  useEffect(() => {
    if (!id) {
      toast({
        title: "Error",
        description: "No se encontró el ID del camión.",
        variant: "destructive",
      });
      navigate("/trucks");
      return;
    }
    fetchTruck();
  }, [id]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!truck.registration_number.trim()) {
      toast({
        title: "Error",
        description: "La matrícula es obligatoria.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const payload = {
        registration_number: truck.registration_number.trim(),
        brand: truck.brand || null,
        model: truck.model || null,
        year: truck.year ? Number(truck.year) : null,
        capacity: truck.capacity ? Number(truck.capacity) : null,
        fuel: truck.fuel || null,
        company: user?.company?.id || null,
        status: truck.status || "ACTIVE",
      };

      await api().put(`/trucks/${id}/`, payload);
      toast({
        title: "Camión actualizado",
        description: "Los datos del camión se han guardado correctamente.",
      });
      navigate("/trucks");
    } catch (err) {
      const msg = handleApiError(err, "No se pudo actualizar el camión.");
      toast({ title: "Error", description: msg, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start gap-3 sm:items-center sm:gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate("/trucks")}
          className="flex-shrink-0 mt-1 sm:mt-0"
        >
          <ArrowLeft className="w-4 h-4" />
        </Button>

        <div className="min-w-0 flex-1">
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-foreground flex items-center gap-2 lg:gap-3 leading-tight">
            <Truck className="w-6 h-6 sm:w-7 sm:h-7 lg:w-8 lg:h-8 text-primary" />
            Editar Camión
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground mt-1 leading-relaxed text-left">
            Modifica la información del camión
          </p>
        </div>
      </div>

      {/* Formulario */}
      <Card>
        <CardHeader className="space-y-1 pb-3 sm:pb-4 text-left">
          <CardTitle className="flex items-center gap-2">
            <SquarePen className="w-5 h-5 text-primary" />
            Información del Camión
          </CardTitle>
        </CardHeader>

        <CardContent className="space-y-3 sm:space-y-4">
          <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4">
            {/* Matrícula */}
            <div className="space-y-1.5 sm:space-y-2">
              <Label htmlFor="registration_number" className="text-xs sm:text-sm">
                Matrícula *
              </Label>
              <Input
                id="registration_number"
                placeholder="Ej: 1234-ABC"
                value={truck.registration_number}
                onChange={(e) =>
                  handleInputChange("registration_number", e.target.value)
                }
                disabled={fetching}
                className="text-xs sm:text-sm h-8 sm:h-9 lg:h-10"
              />
            </div>

            {/* Marca / Modelo */}
            <div className="grid grid-cols-2 gap-2 sm:gap-3">
              <div className="space-y-1.5 sm:space-y-2">
                <Label htmlFor="brand" className="text-xs sm:text-sm">
                  Marca
                </Label>
                <Input
                  id="brand"
                  placeholder="Ej: Volvo"
                  value={truck.brand}
                  onChange={(e) => handleInputChange("brand", e.target.value)}
                  disabled={fetching}
                  className="text-xs sm:text-sm h-8 sm:h-9 lg:h-10"
                />
              </div>

              <div className="space-y-1.5 sm:space-y-2">
                <Label htmlFor="model" className="text-xs sm:text-sm">
                  Modelo
                </Label>
                <Input
                  id="model"
                  placeholder="Ej: FH16"
                  value={truck.model}
                  onChange={(e) => handleInputChange("model", e.target.value)}
                  disabled={fetching}
                  className="text-xs sm:text-sm h-8 sm:h-9 lg:h-10"
                />
              </div>
            </div>

            {/* Año / Capacidad */}
            <div className="grid grid-cols-2 gap-2 sm:gap-3">
              <div className="space-y-1.5 sm:space-y-2">
                <Label htmlFor="year" className="text-xs sm:text-sm">
                  Año
                </Label>
                <Input
                  id="year"
                  type="number"
                  placeholder="2023"
                  min="1990"
                  max="2035"
                  value={truck.year}
                  onChange={(e) => handleInputChange("year", e.target.value)}
                  disabled={fetching}
                  className="text-xs sm:text-sm h-8 sm:h-9 lg:h-10"
                />
              </div>

              <div className="space-y-1.5 sm:space-y-2">
                <Label htmlFor="capacity" className="text-xs sm:text-sm">
                  Capacidad (L)
                </Label>
                <Input
                  id="capacity"
                  type="number"
                  placeholder="25000"
                  min="0"
                  step="0.01"
                  value={truck.capacity}
                  onChange={(e) => handleInputChange("capacity", e.target.value)}
                  disabled={fetching}
                  className="text-xs sm:text-sm h-8 sm:h-9 lg:h-10"
                />
              </div>
            </div>

            {/* Combustible */}
            <div className="grid grid-cols-2 gap-2 sm:gap-3">
              <div className="space-y-1.5 sm:space-y-2">
                <Label htmlFor="fuel" className="text-xs sm:text-sm">
                    Combustible
                </Label>
                <Select
                    value={truck.fuel}
                    onValueChange={(value) => handleInputChange("fuel", value)}
                    disabled={fetching}
                >
                    <SelectTrigger className="w-full text-xs sm:text-sm h-8 sm:h-9 lg:h-10">
                    <SelectValue placeholder="Selecciona tipo de combustible..." />
                    </SelectTrigger>
                    <SelectContent>
                    <SelectItem value="DIESEL">Diésel</SelectItem>
                    <SelectItem value="PETROL">Gasolina</SelectItem>
                    <SelectItem value="ELECTRIC">Eléctrico</SelectItem>
                    <SelectItem value="HYBRID">Híbrido</SelectItem>
                    </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5 sm:space-y-2">
                <Label htmlFor="fuel" className="text-xs sm:text-sm">
                    Estado
                </Label>
                <Select
                    value={truck.status}
                    onValueChange={(value) => handleInputChange("status", value)}
                    disabled={fetching}
                >
                    <SelectTrigger className="w-full text-xs sm:text-sm h-8 sm:h-9 lg:h-10">
                    <SelectValue placeholder="Selecciona estado..." />
                    </SelectTrigger>
                    <SelectContent>
                    <SelectItem value="ACTIVE">Activo</SelectItem>
                    <SelectItem value="IN_SERVICE">En servicio</SelectItem>
                    <SelectItem value="MAINTENANCE">Mantenimiento</SelectItem>
                    <SelectItem value="OUT_OF_SERVICE">Fuera de servicio</SelectItem>
                    <SelectItem value="DECOMMISSIONED">Retirado</SelectItem>
                    </SelectContent>
                </Select>
              </div>
            </div>

            {/* Botones */}
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 pt-4 sm:pt-6">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate("/trucks")}
                className="flex-1 order-2 sm:order-1 h-10 sm:h-9"
              >
                Cancelar
              </Button>
              <ActionButton
                type="submit"
                className="flex-1 order-1 sm:order-2 h-10 sm:h-9"
                disabled={loading || fetching}
              >
                <Save className="w-4 h-4 flex-shrink-0" />
                {loading ? "Guardando..." : "Actualizar Camión"}
              </ActionButton>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
