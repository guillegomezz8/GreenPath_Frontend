import { Loader2 } from "lucide-react";
import React from "react";

const LoadingModal = ({ show, text = "Cargando..." }) => {
  if (!show) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50">
      <div className="flex flex-col items-center gap-4 rounded-lg bg-white px-8 py-6 shadow-lg">
        <Loader2 className="h-8 w-8 animate-spin text-gray-700" />
        <span className="text-sm text-gray-800 font-medium">{text}</span>
      </div>
    </div>
  );
};

export default LoadingModal;
