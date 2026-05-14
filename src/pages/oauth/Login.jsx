import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { AnimatedLogo } from "@/components/common/AnimatedLogo";
import greenPathLogo from "@/assets/greenpath.png";
import { AlertCircle, Eye, EyeOff } from "lucide-react";
import { useAuth } from "@/context/AuthProvider";

const getLoginErrorMessage = (err) => {
  const data = err?.response?.data;
  if (typeof data === "string") return data;
  return data?.Error || data?.error || data?.detail || data?.message || "Contraseña o nombre de usuario incorrectos";
};

export default function Login() {
  const { login } = useAuth();
  const [user, setUser] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loginError, setLoginError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoginError("");
    setLoading(true);
    try {
      await login(user, password);
    } catch (err) {
      const message = getLoginErrorMessage(err);
      setLoginError(message);
    } finally {
      setLoading(false);
    }
  };

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
                Introduce tus credenciales
              </h2>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4 mt-5">
              <div className="space-y-2">
                <Input
                  id="username"
                  type="text"
                  placeholder="Usuario"
                  value={user}
                  onChange={(e) => {
                    setUser(e.target.value);
                    setLoginError("");
                  }}
                  required
                />
              </div>

              <div className="min-w-0 space-y-2">
                <div className="relative min-w-0">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Contraseña"
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      setLoginError("");
                    }}
                    className="truncate pr-12"
                    required
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>

              {loginError && (
                <div
                  className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-left text-sm text-red-700"
                  role="alert"
                  aria-live="polite"
                >
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>{loginError}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full max-w-[300px] mx-auto flex items-center justify-center px-4 py-2 border border-gray-300 rounded-lg shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors"
              >
                <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
                </svg>
                {loading ? "Iniciando sesión..." : "Iniciar Sesión"}
              </button>
            </form>
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
