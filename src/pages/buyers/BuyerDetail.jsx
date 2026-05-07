import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Building2, Edit, FileText, Mail, MapPin, Phone, Trash2, UserCircle2 } from "lucide-react";
import { useAuth } from "@/context/AuthProvider";
import { useSnackbar } from "@/context/SnackbarProvider";
import { handleApiError } from "@/components/Utils";
import ConfirmDeleteDialog from "@/components/common/ConfirmDeleteDialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export default function BuyerDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { api } = useAuth();
  const showSnackbar = useSnackbar();

  const [buyer, setBuyer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const fetchBuyer = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api().get(`buyers/${encodeURIComponent(id)}/`);
      setBuyer(res.data || null);
    } catch (e) {
      const msg = handleApiError(e, "No se pudo cargar el comprador.");
      showSnackbar(msg, "error");
      navigate("/buyers");
    } finally {
      setLoading(false);
    }
  }, [api, id, navigate, showSnackbar]);

  useEffect(() => {
    if (!id) {
      navigate("/buyers");
      return;
    }
    fetchBuyer();
  }, [fetchBuyer, id, navigate]);

  const handleDelete = async () => {
    if (!buyer?.id) return;
    try {
      setDeleting(true);
      await api().delete(`buyers/${encodeURIComponent(buyer.id)}/`);
      showSnackbar("Comprador eliminado correctamente.", "success");
      navigate("/buyers");
    } catch (e) {
      const msg = handleApiError(e, "No se pudo eliminar el comprador.");
      showSnackbar(msg, "error");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3 sm:items-center sm:gap-4 min-w-0 flex-1">
          <Button variant="ghost" size="icon" onClick={() => navigate("/buyers")} className="mt-1 shrink-0 sm:mt-0">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="min-w-0 flex-1 text-left">
            <h1 className="truncate text-xl font-bold text-foreground sm:text-2xl lg:text-3xl">{loading ? "Cargando..." : buyer?.fiscal_name || "Comprador"}</h1>
            <p className="mt-1 text-sm text-muted-foreground sm:text-base">Ficha interna del comprador y sus datos fiscales.</p>
          </div>
        </div>

        <div className="grid w-full grid-cols-1 gap-2 sm:w-auto sm:grid-cols-2">
          <Button variant="outline" className="gap-2" disabled={loading || !buyer} onClick={() => navigate(`/buyers/${id}/edit`)}>
            <Edit className="h-4 w-4" />
            Editar
          </Button>
          <Button variant="destructive" className="gap-2" disabled={loading || !buyer || deleting} onClick={() => setDeleteOpen(true)}>
            <Trash2 className="h-4 w-4" />
            {deleting ? "Eliminando..." : "Eliminar"}
          </Button>
        </div>
      </div>

      {loading ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">Cargando comprador...</CardContent>
        </Card>
      ) : !buyer ? null : (
        <>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <Card>
              <CardContent className="pt-6 text-center">
                <div className="text-xl font-bold text-primary">{buyer.tax_id || "-"}</div>
                <p className="text-sm text-muted-foreground">CIF / NIF</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6 text-center">
                <div className="text-xl font-bold text-foreground">{buyer.city || "-"}</div>
                <p className="text-sm text-muted-foreground">Ciudad</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6 text-center">
                <Badge variant="outline" className="max-w-full truncate">{buyer.contact_person || "Sin contacto"}</Badge>
                <p className="mt-2 text-sm text-muted-foreground">Persona de contacto</p>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1.1fr)_360px]">
            <Card>
              <CardHeader className="text-left">
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-primary" />
                  Datos fiscales
                </CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 gap-4 text-left md:grid-cols-2">
                <div className="rounded-xl border border-border/80 p-4">
                  <p className="text-sm text-muted-foreground">Razon social</p>
                  <p className="mt-2 font-semibold text-foreground">{buyer.fiscal_name || "-"}</p>
                </div>
                <div className="rounded-xl border border-border/80 p-4">
                  <p className="text-sm text-muted-foreground">CIF / NIF</p>
                  <p className="mt-2 font-semibold text-foreground">{buyer.tax_id || "-"}</p>
                </div>
                <div className="rounded-xl border border-border/80 p-4 md:col-span-2">
                  <p className="text-sm text-muted-foreground">Direccion fiscal</p>
                  <p className="mt-2 font-semibold text-foreground">{buyer.full_fiscal_address || buyer.fiscal_address || "-"}</p>
                </div>
                <div className="rounded-xl border border-border/80 p-4">
                  <p className="text-sm text-muted-foreground">Provincia</p>
                  <p className="mt-2 font-semibold text-foreground">{buyer.province || "-"}</p>
                </div>
                <div className="rounded-xl border border-border/80 p-4">
                  <p className="text-sm text-muted-foreground">Pais</p>
                  <p className="mt-2 font-semibold text-foreground">{buyer.country || "-"}</p>
                </div>
              </CardContent>
            </Card>

            <div className="space-y-6">
              <Card>
                <CardHeader className="text-left">
                  <CardTitle className="flex items-center gap-2">
                    <UserCircle2 className="h-5 w-5 text-primary" />
                    Contacto
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 text-left text-sm text-muted-foreground">
                  <div className="flex items-start gap-3">
                    <Mail className="mt-0.5 h-4 w-4 shrink-0" />
                    <span>{buyer.email || "Sin email"}</span>
                  </div>
                  <div className="flex items-start gap-3">
                    <Phone className="mt-0.5 h-4 w-4 shrink-0" />
                    <span>{buyer.phone || "Sin telefono"}</span>
                  </div>
                  <div className="flex items-start gap-3">
                    <UserCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
                    <span>{buyer.contact_person || "Sin persona de contacto"}</span>
                  </div>
                  <div className="flex items-start gap-3">
                    <MapPin className="mt-0.5 h-4 w-4 shrink-0" />
                    <span>{buyer.fiscal_address || "Sin direccion"}</span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="text-left">
                  <CardTitle className="flex items-center gap-2">
                    <Building2 className="h-5 w-5 text-primary" />
                    Observaciones
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-left text-sm text-muted-foreground">
                  {buyer.notes ? buyer.notes : "Sin observaciones internas."}
                </CardContent>
              </Card>
            </div>
          </div>
        </>
      )}

      <ConfirmDeleteDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Eliminar comprador"
        description={buyer ? `Se eliminará ${buyer.fiscal_name}. Esta acción no se puede deshacer.` : "Esta acción no se puede deshacer."}
        confirmLabel="Eliminar"
        onConfirm={handleDelete}
        loading={deleting}
      />
    </div>
  );
}
