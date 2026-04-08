import { RefreshCcw, WandSparkles } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

export default function GenerateWeekDialog({
  open,
  onOpenChange,
  weekStartDate,
  onWeekStartDateChange,
  dailyCapacityLiters,
  onDailyCapacityLitersChange,
  regenerate,
  onRegenerateChange,
  autoEstimateWithoutContact,
  onAutoEstimateWithoutContactChange,
  checkingWeekGenerationContext,
  hasExistingWeekStops,
  submittingGenerate,
  onSubmit,
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] w-[calc(100vw-1rem)] max-w-[calc(100vw-1rem)] overflow-y-auto rounded-3xl p-0 sm:max-w-lg">
        <DialogHeader className="border-b border-border/70 px-4 py-4 text-left sm:px-6">
          <DialogTitle className="text-xl">Generar semana operativa</DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            Configura la semana y la capacidad diaria. El resto de la logica de paradas se generara automaticamente.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 px-4 py-4 sm:px-6 sm:py-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="weekStartDate">Inicio de semana</Label>
              <Input
                id="weekStartDate"
                type="date"
                className="w-full min-w-0"
                value={weekStartDate}
                onChange={(e) => onWeekStartDateChange?.(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="capacity">Capacidad diaria (litros)</Label>
              <Input
                id="capacity"
                type="number"
                min="0"
                step="0.01"
                value={dailyCapacityLiters}
                onChange={(e) => onDailyCapacityLitersChange?.(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-3">
            {checkingWeekGenerationContext ? (
              <div className="rounded-2xl border border-dashed border-border/80 bg-muted/20 px-4 py-3 text-sm text-muted-foreground">
                Comprobando si hay paradas existentes en la semana...
              </div>
            ) : hasExistingWeekStops ? (
              <div className="flex items-start gap-3 rounded-2xl border border-border/80 bg-background/80 px-4 py-3 sm:p-4">
                <Checkbox id="regenerate" checked={regenerate} onCheckedChange={(v) => onRegenerateChange?.(Boolean(v))} />
                <div className="space-y-1 text-left">
                  <Label htmlFor="regenerate" className="text-sm font-medium">
                    Regenerar paradas existentes
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Reutiliza la semana seleccionada y vuelve a calcular las paradas permitidas.
                  </p>
                </div>
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-border/80 bg-muted/20 px-4 py-3 text-sm text-muted-foreground">
                No hay paradas existentes en esa semana. Se generaran directamente.
              </div>
            )}

            <div className="flex items-start gap-3 rounded-2xl border border-border/80 bg-background/80 px-4 py-3 sm:p-4">
              <Checkbox
                id="auto_estimate_without_contact"
                checked={autoEstimateWithoutContact}
                onCheckedChange={(v) => onAutoEstimateWithoutContactChange?.(Boolean(v))}
              />
              <div className="space-y-1 text-left">
                <Label htmlFor="auto_estimate_without_contact" className="text-sm font-medium">
                  Autoestimar sin notificar al cliente
                </Label>
                <p className="text-xs text-muted-foreground">
                  Crea la planificacion usando estimacion automatica sin enviar aviso previo.
                </p>
              </div>
            </div>
          </div>

          <DialogFooter className="flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button type="button" variant="outline" className="w-full sm:w-auto" onClick={() => onOpenChange?.(false)}>
              Cancelar
            </Button>
            <Button type="button" className="w-full gap-2 sm:w-auto" onClick={onSubmit} disabled={submittingGenerate}>
              {submittingGenerate ? <RefreshCcw className="h-4 w-4 animate-spin" /> : <WandSparkles className="h-4 w-4" />}
              {submittingGenerate ? "Generando..." : "Generar semana"}
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}
