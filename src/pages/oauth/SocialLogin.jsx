import { useEffect, useRef, useCallback, useState } from "react";
import axios from "axios";
import { jwtDecode } from "jwt-decode";
import { AnimatedLogo } from "@/components/common/AnimatedLogo";
import greenPathLogo from "@/assets/greenpath.png";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthProvider";
import { normalizeRoleType } from "@/components/Utils";

const apiUrl = import.meta.env.VITE_APP_API_URL;
const signature = import.meta.env.VITE_GOOGLE_SIGNATURE;
const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;

export default function SocialLogin() {
  const { googleLogin } = useAuth();
  const googleBtnRef = useRef(null);
  const initialized = useRef(false);
  const navigate = useNavigate();
  const [gisReady, setGisReady] = useState(false);

  const handleCredentialResponse = useCallback(async (response) => {
    if (!response?.credential) {
      console.error("No se recibió credential de Google");
      alert("Error al iniciar sesión con Google. Intenta de nuevo.");
      return;
    }

    try {
      const decoded = jwtDecode(response.credential);
      console.log("Usuario Google:", decoded.email);

      const { data } = await axios.post(`${apiUrl}/authenticate/login`, {
        email: decoded.email,
        token: response.credential,
        lang: "es",
        signature,
      });

      if (data?.t) {
        googleLogin(data);
        const roleType = normalizeRoleType(data?.user?.role_type);
        let targetPath = "/dashboard";
        if (roleType === "worker") targetPath = "/routes";
        if (roleType === "client") targetPath = "/my-requests";
        navigate(targetPath);
      } else {
        throw new Error("Token no recibido del backend");
      }
    } catch (err) {
      console.error("Error durante login social:", err.response?.data || err.message);
      alert("Error al iniciar sesión. Verifica tus credenciales.");
    }
  }, [googleLogin, navigate, apiUrl, signature]);

  useEffect(() => {
    if (window.google) {
      setGisReady(true);
      return;
    }

    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    script.onload = () => setGisReady(true);
    script.onerror = () => console.error("Error cargando Google Sign-In");
    document.body.appendChild(script);

    return () => {
      if (script.parentNode) {
        script.parentNode.removeChild(script);
      }
    };
  }, []);

  useEffect(() => {
    if (!gisReady || !googleClientId || !googleBtnRef.current || initialized.current) {
      return;
    }

    try {
      // Inicializar Google Sign-In
      window.google.accounts.id.initialize({
        client_id: googleClientId,
        callback: handleCredentialResponse,
        auto_select: false,
        cancel_on_tap_outside: true,
      });

      initialized.current = true;

      const renderResponsiveButton = () => {
        if (!googleBtnRef.current) return;

        const containerWidth = googleBtnRef.current.offsetWidth || 300;
        const width = Math.round(Math.min(Math.max(containerWidth, 200), 400));
        const size = width < 280 ? "medium" : "large";

        googleBtnRef.current.innerHTML = "";
        
        window.google.accounts.id.renderButton(googleBtnRef.current, {
          type: "standard",
          theme: "outline",
          size,
          text: "signin_with",
          shape: "rectangular",
          width,
          locale: "es",
        });
      };

      // Renderizar botón inicialmente
      renderResponsiveButton();

      // Observer para cambios de tamaño
      const ro = new ResizeObserver(() => renderResponsiveButton());
      ro.observe(googleBtnRef.current);

      return () => ro.disconnect();
    } catch (error) {
      console.error("Error inicializando Google Sign-In:", error);
    }
  }, [gisReady, googleClientId, handleCredentialResponse]);

  return (
    <div className="overflow-hidden flex items-center justify-center p-4">
      <div className="w-full max-w-md mt-10">
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-8 mb-6">
          <div className="text-center space-y-4">
            <div className="flex items-center justify-center mb-6">
              <AnimatedLogo src={greenPathLogo} alt="GreenPath" />
            </div>

            <div className="mb-8">
              <h2 className="text-xl font-semibold text-gray-800 mb-2">
                Bienvenido de nuevo
              </h2>
              <p className="text-gray-600 text-sm">
                Inicia sesión para acceder a la plataforma
              </p>
            </div>

            {!gisReady && (
              <div className="text-sm text-gray-500">
                Cargando opciones de inicio de sesión...
              </div>
            )}

            <div className="flex justify-center">
              <div
                ref={googleBtnRef}
                id="google-signin-button"
                className="w-full max-w-[360px] sm:max-w-[380px] md:max-w-[400px]"
                aria-label="Iniciar sesión con Google"
              />
            </div>

            <div className="mt-6">
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-300" />
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-white text-gray-500">O continúa con</span>
                </div>
              </div>

              <div className="mt-4 space-y-3">
                <button
                  onClick={() => navigate("/login")}
                  className="w-full max-w-[360px] sm:max-w-[380px] md:max-w-[400px] mx-auto flex items-center justify-center px-4 py-2 border border-gray-300 rounded-lg shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors"
                >
                  <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
                  </svg>
                  Acceso con credenciales
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="text-center mt-6">
          <p className="text-xs text-gray-500">
            Diseñado por Guillermo Gómez {new Date().getFullYear()}
          </p>
          <p className="text-xs text-gray-400 mt-1">
            Optimización de Recogida de Aceites Usados
          </p>
        </div>
      </div>
    </div>
  );
}
