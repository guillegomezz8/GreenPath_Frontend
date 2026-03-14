import { clsx } from "clsx"
import { twMerge } from "tailwind-merge"
import axios from "axios";

export function handleApiError(error, defaultErrorMessage) {
  let errorMessage = defaultErrorMessage;
  console.log('Error recibido:', error);
  if (error.response?.data) {
    const data = error.response.data;
    if (typeof data === 'string') {
      errorMessage = data;
    }
    else if (data.detail) {
      errorMessage = data.detail;
    }
    else if (data.message) {
      errorMessage = data.message;
    }
    else if (typeof data === 'object') {
      const errors = Object.entries(data)
        .map(([field, msgs]) => {
          const messages = Array.isArray(msgs) ? msgs : [msgs];
          return `${field}: ${messages.join(', ')}`;
        })
        .join(' | ');
      errorMessage = errors || defaultErrorMessage;
    }
  }  
  return errorMessage;
}

export function cn(...inputs) {
  return twMerge(clsx(...inputs))
}

export function mapFiltersForBackend(appliedFilters, filterMap = {}) {
  if (!appliedFilters || typeof appliedFilters !== 'object') {
    return {};
  }
  return Object.entries(appliedFilters).reduce((acc, [key, value]) => {
    if (key === 'ordering') {
      const direction = value.startsWith('-') ? '-' : '';
      const rawField = value.replace(/^-/, '');
      const mappedOrderingField = filterMap[rawField] || rawField;
      acc.ordering = `${direction}${mappedOrderingField}`;
    } else {
      const mappedKey = filterMap[key] || key;
      if (value !== '') {
        acc[mappedKey] = value;
      }
    }
    return acc;
  }, {});
}

export function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

export async function fetch_with_filters(url, entityErrorMessage, filterMap, filter, api, currentPage=1, pageSize=5, setTotalPages=(()=>{}), setCurrentPage=(()=>{}), setError=(()=>{}), showSnackbar=(()=>{}), controllerRef=null) {
  let controller = null
  if (controllerRef) {
    if (controllerRef.current) {
      controllerRef.current.abort();
    }
    controller = new AbortController();
    controllerRef.current = controller;
  }

  const parsed_filters = mapFiltersForBackend(filter, filterMap);

  try {
      const result = await api().get(url, {
          params: {
              page: currentPage,
              page_size: pageSize,
              ...parsed_filters, 
          },
          signal: controller ? controller.signal : null,
      })
      const data = result.data.results || result.data || [];
      setTotalPages(result.data.total_pages || 1);
      setCurrentPage(result.data.current_page || 1);
      setError(null);
      return data;
  } catch (e) {
      if (!(axios.isCancel(e) || e.name === 'CanceledError')) {
          const parsedError = handleApiError(e, `Error inesperado obteniendo ${entityErrorMessage}.`)
          setError(parsedError);
          showSnackbar(parsedError, 'error');
          return false;
      }
  }
}

export function getInitials(name = "", surname = "") {
  return `${name} ${surname}`
    .trim()
    .split(/\s+/)
    .map(p => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase() || "??";
}

export function buildMediaUrl(url) {
  if (!url) return null;
  const parsed = `${url}`.trim();
  if (!parsed) return null;
  if (parsed.startsWith("http") || parsed.startsWith("data:") || parsed.startsWith("blob:")) return parsed;
  return `${import.meta.env.VITE_APP_API_URL}${parsed}`;
}

export function getAvatarSrc(w) {
  if (!w || typeof w !== "object") return null;
  const raw = (
    w.photo ||
    w.avatar_url ||
    w.photo_url ||
    w.profile?.photo ||
    w.profile?.avatar_url ||
    w.profile?.photo_url ||
    null
  );
  return buildMediaUrl(raw);
}

export function formatNumber(n) {
  new Intl.NumberFormat("es-ES").format(n ?? 0);
  return n?.toLocaleString("es-ES") || "0";
}

export function formatCurrency(n) {
  new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" }).format(n ?? 0);
  return n?.toLocaleString("es-ES", { style: "currency", currency: "EUR" }) || "0 €";
}

export function normalizeCollectionStatus(status) {
  const normalized = (status || "")
    .toString()
    .trim()
    .toUpperCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

  if (["CONFIRMED", "CONFIRMADA", "CONFIRMADO"].includes(normalized)) return "CONFIRMED";
  if (["PENDING_MEASUREMENT", "PENDING", "PENDIENTE", "PENDIENTE DE MEDICION"].includes(normalized)) return "PENDING_MEASUREMENT";
  if (["CANCELED", "CANCELLED", "CANCELADA", "CANCELADO"].includes(normalized)) return "CANCELED";
  return normalized || "PENDING_MEASUREMENT";
}

export function getCollectionStatusLabel(status) {
  const normalized = normalizeCollectionStatus(status);
  if (normalized === "CONFIRMED") return "Confirmada";
  if (normalized === "CANCELED") return "Cancelada";
  return "Pendiente de medicion";
}

export function getCollectionStatusClass(status) {
  const normalized = normalizeCollectionStatus(status);
  if (normalized === "CONFIRMED") return "bg-green-600 text-white";
  if (normalized === "CANCELED") return "bg-red-600 text-white";
  return "bg-blue-600 text-white";
}

export function normalizeRouteStatus(status) {
  const normalized = (status || "")
    .toString()
    .trim()
    .toUpperCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

  if (["PLANNED", "PLANIFICADA", "PLANIFICADO"].includes(normalized)) return "PLANNED";
  if (["IN_PROGRESS", "EN_PROGRESO", "EN PROGRESO"].includes(normalized)) return "IN_PROGRESS";
  if (["COMPLETED", "COMPLETADA", "COMPLETADO", "FINALIZADA", "FINALIZADO"].includes(normalized)) return "COMPLETED";
  if (["PARTIAL", "PARCIAL"].includes(normalized)) return "PARTIAL";
  if (["CANCELED", "CANCELLED", "CANCELADA", "CANCELADO"].includes(normalized)) return "CANCELED";
  return normalized || "PLANNED";
}

export function getRouteStatusLabel(status) {
  const normalized = normalizeRouteStatus(status);
  if (normalized === "IN_PROGRESS") return "En progreso";
  if (normalized === "COMPLETED") return "Completada";
  if (normalized === "PARTIAL") return "Parcial";
  if (normalized === "CANCELED") return "Cancelada";
  return "Planificada";
}

export function getRouteStatusClass(status) {
  const normalized = normalizeRouteStatus(status);
  if (normalized === "PLANNED") return "bg-slate-500 text-white";
  if (normalized === "IN_PROGRESS") return "bg-blue-600 text-white";
  if (normalized === "COMPLETED") return "bg-green-600 text-white";
  if (normalized === "PARTIAL") return "bg-yellow-500 text-black";
  if (normalized === "CANCELED") return "bg-red-600 text-white";
  return "bg-slate-500 text-white";
}

export function normalizeCollectionRequestStatus(status) {
  const normalized = (status || "")
    .toString()
    .trim()
    .toUpperCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

  if (["PENDING", "PENDIENTE"].includes(normalized)) return "PENDING";
  if (["ANSWERED", "RESPONDIDA", "RESPONDIDO"].includes(normalized)) return "ANSWERED";
  if (["AUTO_ESTIMATED", "AUTOESTIMADA", "AUTOESTIMADO"].includes(normalized)) return "AUTO_ESTIMATED";
  if (["MANUAL"].includes(normalized)) return "MANUAL";
  return normalized || "PENDING";
}

export function getCollectionRequestStatusLabel(status) {
  const normalized = normalizeCollectionRequestStatus(status);
  if (normalized === "ANSWERED") return "Respondida";
  if (normalized === "AUTO_ESTIMATED") return "Autoestimada";
  if (normalized === "MANUAL") return "Manual";
  return "Pendiente";
}

export function getCollectionRequestStatusClass(status) {
  const normalized = normalizeCollectionRequestStatus(status);
  if (normalized === "PENDING") return "bg-orange-500 text-white";
  if (normalized === "ANSWERED") return "bg-green-600 text-white";
  if (normalized === "AUTO_ESTIMATED") return "bg-cyan-600 text-white";
  if (normalized === "MANUAL") return "bg-indigo-600 text-white";
  return "bg-slate-500 text-white";
}

export function normalizeRoleType(roleType) {
  const raw = `${roleType || ""}`.trim().toLowerCase();
  if (["owner", "propietario", "dueno"].includes(raw)) return "owner";
  if (["worker", "trabajador"].includes(raw)) return "worker";
  if (["client", "cliente"].includes(raw)) return "client";
  return raw || "desconocido";
}

export function getRoleLabel(roleType) {
  const normalized = normalizeRoleType(roleType);
  if (normalized === "owner") return "Propietario";
  if (normalized === "worker") return "Trabajador";
  if (normalized === "client") return "Cliente";
  return "Desconocido";
}

export function getRoleBadgeClass(roleType) {
  const normalized = normalizeRoleType(roleType);
  if (normalized === "owner") return "bg-indigo-600 text-white";
  if (normalized === "worker") return "bg-blue-600 text-white";
  if (normalized === "client") return "bg-cyan-600 text-white";
  return "bg-slate-600 text-white";
}

export function normalizePickupFrequency(frequency) {
  const normalized = (frequency || "")
    .toString()
    .trim()
    .toUpperCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, "_");

  if (["WEEKLY", "CADA_SEMANA"].includes(normalized)) return "WEEKLY";
  if (["2_WEEKS", "CADA_2_SEMANAS"].includes(normalized)) return "2_WEEKS";
  if (["3_WEEKS", "CADA_3_SEMANAS"].includes(normalized)) return "3_WEEKS";
  if (["4_WEEKS", "CADA_4_SEMANAS"].includes(normalized)) return "4_WEEKS";
  return normalized || "WEEKLY";
}

export function getPickupFrequencyLabel(frequency) {
  const normalized = normalizePickupFrequency(frequency);
  if (normalized === "2_WEEKS") return "Cada 2 semanas";
  if (normalized === "3_WEEKS") return "Cada 3 semanas";
  if (normalized === "4_WEEKS") return "Cada 4 semanas";
  return "Cada semana";
}

export function getPickupFrequencyClass(frequency) {
  const normalized = normalizePickupFrequency(frequency);
  if (normalized === "WEEKLY") return "bg-green-600 text-white";
  if (normalized === "2_WEEKS") return "bg-blue-600 text-white";
  if (normalized === "3_WEEKS") return "bg-orange-500 text-white";
  if (normalized === "4_WEEKS") return "bg-red-600 text-white";
  return "bg-slate-500 text-white";
}
