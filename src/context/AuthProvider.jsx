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
import { normalizeRoleType, getRoleLabel } from "@/components/Utils";

const AuthContext = createContext();
const apiUrl = import.meta.env.VITE_APP_API_URL;

export const useAuth = () => useContext(AuthContext);

const normalizeAuthUser = (userData = {}) => {
  const normalizedRoleType = normalizeRoleType(userData?.role_type);
  return {
    ...(userData || {}),
    role_type: normalizedRoleType,
    role_label: getRoleLabel(normalizedRoleType),
  };
};

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

      const userWithRoles = normalizeAuthUser({
        ...userData,
        roles: userData.role_type,
        ...decoded,
      });

      localStorage.setItem("AccessToken", accessToken);
      localStorage.setItem("UserData", JSON.stringify(userWithRoles));
      if (refreshToken) {
        localStorage.setItem("RefreshToken", refreshToken);
      }

      setUser(userWithRoles);
      setAuthenticated(true);
      
      startTokenTimer(accessToken);

      const roleType = userWithRoles?.role_type;
      let targetPath = "/dashboard";
      if (roleType === "worker") targetPath = "/routes";
      if (roleType === "client") targetPath = "/my-requests";
      navigate(targetPath, { replace: true });

    } catch (error) {
      console.error('Error al iniciar sesión:', error);
      handleLogout();
    } finally {
      setIsLoading(false);
    }
  };

  const googleLogin = (data) => {
    try {
      setIsLoading(true);

      const accessToken = data.t || data.token;
      const refreshToken = data["refresh-token"];
      const userData = data.user;

      if (!accessToken || !userData) {
        throw new Error("Datos de autenticación de Google incompletos");
      }

      const decoded = jwtDecode(accessToken);

      const userWithRoles = normalizeAuthUser({
        ...userData,
        ...decoded,
      });

      console.log("Datos del usuario de Google:", userWithRoles);

      localStorage.setItem("AccessToken", accessToken);
      localStorage.setItem("UserData", JSON.stringify(userWithRoles));
      if (refreshToken) {
        localStorage.setItem("RefreshToken", refreshToken);
      }

      setUser(userWithRoles);
      setAuthenticated(true);
      
      startTokenTimer(accessToken);
    } catch (error) {
      console.error('Error al iniciar sesión con Google:', error);
      handleLogout();
      throw error;
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
      const normalizedUpdatedUser = normalizeAuthUser(updatedUser);

      setUser(normalizedUpdatedUser);
      localStorage.setItem("AccessToken", newAccessToken);
      localStorage.setItem("UserData", JSON.stringify(normalizedUpdatedUser));
      
      startTokenTimer(newAccessToken);
      handleModalClose();
      
    } catch (error) {
      console.error("Error al refrescar token:", error);
      handleLogout();
    }
  };

  const updateAuthUser = useCallback((partialUserData = {}) => {
    setUser((prev) => {
      const next = normalizeAuthUser({ ...(prev || {}), ...(partialUserData || {}) });
      localStorage.setItem("UserData", JSON.stringify(next));
      return next;
    });
  }, []);

  const api = useCallback(() => {
    const token = localStorage.getItem("AccessToken");
    const instance = axios.create({
      baseURL: apiUrl,
      headers: {
        Authorization: token ? `Bearer ${token}` : undefined,
        "ngrok-skip-browser-warning": "true",
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
          const normalizedUser = normalizeAuthUser(parsedUser);
          setUser(normalizedUser);
          localStorage.setItem("UserData", JSON.stringify(normalizedUser));
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
        userName: user?.username,
        login,
        googleLogin,
        logout: handleLogout,
        api,
        updateAuthUser,
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

