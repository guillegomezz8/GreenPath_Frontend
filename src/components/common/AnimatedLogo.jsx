import React from "react";

/**
 * size:
 *  - "auto" (recomendado): usa clamp() para adaptar el tamaño
 *  - "small" | "medium" | "large": tamaños fijos orientativos
 */
export function AnimatedLogo({ src, alt, size = "auto", className = "" }) {
  const pxSize = { small: 140, medium: 180, large: 220 };
  const logoSize =
    size === "auto" ? "clamp(140px, 28vw, 240px)" : `${pxSize[size] || 180}px`;

  return (
    <div
      className={`animated-logo relative inline-block ${className}`}
      style={{ "--logo-size": logoSize }}
    >
      {/* Aros decorativos */}
      <div className="absolute inset-0 pointer-events-none">
        <div
          className="absolute rounded-full border-4"
          style={{
            inset: "calc(var(--ring1) * -1)",
            borderColor: "#10b981",
            borderStyle: "solid",
            animation: "al-rotate 20s linear infinite",
          }}
        />
        <div
          className="absolute rounded-full border-2"
          style={{
            inset: "calc(var(--ring2) * -1)",
            borderColor: "rgba(16, 185, 129, 0.3)",
            borderStyle: "solid",
            animation: "al-rotate 15s linear infinite reverse",
          }}
        />
      </div>

      {/* Tarjeta + logo */}
      <div
        className="relative z-10 bg-white rounded-3xl shadow-xl transition-transform duration-300 group-hover:-translate-y-2"
        style={{
          width: "var(--logo-size)",
          padding: "var(--pad)",
          boxShadow: "0 25px 50px -12px rgba(0,0,0,.25)",
        }}
      >
        <img src={src} alt={alt} className="block w-full h-auto max-w-full" />
      </div>

      {/* Dots (oculta el pequeño en xs para evitar solapado) */}
      <div
        className="absolute rounded-full"
        style={{
          width: "var(--dot)",
          height: "var(--dot)",
          top: "calc(var(--dot) * -0.8)",
          right: "calc(var(--dot) * -0.8)",
          background: "#10b981",
          animation: "al-bounce 2s infinite",
        }}
      />
      <div
        className="absolute rounded-full"
        style={{
          width: "calc(var(--dot) * 0.8)",
          height: "calc(var(--dot) * 0.8)",
          bottom: "calc(var(--dot) * -0.8)",
          left: "calc(var(--dot) * -0.8)",
          background: "#059669",
          animation: "al-bounce 2s infinite 1s",
        }}
      />

      {/* Styles locales y variables responsivas */}
      <style>{`
        .animated-logo {
          --logo-size: ${logoSize};
          --pad: clamp(24px, 6vw, 48px);
          --ring1: clamp(16px, 4vw, 24px);
          --ring2: clamp(10px, 2.8vw, 16px);
          --dot: clamp(14px, 3.5vw, 20px);
        }

        @keyframes al-rotate {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
        @keyframes al-bounce {
          0%, 100% { transform: translateY(0); }
          50%      { transform: translateY(-10%); }
        }

        /* Menos animaciones si el usuario lo prefiere */
        @media (prefers-reduced-motion: reduce) {
          .animated-logo * {
            animation: none !important;
            transition: none !important;
          }
        }

        /* Alturas muy pequeñas (móviles con teclado abierto, etc.) */
        @media (max-height: 700px) {
          .animated-logo {
            --logo-size: clamp(120px, 24vw, 200px);
            --pad: clamp(18px, 4.5vw, 32px);
          }
        }
      `}</style>
    </div>
  );
}
