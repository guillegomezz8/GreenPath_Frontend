import { AlertTriangle, CheckCircle2, Clock3 } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const STATUS_CONFIG = {
  OPTIMIZED: {
    label: "Optimizada",
    className: "border-emerald-200 bg-emerald-50 text-emerald-700",
    icon: CheckCircle2,
  },
  FALLBACK: {
    label: "Orden alternativo",
    className: "border-amber-200 bg-amber-50 text-amber-700",
    icon: AlertTriangle,
  },
  FAILED: {
    label: "No optimizada",
    className: "border-red-200 bg-red-50 text-red-700",
    icon: AlertTriangle,
  },
  PENDING: {
    label: "Pendiente de optimizar",
    className: "border-slate-200 bg-slate-50 text-slate-700",
    icon: Clock3,
  },
};

export default function RouteOptimizationBadge({ status = "PENDING", message = "" }) {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.PENDING;
  const Icon = config.icon;

  return (
    <Badge variant="outline" className={config.className} title={message || config.label}>
      <Icon className="mr-1 h-3.5 w-3.5" aria-hidden="true" />
      {config.label}
    </Badge>
  );
}
