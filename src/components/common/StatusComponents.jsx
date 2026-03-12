import { Badge } from "@/components/ui/badge";

const normalize = (v) =>
  String(v ?? "")
    .trim()
    .replace(/_/g, " ")
    .toLowerCase();

export function StatusBadge({ status, variant }) {
  const getStatusColor = (value) => {
    const s = normalize(value);

    if (
      ["activa", "activo", "completada", "confirmada", "excelente", "completado"].includes(s)
    ) {
      return "border-transparent bg-success text-success-foreground";
    }

    if (
      ["en ruta", "en progreso", "asignada", "buena", "autoestimada", "estimada"].includes(s)
    ) {
      return "border-transparent bg-sky-500 text-white";
    }

    if (["planificada", "programada", "pendiente", "regular", "parcial", "en desarrollo"].includes(s)) {
      return "border-transparent bg-amber-500 text-white";
    }

    if (["cancelada", "cancelado", "inactiva", "inactivo", "mala", "retrasada", "problema"].includes(s)) {
      return "border-transparent bg-destructive text-destructive-foreground";
    }

    return "border-border bg-secondary text-secondary-foreground";
  };

  return (
    <Badge className={variant ? "" : getStatusColor(status)} variant={variant}>
      {status}
    </Badge>
  );
}

export function ProgressBar({ 
  value, 
  max = 100, 
  className = "", 
  color = "primary" 
}) {
  const percentage = Math.min((value / max) * 100, 100);
  
  const getColorClass = (color, percentage) => {
    if (color === "primary") return "bg-primary";
    if (color === "success") return "bg-success";
    if (color === "warning") return "bg-orange-500";
    if (color === "danger") return "bg-destructive";
    
    // Auto color based on percentage
    if (percentage >= 90) return "bg-success";
    if (percentage >= 70) return "bg-orange-500";
    return "bg-destructive";
  };

  return (
    <div className={`w-full bg-secondary rounded-full h-2 ${className}`}>
      <div 
        className={`h-2 rounded-full transition-all ${getColorClass(color, percentage)}`}
        style={{ width: `${percentage}%` }}
      ></div>
    </div>
  );
}
