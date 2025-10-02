import axios from "axios";
import { jwtDecode } from "jwt-decode";
import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useRef,
} from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
} from "@mui/material";
import { useNavigate } from "react-router-dom";

const AuthContext = createContext();
const apiUrl = import.meta.env.VITE_APP_API_URL;

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [authenticated, setAuthenticated] = useState(false);
  const [user, setUser] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [timeLeft, setTimeLeft] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  const modalShownRef = useRef(false);
  const intervalRef = useRef(null);

  const clearExistingInterval = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };

  const startTokenTimer = (token) => {
    try {
      const decoded = jwtDecode(token);
      const expiration = decoded.exp * 1000;
      const showModalAt = expiration - 60000;
      modalShownRef.current = false;

      clearExistingInterval();

      intervalRef.current = setInterval(() => {
        const now = Date.now();

        if (now >= expiration) {
          clearExistingInterval();
          handleLogout();
        } else if (now >= showModalAt && !modalShownRef.current) {
          setModalOpen(true);
          modalShownRef.current = true;
        }

        setTimeLeft(expiration - now);
      }, 1000);
    } catch (err) {
      console.error("Error decoding token:", err);
      handleLogout();
    }
  };

  const handleLogout = useCallback(() => {
    clearExistingInterval();
    localStorage.removeItem("AccessToken");
    localStorage.removeItem("RefreshToken");
    localStorage.removeItem("UserData");
    setAuthenticated(false);
    setUser(null);
    setModalOpen(false);
    setTimeLeft(null);
    modalShownRef.current = false;
    navigate("/socialLogin");
  }, [navigate]);

  const login = async (username, password) => {
    try {
      setIsLoading(true);
      const url = `${apiUrl}/login/`;
      const response = await axios.post(url, { username, password });
      const data = response.data;

      const accessToken = data.token;
      const refreshToken = data["refresh-token"];
      const userData = data.user;

      if (!accessToken || !userData) {
        throw new Error("Datos de autenticación incompletos");
      }

      const decoded = jwtDecode(accessToken);

      const userWithRoles = {
        ...userData,
        roles: [userData.role_type],
        ...decoded,
      };

      localStorage.setItem("AccessToken", accessToken);
      localStorage.setItem("UserData", JSON.stringify(userWithRoles));
      if (refreshToken) {
        localStorage.setItem("RefreshToken", refreshToken);
      }

      setUser(userWithRoles);
      setAuthenticated(true);
      
      startTokenTimer(accessToken);

      navigate("/clients", { replace: true });

    } catch (error) {
      console.error('Error al iniciar sesión:', error);
      handleLogout();
    } finally {
      setIsLoading(false);
    }
  };

  // Nueva función para login con Google
  const googleLogin = (data) => {
    try {
      setIsLoading(true);

      // Extraer los tokens y datos del usuario de la respuesta
      const accessToken = data.t || data.token;
      const refreshToken = data["refresh-token"];
      const userData = data.user;

      if (!accessToken || !userData) {
        throw new Error("Datos de autenticación de Google incompletos");
      }

      // Decodificar el token para obtener información adicional
      const decoded = jwtDecode(accessToken);

      // Crear objeto de usuario con roles
      const userWithRoles = {
        ...userData,
        roles: [userData.role_type],
        ...decoded,
      };

      // Guardar en localStorage
      localStorage.setItem("AccessToken", accessToken);
      localStorage.setItem("UserData", JSON.stringify(userWithRoles));
      if (refreshToken) {
        localStorage.setItem("RefreshToken", refreshToken);
      }

      // Actualizar estado
      setUser(userWithRoles);
      setAuthenticated(true);
      
      // Iniciar temporizador de token
      startTokenTimer(accessToken);

      // Navegar a la página principal
      navigate("/clients", { replace: true });

    } catch (error) {
      console.error('Error al iniciar sesión con Google:', error);
      handleLogout();
      throw error; // Re-lanzar para que el componente que llama pueda manejarlo
    } finally {
      setIsLoading(false);
    }
  };

  const handleModalClose = () => {
    setModalOpen(false);
    setTimeLeft(null);
  };

  const handleRefreshToken = async () => {
    try {
      const refreshToken = localStorage.getItem("RefreshToken");
      if (!refreshToken) {
        throw new Error("No refresh token available");
      }

      const response = await api().post("/token/refresh/", {
        refresh: refreshToken,
      });

      const newAccessToken = response.data.access;
      
      const decoded = jwtDecode(newAccessToken);
      
      const updatedUser = {
        ...user,
        ...decoded,
      };

      setUser(updatedUser);
      localStorage.setItem("AccessToken", newAccessToken);
      localStorage.setItem("UserData", JSON.stringify(updatedUser));
      
      startTokenTimer(newAccessToken);
      handleModalClose();
      
    } catch (error) {
      console.error("Error al refrescar token:", error);
      handleLogout();
    }
  };

  const api = useCallback(() => {
    const token = localStorage.getItem("AccessToken");
    const instance = axios.create({
      baseURL: apiUrl,
      headers: {
        Authorization: token ? `Bearer ${token}` : undefined,
      },
    });

    instance.interceptors.response.use(
      (res) => res,
      (err) => {
        if (err.response?.status === 401) {
          handleLogout();
        }
        return Promise.reject(err);
      }
    );

    return instance;
  }, [handleLogout]);

  useEffect(() => {
    const loadUser = async () => {
      const token = localStorage.getItem("AccessToken");
      if (!token) {
        setIsLoading(false);
        return;
      }

      try {
        const savedUser = localStorage.getItem("UserData");
        if (savedUser) {
          const parsedUser = JSON.parse(savedUser);
          setUser(parsedUser);
          setAuthenticated(true);
        }

        const decoded = jwtDecode(token);
        const now = Date.now();
        const expiration = decoded.exp * 1000;
        
        if (now >= expiration) {
          handleLogout();
          return;
        }

        if (!savedUser) {
          handleLogout();
          return;
        }

        startTokenTimer(token);
        
      } catch (err) {
        console.error("Token inválido:", err);
        handleLogout();
      } finally {
        setIsLoading(false);
      }
    };

    loadUser();
  }, [handleLogout]);

  useEffect(() => {
    return () => clearExistingInterval();
  }, []);

  return (
    <AuthContext.Provider
      value={{
        authenticated,
        user,
        userRole: user?.role,
        userName: user?.username,
        login,
        googleLogin, // ✅ Exportar la nueva función
        logout: handleLogout,
        api,
        isLoading,
      }}
    >
      {!isLoading && children}
      <Dialog open={modalOpen} onClose={handleModalClose}>
        <DialogTitle>Tu sesión está por expirar</DialogTitle>
        <DialogContent>
          <p>
            ¿Quieres mantener tu sesión? Te quedan{" "}
            {Math.floor(timeLeft / 1000)} segundos.
          </p>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleRefreshToken} variant="contained">
            Sí
          </Button>
          <Button onClick={handleLogout} variant="outlined">
            No
          </Button>
        </DialogActions>
      </Dialog>
    </AuthContext.Provider>
  );
};