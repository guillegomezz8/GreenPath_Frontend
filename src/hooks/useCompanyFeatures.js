import { useCallback, useEffect, useState } from "react";

import { useAuth } from "@/context/AuthProvider";

const DEFAULT_FEATURES = {
  collections_enabled: false,
  bulk_collections_enabled: false,
};

export default function useCompanyFeatures() {
  const { api, authenticated } = useAuth();
  const [features, setFeatures] = useState(DEFAULT_FEATURES);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!authenticated) {
      setLoading(false);
      return;
    }
    try {
      const response = await api().get("companies/features/");
      setFeatures({ ...DEFAULT_FEATURES, ...(response.data || {}) });
    } catch {
      setFeatures(DEFAULT_FEATURES);
    } finally {
      setLoading(false);
    }
  }, [api, authenticated]);

  useEffect(() => {
    refresh();
    const handleUpdate = () => refresh();
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") refresh();
    };
    window.addEventListener("greenpath:company-features-updated", handleUpdate);
    window.addEventListener("focus", handleUpdate);
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      window.removeEventListener("greenpath:company-features-updated", handleUpdate);
      window.removeEventListener("focus", handleUpdate);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [refresh]);

  return { features, loading, refresh };
}
