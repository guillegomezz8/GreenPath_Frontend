export function getRouteOptimizationFeedback(routeDays = []) {
  const affectedDays = routeDays.filter((day) =>
    ["FAILED", "FALLBACK"].includes(day?.optimization_status)
  );
  if (affectedDays.length === 0) return null;

  const failedDays = affectedDays.filter((day) => day.optimization_status === "FAILED");
  const firstReason = affectedDays.find((day) => day?.optimization_message)?.optimization_message;
  const count = failedDays.length > 0 ? failedDays.length : affectedDays.length;
  const dayLabel = count === 1 ? "jornada" : "jornadas";
  const summary = failedDays.length > 0
    ? count === 1
      ? `1 ${dayLabel} no se ha podido optimizar.`
      : `${count} ${dayLabel} no se han podido optimizar.`
    : `${count} ${dayLabel} ${count === 1 ? "usa" : "usan"} un orden alternativo.`;

  return firstReason ? `${summary} ${firstReason}` : summary;
}
