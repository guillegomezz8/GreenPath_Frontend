import { clsx } from "clsx"
import { twMerge } from "tailwind-merge"
import axios from "axios";

export function handleApiError(error, defaultErrorMessage) {
  let errorMessage = defaultErrorMessage;
  console.log(error)
  if (error.response) {
    errorMessage = error.response.data.message;
    console.log(errorMessage);
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

export function getAvatarSrc(w) {
  return w.photo || w.avatar_url || w.photo_url || null;
}

export function formatNumber(n) {
  new Intl.NumberFormat("es-ES").format(n ?? 0);
  return n?.toLocaleString("es-ES") || "0";
}

export function formatCurrency(n) {
  new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" }).format(n ?? 0);
  return n?.toLocaleString("es-ES", { style: "currency", currency: "EUR" }) || "0 €";
}
