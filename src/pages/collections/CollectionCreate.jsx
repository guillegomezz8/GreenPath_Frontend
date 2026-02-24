import { useState, useCallback, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Save, MapPin, Calculator, Package } from "lucide-react";
import { useAuth } from "@/context/AuthProvider";
import { useToast } from "@/hooks/use-toast";
import { handleApiError } from "@/components/Utils";

export default function CollectionCreate() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { api } = useAuth();
  const { toast } = useToast();

  const [loading, setLoading] = useState(false);

  const [clients, setClients] = useState([]);
  const [workers, setWorkers] = useState([]);

  const [formData, setFormData] = useState({
    client: id ?? "",
    worker: "",
    collection_date: "",
    container_type: "BIDONES",
    container_number: "1",
    price_per_liter: "2.50",
    notes: ""
  });

  const containerTypes = [
    { value: "BIDONES", label: "Bidones (60L cada uno)" },
    { value: "IBC", label: "IBC (1000L cada uno)" }
  ];

  // Traer clientes y trabajadores
  const fetchClients = useCallback(async () => {
    const res = await api().get("clients", { params: { page: 1, page_size: 300 } });
    setClients(res.data.results || []);
  }, [api]);

  const fetchWorkers = useCallback(async () => {
    const res = await api().get("workers", { params: { page: 1, page_size: 300 } });
    setWorkers(res.data.results || []);
  }, [api]);

  useEffect(() => {
    const loadData = async () => {
      try {
        await Promise.all([fetchClients(), fetchWorkers()]);
      } catch (err) {
        const msg = handleApiError(err, "No se pudieron cargar clientes o trabajadores.");
        toast({
          title: "Error",
          description: msg,
          variant: "destructive",
        });
      }
    };
    loadData();
  }, [fetchClients, fetchWorkers, toast]);

  const calculateTotals = () => {
    const containerNumber = parseInt(formData.container_number) || 0;
    const pricePerLiter = parseFloat(formData.price_per_liter) || 0;
    const volumePerContainer = formData.container_type === "BIDONES" ? 60 : 1000;

    const litersCollected = containerNumber * volumePerContainer;
    const totalPrice = litersCollected * pricePerLiter;

    return { litersCollected, totalPrice };
  };

  const { litersCollected, totalPrice } = calculateTotals();

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.client || !formData.collection_date) {
      toast({
        title: "Error",
        description: "Los campos Cliente y Fecha de Recogida son obligatorios",
        variant: "destructive",
      });
      return;
    }

    if ((parseInt(formData.container_number) || 0) < 1) {
      toast({
        title: "Error",
        description: "El número de contenedores debe ser mayor a 0",
        variant: "destructive",
      });
      return;
    }

    if ((parseFloat(formData.price_per_liter) || 0) <= 0) {
      toast({
        title: "Error",
        description: "El precio por litro debe ser mayor a 0",
        variant: "destructive",
      });
      return;
    }

    try {
      setLoading(true);
      await api().post("collections/", {
        client: Number(formData.client),
        worker: formData.worker ? Number(formData.worker) : null,
        collection_date: formData.collection_date,
        container_type: formData.container_type,
        container_number: Number(formData.container_number),
        price_per_liter: formData.price_per_liter,
        notes: formData.notes,
      });

      toast({
        title: "Recogida programada",
        description: "Recogida creada exitosamente",
      });

      navigate("/collections");
    } catch (err) {
      const msg = handleApiError(err, "No se pudo crear la recogida.");
      toast({
        title: "Error",
        description: msg,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field, value) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start gap-3 sm:items-center sm:gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate("/collections")}
          className="flex-shrink-0 mt-1 sm:mt-0"
        >
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div className="min-w-0 flex-1">
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-foreground flex flex-wrap items-center gap-2 lg:gap-3 leading-tight">
            <Package className="w-6 h-6 sm:w-7 sm:h-7 lg:w-8 lg:h-8 text-primary flex-shrink-0" />
            <span>Crear Recogida</span>
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground mt-1 leading-relaxed text-left">
            Rellena la información para registrar una nueva recogida
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Información básica */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="w-5 h-5 text-primary" />
              Información Básica
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="client">Cliente *</Label>
                <Select
                  value={formData.client}
                  onValueChange={(value) => handleChange("client", value)}
                  disabled={!!id}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar cliente" />
                  </SelectTrigger>
                  <SelectContent>
                    {clients.map((client) => (
                      <SelectItem key={client.id} value={String(client.id)}>
                        {client.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="worker">Trabajador</Label>
                <Select
                  value={formData.worker}
                  onValueChange={(value) => handleChange("worker", value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar trabajador" />
                  </SelectTrigger>
                  <SelectContent>
                    {workers.map((worker) => (
                      <SelectItem key={worker.id} value={String(worker.id)}>
                        {`${worker.name || ""} ${worker.surname || ""}`.trim() || worker.username}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="collection_date">Fecha de Recogida *</Label>
                <Input
                  id="collection_date"
                  type="date"
                  value={formData.collection_date}
                  onChange={(e) => handleChange("collection_date", e.target.value)}
                  required
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Información de contenedores */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calculator className="w-5 h-5 text-primary" />
              Información de Contenedores
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="container_type">Tipo de Contenedor *</Label>
                <Select
                  value={formData.container_type}
                  onValueChange={(value) => handleChange("container_type", value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    {containerTypes.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="container_number">Número de Contenedores *</Label>
                <Input
                  id="container_number"
                  type="number"
                  min="1"
                  value={formData.container_number}
                  onChange={(e) => handleChange("container_number", e.target.value)}
                  placeholder="1"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="price_per_liter">Precio por Litro (€) *</Label>
                <Input
                  id="price_per_liter"
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={formData.price_per_liter}
                  onChange={(e) => handleChange("price_per_liter", e.target.value)}
                  placeholder="2.50"
                  required
                />
              </div>
            </div>

            {/* Cálculos automáticos */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-accent/50 rounded-lg">
              <div>
                <p className="text-sm text-muted-foreground">Litros Totales Estimados</p>
                <p className="text-lg font-semibold text-primary">{litersCollected} L</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Precio Total Estimado</p>
                <p className="text-lg font-semibold text-success">{totalPrice.toFixed(2)} €</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Observaciones */}
        <Card>
          <CardHeader className="text-left">
            <CardTitle>Observaciones</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Label htmlFor="notes">Notas adicionales</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => handleChange("notes", e.target.value)}
                placeholder="Cualquier información adicional sobre la recogida..."
                rows={4}
              />
            </div>
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 pt-4 sm:pt-6">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate("/collections")}
                className="flex-1 order-2 sm:order-1 h-10 sm:h-9"
              >
                <span className="text-sm sm:text-base">Cancelar</span>
              </Button>
              <Button
                type="submit"
                disabled={loading}
                className="flex-1 order-1 sm:order-2 gap-2 h-10 sm:h-9"
              >
                <Save className="w-4 h-4 flex-shrink-0" />
                <span className="text-sm sm:text-base">
                  {loading ? "Guardando..." : "Crear Recogida"}
                </span>
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
  );
}
