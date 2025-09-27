import { useEffect, useRef, useCallback, useState } from "react";
import axios from "axios";
import { jwtDecode } from "jwt-decode";
import { AnimatedLogo } from "@/components/common/AnimatedLogo";
import greenPathLogo from "@/assets/greenpath.png";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthProvider";

const apiUrl = import.meta.env.VITE_APP_API_URL;
const signature = import.meta.env.VITE_GOOGLE_SIGNATURE;
const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;

export default function SocialLogin() {
  const { login } = useAuth();
  const googleBtnRef = useRef(null);
  const initialized = useRef(false);
  const navigate = useNavigate();
  const [gisReady, setGisReady] = useState(!!window.google);

  const handleCredentialResponse = useCallback(async (response) => {
    if (!response?.credential) {
      alert("Error al iniciar sesión con Google. Intenta de nuevo.");
      return;
    }

    try {
      const decoded = jwtDecode(response.credential);

      const { data } = await axios.post(`${apiUrl}/authenticate/login`, {
        email: decoded.email,
        token: response.credential,
        lang: "es",
        signature,
      });

      if (data?.t) {
        login(data);
      } else {
        throw new Error("Token no recibido del backend");
      }
    } catch (err) {
      console.error("Error durante login social:", err.response?.data || err.message);
      alert("Error al iniciar sesión. Intenta de nuevo.");
    }
  }, [login]);

  useEffect(() => {
    if (window.google) setGisReady(true);
  }, []);

  useEffect(() => {
    if (!gisReady || !googleClientId || !googleBtnRef.current) return;

    if (!initialized.current) {
      window.google.accounts.id.initialize({
        client_id: googleClientId,
        callback: handleCredentialResponse,
      });
      initialized.current = true;
    }

    const renderResponsiveButton = () => {
      if (!googleBtnRef.current) return;

      const width = Math.round(
        Math.min(Math.max(googleBtnRef.current.offsetWidth || 300, 200), 400)
      );

      const size = width < 280 ? "medium" : "large";

      googleBtnRef.current.innerHTML = "";
      window.google.accounts.id.renderButton(googleBtnRef.current, {
        type: "standard",
        theme: "outline",
        size,
        text: "signin_with",
        shape: "rectangular",
        width,
      });
    };

    renderResponsiveButton();

    const ro = new ResizeObserver(() => renderResponsiveButton());
    ro.observe(googleBtnRef.current);

    return () => ro.disconnect();
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
