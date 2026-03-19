import { useCallback, useEffect, useMemo, useState } from "react";
import { Building2, ChevronDown, ChevronUp, Euro, Landmark, Mail, MapPin, Phone, Save, Settings2 } from "lucide-react";
import { useAuth } from "@/context/AuthProvider";
import { useSnackbar } from "@/context/SnackbarProvider";
import { handleApiError } from "@/components/Utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import CompanyHubPicker from "@/components/settings/CompanyHubPicker";

const DEFAULT_PRICE_PER_LITER = "1.200";
const BILLING_FIELDS = [
  "billing_business_name",
  "billing_tax_id",
  "billing_address",
  "billing_postal_code",
  "billing_city",
  "billing_province",
  "billing_country",
  "billing_phone",
  "billing_email",
  "billing_bank_account",
  "billing_ler_code",
  "billing_footer",
];
const SECONDARY_BUTTON_CLASS =
  "w-full sm:w-auto justify-center border-border/90 bg-background text-foreground shadow-sm hover:bg-accent/60";

function normalizeBillingPayload(payload = {}) {
  return {
    billing_business_name: payload.billing_business_name || "",
    billing_tax_id: payload.billing_tax_id || "",
    billing_address: payload.billing_address || "",
    billing_postal_code: payload.billing_postal_code || "",
    billing_city: payload.billing_city || "",
    billing_province: payload.billing_province || "",
    billing_country: payload.billing_country || "Espana",
    billing_phone: payload.billing_phone || "",
    billing_email: payload.billing_email || "",
    billing_bank_account: payload.billing_bank_account || "",
    billing_ler_code: payload.billing_ler_code || "",
    billing_footer: payload.billing_footer || "",
  };
}

function normalizeSettingsPayload(payload = {}) {
  return {
    company_name: payload.company_name || "",
    default_price_per_liter:
      payload.default_price_per_liter !== undefined && payload.default_price_per_liter !== null
        ? String(payload.default_price_per_liter)
        : DEFAULT_PRICE_PER_LITER,
    hub:
      payload?.hub?.location &&
      Number.isFinite(Number(payload.hub.location.lat)) &&
      Number.isFinite(Number(payload.hub.location.lng))
        ? {
            id: payload.hub.id || null,
            name: payload.hub.name || "",
            lat: Number(payload.hub.location.lat),
            lng: Number(payload.hub.location.lng),
          }
        : null,
    billing: normalizeBillingPayload(payload),
  };
}

function areSameHub(firstHub, secondHub) {
  if (!firstHub && !secondHub) return true;
  if (!firstHub || !secondHub) return false;
  return Number(firstHub.lat) === Number(secondHub.lat) && Number(firstHub.lng) === Number(secondHub.lng);
}

function areSameBilling(firstBilling, secondBilling) {
  return BILLING_FIELDS.every((field) => (firstBilling?.[field] || "") === (secondBilling?.[field] || ""));
}

function SettingsSection({ icon, title, isOpen, onToggle, children }) {
  return (
    <Card className="border-border/80">
      <CardHeader className="text-left">
        <button
          type="button"
          onClick={onToggle}
          className="flex w-full items-center justify-between gap-3 rounded-xl text-left"
        >
          <CardTitle className="flex items-center gap-2">
            {icon}
            {title}
          </CardTitle>
          {isOpen ? <ChevronUp className="h-5 w-5 text-muted-foreground" /> : <ChevronDown className="h-5 w-5 text-muted-foreground" />}
        </button>
      </CardHeader>
      {isOpen ? <CardContent>{children}</CardContent> : null}
    </Card>
  );
}

export default function CompanySettingsPage() {
  const { api } = useAuth();
  const showSnackbar = useSnackbar();

  const [loading, setLoading] = useState(false);
  const [savingPrice, setSavingPrice] = useState(false);
  const [savingHub, setSavingHub] = useState(false);
  const [savingBilling, setSavingBilling] = useState(false);

  const [companyName, setCompanyName] = useState("");
  const [priceDraft, setPriceDraft] = useState(DEFAULT_PRICE_PER_LITER);
  const [savedPrice, setSavedPrice] = useState(DEFAULT_PRICE_PER_LITER);
  const [hubDraft, setHubDraft] = useState(null);
  const [savedHub, setSavedHub] = useState(null);
  const [billingDraft, setBillingDraft] = useState(normalizeBillingPayload());
  const [savedBilling, setSavedBilling] = useState(normalizeBillingPayload());
  const [openSections, setOpenSections] = useState({
    price: true,
    billing: false,
    hub: false,
  });

  const applyServerSettings = useCallback((payload, options = {}) => {
    const { preservePriceDraft = false, preserveHubDraft = false, preserveBillingDraft = false } = options;
    const normalized = normalizeSettingsPayload(payload);

    setCompanyName(normalized.company_name);
    setSavedPrice(normalized.default_price_per_liter);
    setSavedHub(normalized.hub);
    setSavedBilling(normalized.billing);

    if (!preservePriceDraft) {
      setPriceDraft(normalized.default_price_per_liter);
    }

    if (!preserveHubDraft) {
      setHubDraft(normalized.hub);
    }

    if (!preserveBillingDraft) {
      setBillingDraft(normalized.billing);
    }
  }, []);

  const fetchSettings = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api().get("companies/settings/");
      applyServerSettings(res.data || {});
    } catch (e) {
      const msg = handleApiError(e, "No se pudo cargar la configuracion de la empresa.");
      showSnackbar(msg, "error");
    } finally {
      setLoading(false);
    }
  }, [api, applyServerSettings, showSnackbar]);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const isBusy = loading || savingPrice || savingHub || savingBilling;
  const hasPriceChanges = priceDraft !== savedPrice;
  const hasHubChanges = !areSameHub(hubDraft, savedHub);
  const hasBillingChanges = !areSameBilling(billingDraft, savedBilling);

  const handleBillingChange = (field, value) => {
    setBillingDraft((prev) => ({ ...prev, [field]: value }));
  };

  const handleResetPriceToSaved = () => setPriceDraft(savedPrice);
  const handleResetPriceToDefault = () => setPriceDraft(DEFAULT_PRICE_PER_LITER);
  const handleResetHubToSaved = () => setHubDraft(savedHub);
  const handleClearHub = () => setHubDraft(null);
  const handleResetBillingToSaved = () => {
    setBillingDraft(savedBilling);
  };
  const toggleSection = (sectionKey) => {
    setOpenSections((prev) => ({ ...prev, [sectionKey]: !prev[sectionKey] }));
  };

  const handleSavePrice = async (e) => {
    e.preventDefault();
    if (priceDraft === "") {
      showSnackbar("Debes indicar el precio global por litro.", "error");
      return;
    }

    try {
      setSavingPrice(true);
      const res = await api().put("companies/settings/", {
        default_price_per_liter: priceDraft,
      });
      applyServerSettings(res.data?.settings || {}, {
        preserveHubDraft: hasHubChanges,
        preserveBillingDraft: hasBillingChanges,
      });
      showSnackbar("Precio global guardado correctamente.", "success");
    } catch (e) {
      const msg = handleApiError(e, "No se pudo guardar el precio global.");
      showSnackbar(msg, "error");
    } finally {
      setSavingPrice(false);
    }
  };

  const handleSaveHub = async (e) => {
    e.preventDefault();

    try {
      setSavingHub(true);
      const payload = {
        default_price_per_liter: savedPrice,
      };

      if (hubDraft && Number.isFinite(Number(hubDraft.lat)) && Number.isFinite(Number(hubDraft.lng))) {
        payload.hub_lat = Number(hubDraft.lat);
        payload.hub_lng = Number(hubDraft.lng);
        payload.hub_name = hubDraft.name || `Nave ${companyName || "principal"}`;
      } else if (savedHub) {
        payload.hub_lat = null;
        payload.hub_lng = null;
        payload.hub_name = savedHub.name || `Nave ${companyName || "principal"}`;
      }

      const res = await api().put("companies/settings/", payload);
      applyServerSettings(res.data?.settings || {}, {
        preservePriceDraft: hasPriceChanges,
        preserveBillingDraft: hasBillingChanges,
      });
      showSnackbar("Hub guardado correctamente.", "success");
    } catch (e) {
      const msg = handleApiError(e, "No se pudo guardar el hub de la empresa.");
      showSnackbar(msg, "error");
    } finally {
      setSavingHub(false);
    }
  };

  const handleSaveBilling = async (e) => {
    e.preventDefault();

    try {
      setSavingBilling(true);
      const payload = {
        default_price_per_liter: savedPrice || DEFAULT_PRICE_PER_LITER,
        billing_business_name: billingDraft.billing_business_name || "",
        billing_tax_id: billingDraft.billing_tax_id || "",
        billing_address: billingDraft.billing_address || "",
        billing_postal_code: billingDraft.billing_postal_code || "",
        billing_city: billingDraft.billing_city || "",
        billing_province: billingDraft.billing_province || "",
        billing_country: billingDraft.billing_country || "Espana",
        billing_phone: billingDraft.billing_phone || "",
        billing_email: billingDraft.billing_email || "",
        billing_bank_account: billingDraft.billing_bank_account || "",
        billing_ler_code: billingDraft.billing_ler_code || "",
        billing_footer: billingDraft.billing_footer || "",
      };

      const res = await api().put("companies/settings/", payload);

      applyServerSettings(res.data?.settings || {}, {
        preservePriceDraft: hasPriceChanges,
        preserveHubDraft: hasHubChanges,
      });
      showSnackbar("Datos de facturacion guardados correctamente.", "success");
    } catch (e) {
      const msg = handleApiError(e, "No se pudo guardar la configuracion de facturacion.");
      showSnackbar(msg, "error");
    } finally {
      setSavingBilling(false);
    }
  };

  const hubSummary = useMemo(() => {
    if (!hubDraft || !Number.isFinite(Number(hubDraft.lat)) || !Number.isFinite(Number(hubDraft.lng))) {
      return "Sin definir";
    }
    return `${hubDraft.lat.toFixed(6)}, ${hubDraft.lng.toFixed(6)}`;
  }, [hubDraft]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="flex items-center gap-3 text-2xl font-bold text-foreground sm:text-3xl">
            <Settings2 className="h-7 w-7 text-primary sm:h-8 sm:w-8" />
            Configuracion
          </h1>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1.1fr)_320px]">
        <div className="min-w-0 space-y-6">
          <SettingsSection
            icon={<Euro className="h-5 w-5 text-primary" />}
            title="Precio por litro"
            isOpen={openSections.price}
            onToggle={() => toggleSection("price")}
          >
              <form onSubmit={handleSavePrice} className="space-y-5">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="company_name">Empresa</Label>
                    <Input id="company_name" value={companyName} disabled />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="default_price_per_liter">EUR por litro</Label>
                    <Input
                      id="default_price_per_liter"
                      type="number"
                      min="0"
                      step="0.001"
                      value={priceDraft}
                      onChange={(e) => setPriceDraft(e.target.value)}
                      disabled={isBusy}
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-3 lg:flex-row lg:justify-end">
                  <Button type="button" variant="outline" className={SECONDARY_BUTTON_CLASS} disabled={isBusy || !hasPriceChanges} onClick={handleResetPriceToSaved}>
                    Restablecer guardado
                  </Button>
                  <Button type="button" variant="outline" className={SECONDARY_BUTTON_CLASS} disabled={isBusy} onClick={handleResetPriceToDefault}>
                    Valor por defecto
                  </Button>
                  <Button type="submit" className="w-full gap-2 sm:w-auto" disabled={isBusy || !hasPriceChanges}>
                    <Save className="h-4 w-4" />
                    {savingPrice ? "Guardando..." : "Guardar precio"}
                  </Button>
                </div>
              </form>
          </SettingsSection>

          <SettingsSection
            icon={<Building2 className="h-5 w-5 text-primary" />}
            title="Datos de facturacion"
            isOpen={openSections.billing}
            onToggle={() => toggleSection("billing")}
          >
              <form onSubmit={handleSaveBilling} className="space-y-5">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="billing_business_name">Razon social</Label>
                    <Input id="billing_business_name" value={billingDraft.billing_business_name} onChange={(e) => handleBillingChange("billing_business_name", e.target.value)} disabled={isBusy} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="billing_tax_id">CIF</Label>
                    <Input id="billing_tax_id" value={billingDraft.billing_tax_id} onChange={(e) => handleBillingChange("billing_tax_id", e.target.value)} disabled={isBusy} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="billing_ler_code">Codigo LER (Opcional)</Label>
                    <Input id="billing_ler_code" value={billingDraft.billing_ler_code} onChange={(e) => handleBillingChange("billing_ler_code", e.target.value)} disabled={isBusy} />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="billing_address">Direccion fiscal</Label>
                    <Input id="billing_address" value={billingDraft.billing_address} onChange={(e) => handleBillingChange("billing_address", e.target.value)} disabled={isBusy} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="billing_postal_code">Codigo postal</Label>
                    <Input id="billing_postal_code" value={billingDraft.billing_postal_code} onChange={(e) => handleBillingChange("billing_postal_code", e.target.value)} disabled={isBusy} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="billing_city">Ciudad</Label>
                    <Input id="billing_city" value={billingDraft.billing_city} onChange={(e) => handleBillingChange("billing_city", e.target.value)} disabled={isBusy} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="billing_province">Provincia</Label>
                    <Input id="billing_province" value={billingDraft.billing_province} onChange={(e) => handleBillingChange("billing_province", e.target.value)} disabled={isBusy} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="billing_country">Pais (Opcional)</Label>
                    <Input id="billing_country" value={billingDraft.billing_country} onChange={(e) => handleBillingChange("billing_country", e.target.value)} disabled={isBusy} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="billing_phone">Telefono (Opcional)</Label>
                    <div className="relative">
                      <Phone className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input id="billing_phone" className="pl-10" value={billingDraft.billing_phone} onChange={(e) => handleBillingChange("billing_phone", e.target.value)} disabled={isBusy} />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="billing_email">Email (Opcional)</Label>
                    <div className="relative">
                      <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input id="billing_email" type="email" className="pl-10" value={billingDraft.billing_email} onChange={(e) => handleBillingChange("billing_email", e.target.value)} disabled={isBusy} />
                    </div>
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="billing_bank_account">Cuenta bancaria (Opcional)</Label>
                    <div className="relative">
                      <Landmark className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input id="billing_bank_account" className="pl-10" value={billingDraft.billing_bank_account} onChange={(e) => handleBillingChange("billing_bank_account", e.target.value)} disabled={isBusy} />
                    </div>
                  </div>
                </div>

                <div className="space-y-2 text-left">
                  <Label htmlFor="billing_footer">Pie de factura (Opcional)</Label>
                  <Textarea id="billing_footer" rows={4} value={billingDraft.billing_footer} onChange={(e) => handleBillingChange("billing_footer", e.target.value)} disabled={isBusy} />
                </div>

                <div className="flex flex-col gap-3 lg:flex-row lg:justify-end">
                  <Button type="button" variant="outline" className={SECONDARY_BUTTON_CLASS} disabled={isBusy || !hasBillingChanges} onClick={handleResetBillingToSaved}>
                    Restablecer guardado
                  </Button>
                  <Button type="submit" className="w-full gap-2 sm:w-auto" disabled={isBusy || !hasBillingChanges}>
                    <Save className="h-4 w-4" />
                    {savingBilling ? "Guardando..." : "Guardar facturacion"}
                  </Button>
                </div>
              </form>
          </SettingsSection>

          <SettingsSection
            icon={<MapPin className="h-5 w-5 text-primary" />}
            title="Hub de empresa"
            isOpen={openSections.hub}
            onToggle={() => toggleSection("hub")}
          >
            <div className="space-y-4">
              <CompanyHubPicker
                value={hubDraft}
                onChange={(location) =>
                  setHubDraft((prev) => ({
                    id: prev?.id || null,
                    name: prev?.name || `Nave ${companyName || "principal"}`,
                    lat: location.lat,
                    lng: location.lng,
                  }))
                }
              />

              <form onSubmit={handleSaveHub} className="space-y-4">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="hub_lat">Latitud</Label>
                    <Input id="hub_lat" className="font-mono text-sm" value={hubDraft?.lat ?? ""} disabled />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="hub_lng">Longitud</Label>
                    <Input id="hub_lng" className="font-mono text-sm" value={hubDraft?.lng ?? ""} disabled />
                  </div>
                </div>

                <div className="flex flex-col gap-3 lg:flex-row lg:justify-end">
                  <Button type="button" variant="outline" className={SECONDARY_BUTTON_CLASS} disabled={isBusy || !hasHubChanges} onClick={handleResetHubToSaved}>
                    Restablecer guardado
                  </Button>
                  <Button type="button" variant="outline" className={SECONDARY_BUTTON_CLASS} disabled={isBusy || !hubDraft} onClick={handleClearHub}>
                    Quitar hub
                  </Button>
                  <Button type="submit" className="w-full gap-2 sm:w-auto" disabled={isBusy || !hasHubChanges}>
                    <Save className="h-4 w-4" />
                    {savingHub ? "Guardando..." : "Guardar hub"}
                  </Button>
                </div>
              </form>
            </div>
          </SettingsSection>
        </div>

        <Card className="border-border/80 bg-card/90 xl:sticky xl:top-24">
          <CardHeader className="text-left">
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-primary" />
              Resumen
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-left">
            <div className="rounded-2xl border border-border/80 bg-muted/20 p-4">
              <p className="text-sm font-medium text-foreground">Empresa</p>
              <p className="mt-2 text-sm text-muted-foreground">{companyName || "Sin empresa"}</p>
            </div>
            <div className="rounded-2xl border border-border/80 bg-muted/20 p-4">
              <p className="text-sm font-medium text-foreground">Precio actual</p>
              <p className="mt-2 text-sm text-muted-foreground">{priceDraft !== "" ? `${priceDraft} EUR/L` : "Sin definir"}</p>
            </div>
            <div className="rounded-2xl border border-border/80 bg-muted/20 p-4">
              <p className="text-sm font-medium text-foreground">Razon social factura</p>
              <p className="mt-2 text-sm text-muted-foreground">{billingDraft.billing_business_name || "Sin definir"}</p>
            </div>
            <div className="rounded-2xl border border-border/80 bg-muted/20 p-4">
              <p className="text-sm font-medium text-foreground">CIF</p>
              <p className="mt-2 text-sm text-muted-foreground">{billingDraft.billing_tax_id || "Sin definir"}</p>
            </div>
            <div className="rounded-2xl border border-border/80 bg-muted/20 p-4">
              <p className="text-sm font-medium text-foreground">Hub</p>
              <p className="mt-2 text-sm text-muted-foreground">{hubSummary}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
