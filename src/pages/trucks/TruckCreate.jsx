import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/context/AuthProvider";
import { handleApiError } from "@/components/Utils";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { ArrowLeft, Truck } from "lucide-react";
import { ActionButton } from "@/components/common/ActionButton";

export default function TruckCreate() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { api, user } = useAuth();

  const [loading, setLoading] = useState(false);
  const [truck, setTruck] = useState({
    registration_number: "",
    brand: "",
    model: "",
    year: "",
    capacity: "",
    fuel: "",
  });

  const handleInputChange = (field, value) => {
    setTruck((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async () => {
    if (!truck.registration_number.trim()) {
      toast({ title: "Error", description: "La matrícula es obligatoria.", variant: "destructive" });
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
      };

      await api().post("/trucks/", payload);
      toast({ title: "Camión creado", description: "El camión se ha registrado correctamente." });
      navigate("/trucks");
    } catch (err) {
      const msg = handleApiError(err, "No se pudo crear el camión.");
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
            Nuevo Camión
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground mt-1 leading-relaxed text-left">
            Registra un nuevo camión en la flota de la empresa
          </p>
        </div>
      </div>

      {/* Formulario */}
      <Card>
        <CardHeader className="space-y-1 pb-3 sm:pb-4">
          <CardTitle className="text-base sm:text-lg lg:text-xl">Datos del Camión</CardTitle>
          <CardDescription className="text-left text-xs sm:text-sm">
            Completa los campos necesarios para registrar un nuevo camión
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-3 sm:space-y-4">
          <div className="grid grid-cols-1 gap-3 sm:gap-4">
            {/* Matrícula */}
            <div className="space-y-1.5 sm:space-y-2">
              <Label htmlFor="registration_number" className="text-xs sm:text-sm">Matrícula *</Label>
              <Input
                id="registration_number"
                placeholder="Ej: 1234-ABC"
                value={truck.registration_number}
                onChange={(e) => handleInputChange("registration_number", e.target.value)}
                className="text-xs sm:text-sm h-8 sm:h-9 lg:h-10"
              />
            </div>

            {/* Marca / Modelo */}
            <div className="grid grid-cols-2 gap-2 sm:gap-3">
              <div className="space-y-1.5 sm:space-y-2">
                <Label htmlFor="brand" className="text-xs sm:text-sm">Marca</Label>
                <Input
                  id="brand"
                  placeholder="Ej: Volvo"
                  value={truck.brand}
                  onChange={(e) => handleInputChange("brand", e.target.value)}
                  className="text-xs sm:text-sm h-8 sm:h-9 lg:h-10"
                />
              </div>

              <div className="space-y-1.5 sm:space-y-2">
                <Label htmlFor="model" className="text-xs sm:text-sm">Modelo</Label>
                <Input
                  id="model"
                  placeholder="Ej: FH16"
                  value={truck.model}
                  onChange={(e) => handleInputChange("model", e.target.value)}
                  className="text-xs sm:text-sm h-8 sm:h-9 lg:h-10"
                />
              </div>
            </div>

            {/* Año / Capacidad */}
            <div className="grid grid-cols-2 gap-2 sm:gap-3">
              <div className="space-y-1.5 sm:space-y-2">
                <Label htmlFor="year" className="text-xs sm:text-sm">Año</Label>
                <Input
                  id="year"
                  type="number"
                  placeholder="2023"
                  min="1990"
                  max="2035"
                  value={truck.year}
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
                  value={truck.capacity}
                  onChange={(e) => handleInputChange("capacity", e.target.value)}
                  className="text-xs sm:text-sm h-8 sm:h-9 lg:h-10"
                />
              </div>
            </div>

            {/* Combustible */}
            <div className="space-y-1.5 sm:space-y-2">
              <Label htmlFor="fuel" className="text-xs sm:text-sm">Combustible</Label>
              <Select
                value={truck.fuel}
                onValueChange={(value) => handleInputChange("fuel", value)}
              >
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

          {/* Botones */}
          <div className="flex justify-end pt-4">
            <ActionButton
              className="w-full sm:w-auto"
              onClick={handleSubmit}
              disabled={loading}
            >
              {loading ? "Creando..." : "Crear Camión"}
            </ActionButton>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
