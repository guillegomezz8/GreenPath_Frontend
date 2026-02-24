import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/context/AuthProvider";
import { useSnackbar } from "@/context/SnackbarProvider";
import { getInitials, handleApiError } from "@/components/Utils";
import {
  ArrowLeft,
  KeyRound,
  Mail,
  Save,
  Shield,
  UserCircle2,
  User,
  Phone,
  IdCard,
  Calendar,
  MapPin,
  Building2,
  Camera,
  Loader2,
} from "lucide-react";

function getRoleLabel(roleType) {
  if (roleType === "owner") return "Propietario";
  if (roleType === "worker") return "Trabajador";
  if (roleType === "client") return "Cliente";
  return "Usuario";
}

function normalizeValue(value) {
  if (value === null || value === undefined) return "-";
  if (Array.isArray(value)) {
    if (!value.length) return "-";
    const parsedArray = value
      .map((item) => {
        if (item && typeof item === "object") return item.name || item.username || item.email || "";
        return `${item || ""}`;
      })
      .filter(Boolean)
      .join(", ")
      .trim();
    return parsedArray || "-";
  }
  const parsed = `${value}`.trim();
  return parsed ? parsed : "-";
}

function buildMediaUrl(url) {
  if (!url) return null;
  if (url.startsWith("http")) return url;
  return `${import.meta.env.VITE_APP_API_URL}${url}`;
}

export default function ProfilePage() {
  const { api, updateAuthUser, user } = useAuth();
  const showSnackbar = useSnackbar();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState("profile");
  const [loading, setLoading] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [savingPhoto, setSavingPhoto] = useState(false);
  const photoInputRef = useRef(null);
  const [profileMeta, setProfileMeta] = useState({
    is_active: true,
    is_staff: false,
    role_type: "",
  });
  const [profileExtra, setProfileExtra] = useState({});
  const [profileForm, setProfileForm] = useState({
    username: "",
    email: "",
    name: "",
    phone: "",
  });
  const [passwordForm, setPasswordForm] = useState({
    password: "",
    password2: "",
  });

  const fillProfileData = useCallback((data) => {
    const profile = data?.profile || {};
    setProfileExtra(profile);
    setProfileMeta({
      is_active: Boolean(data?.is_active),
      is_staff: Boolean(data?.is_staff),
      role_type: data?.role_type || "",
    });
    setProfileForm({
      username: data?.username || "",
      email: data?.email || "",
      name: typeof profile?.name === "string" ? profile.name : "",
      phone: typeof profile?.phone === "string" ? profile.phone : "",
    });
  }, []);

  const fetchProfile = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api().get("users/profile/");
      fillProfileData(res.data || {});
    } catch (e) {
      const msg = handleApiError(e, "No se pudo cargar el perfil.");
      showSnackbar(msg, "error");
    } finally {
      setLoading(false);
    }
  }, [api, fillProfileData, showSnackbar]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  const handleProfileChange = (field, value) => {
    setProfileForm((prev) => ({ ...prev, [field]: value }));
  };

  const handlePasswordChange = (field, value) => {
    setPasswordForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleOpenPhotoSelector = () => {
    if (!photoInputRef.current || savingPhoto) return;
    photoInputRef.current.click();
  };

  const handlePhotoChange = async (e) => {
    if (!(profileExtra && typeof profileExtra === "object" && Object.prototype.hasOwnProperty.call(profileExtra, "photo"))) {
      showSnackbar("Tu perfil no permite cambiar imagen.", "error");
      return;
    }

    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      showSnackbar("Debes seleccionar una imagen valida.", "error");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      showSnackbar("La imagen no puede superar 5MB.", "error");
      return;
    }

    try {
      setSavingPhoto(true);
      const formData = new FormData();
      formData.append("photo", file);

      const res = await api().put("users/profile/", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      const updatedProfile = res.data || {};
      fillProfileData(updatedProfile);

      const authPatch = {
        email: updatedProfile.email,
        username: updatedProfile.username,
      };
      if (updatedProfile?.profile && "photo" in updatedProfile.profile) {
        authPatch.photo = updatedProfile.profile.photo;
      }
      updateAuthUser(authPatch);
      showSnackbar("Foto actualizada correctamente.", "success");
    } catch (e2) {
      const msg = handleApiError(e2, "No se pudo actualizar la foto.");
      showSnackbar(msg, "error");
    } finally {
      setSavingPhoto(false);
    }
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();

    if (!profileForm.email.trim()) {
      showSnackbar("El email es obligatorio.", "error");
      return;
    }

    try {
      setSavingProfile(true);
      const payload = {
        email: profileForm.email.trim(),
      };
      if (profileForm.name.trim()) payload.name = profileForm.name.trim();
      if (profileForm.phone.trim()) payload.phone = profileForm.phone.trim();

      const res = await api().put("users/profile/", payload);
      const updatedProfile = res.data || {};

      fillProfileData(updatedProfile);
      const authPatch = {
        email: updatedProfile.email,
        username: updatedProfile.username,
      };
      if (updatedProfile?.profile && "photo" in updatedProfile.profile) {
        authPatch.photo = updatedProfile.profile.photo;
      }
      updateAuthUser(authPatch);

      showSnackbar("Perfil actualizado correctamente.", "success");
    } catch (e) {
      const msg = handleApiError(e, "No se pudo actualizar el perfil.");
      showSnackbar(msg, "error");
    } finally {
      setSavingProfile(false);
    }
  };

  const handleSavePassword = async (e) => {
    e.preventDefault();

    if (!passwordForm.password || !passwordForm.password2) {
      showSnackbar("Debes completar ambas contrasenas.", "error");
      return;
    }

    if (passwordForm.password.length < 6) {
      showSnackbar("La contrasena debe tener al menos 6 caracteres.", "error");
      return;
    }

    if (passwordForm.password !== passwordForm.password2) {
      showSnackbar("Las contrasenas no coinciden.", "error");
      return;
    }

    try {
      setSavingPassword(true);
      await api().post("users/set_password/", {
        password: passwordForm.password,
        password2: passwordForm.password2,
      });

      setPasswordForm({ password: "", password2: "" });
      showSnackbar("Contrasena actualizada correctamente.", "success");
    } catch (e) {
      const msg = handleApiError(e, "No se pudo cambiar la contrasena.");
      showSnackbar(msg, "error");
    } finally {
      setSavingPassword(false);
    }
  };

  const roleLabel = useMemo(() => getRoleLabel(profileMeta.role_type || user?.role_type), [profileMeta.role_type, user?.role_type]);
  const avatarSrc = useMemo(() => buildMediaUrl(profileExtra?.photo), [profileExtra?.photo]);
  const canEditPhoto = useMemo(
    () => Boolean(profileExtra && typeof profileExtra === "object" && Object.prototype.hasOwnProperty.call(profileExtra, "photo")),
    [profileExtra]
  );
  const roleBadgeClass = useMemo(() => {
    if (profileMeta.role_type === "owner") return "bg-indigo-600 text-white";
    if (profileMeta.role_type === "worker") return "bg-blue-600 text-white";
    if (profileMeta.role_type === "client") return "bg-cyan-600 text-white";
    return "bg-slate-600 text-white";
  }, [profileMeta.role_type]);
  const statusBadgeClass = useMemo(
    () =>
      profileMeta.is_active
        ? "bg-green-600 text-white"
        : "bg-red-600 text-white",
    [profileMeta.is_active]
  );
  const displayName = useMemo(() => {
    const composed = [profileForm.name, profileExtra?.surname].filter(Boolean).join(" ").trim();
    return composed || profileForm.username || "Usuario";
  }, [profileExtra?.surname, profileForm.name, profileForm.username]);

  const detailItems = useMemo(
    () => [
      { key: "username", label: "Usuario", icon: User, value: profileForm.username },
      { key: "email", label: "Email", icon: Mail, value: profileForm.email },
      { key: "phone", label: "Telefono", icon: Phone, value: profileForm.phone || profileExtra?.phone },
      { key: "surname", label: "Apellidos", icon: User, value: profileExtra?.surname },
      { key: "dni", label: "DNI", icon: IdCard, value: profileExtra?.dni },
      { key: "cif", label: "CIF", icon: IdCard, value: profileExtra?.cif },
      { key: "birth_date", label: "Fecha nacimiento", icon: Calendar, value: profileExtra?.birth_date },
      { key: "address", label: "Direccion", icon: MapPin, value: profileExtra?.address },
      { key: "city", label: "Ciudad", icon: Building2, value: profileExtra?.city },
      { key: "postal_code", label: "Codigo postal", icon: Building2, value: profileExtra?.postal_code },
      { key: "country", label: "Pais", icon: Building2, value: profileExtra?.country },
      { key: "company", label: "Empresa", icon: Building2, value: profileExtra?.company || profileExtra?.companies },
      { key: "frequency", label: "Frecuencia", icon: Calendar, value: profileExtra?.frequency },
    ],
    [profileExtra, profileForm.email, profileForm.phone, profileForm.username]
  );

  return (
    <div className="space-y-6">
      <div className="flex items-start gap-3 sm:items-center sm:gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard")} className="flex-shrink-0 mt-1 sm:mt-0">
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div className="min-w-0 flex-1">
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-foreground flex flex-wrap items-center gap-2 lg:gap-3 leading-tight">
            <UserCircle2 className="w-6 h-6 sm:w-7 sm:h-7 lg:w-8 lg:h-8 text-primary flex-shrink-0" />
            <span>Mi perfil</span>
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground mt-1 text-left">Gestiona tus datos personales y la seguridad de tu cuenta.</p>
        </div>
      </div>

      <Card className="overflow-hidden border-primary/20">
        <div className="h-24 bg-gradient-to-r from-emerald-600/15 via-green-500/10 to-teal-500/10" />
        <CardContent className="pt-0 -mt-12">
          <div className="flex flex-col items-center text-center gap-4">
            <Avatar size="xl" className="border-4 border-white shadow-sm">
              {avatarSrc && <AvatarImage src={avatarSrc} alt={displayName} className="object-cover" />}
              <AvatarFallback size="xl" className="bg-primary text-primary-foreground font-bold">
                {getInitials(profileForm.name || profileForm.username, profileExtra?.surname || "")}
              </AvatarFallback>
            </Avatar>
            <input
              ref={photoInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handlePhotoChange}
              disabled={savingPhoto}
            />
            {canEditPhoto ? (
              <Button type="button" variant="outline" className="gap-2" disabled={savingPhoto} onClick={handleOpenPhotoSelector}>
                {savingPhoto ? <Loader2 className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4" />}
                {savingPhoto ? "Subiendo..." : "Cambiar imagen"}
              </Button>
            ) : (
              <p className="text-xs text-muted-foreground">Este perfil no admite foto.</p>
            )}
            <div>
              <h2 className="text-xl font-semibold text-foreground">{loading ? "Cargando..." : displayName}</h2>
              <p className="text-sm text-muted-foreground">{normalizeValue(profileForm.email)}</p>
            </div>
            <div className="flex flex-wrap justify-center gap-2">
              <Badge className={roleBadgeClass}>
                {roleLabel}
              </Badge>
              <Badge className={statusBadgeClass}>
                {profileMeta.is_active ? "Activo" : "Inactivo"}
              </Badge>
              {profileMeta.is_staff && (
                <Badge className="bg-amber-500 text-black">
                  Staff
                </Badge>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="profile">Datos</TabsTrigger>
          <TabsTrigger value="password">Seguridad</TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="mt-4 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mail className="w-5 h-5 text-primary" />
                Datos editables
              </CardTitle>
              <CardDescription className="text-left">Puedes actualizar email, nombre y telefono.</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <p className="text-sm text-muted-foreground text-left">Cargando perfil...</p>
              ) : (
                <form onSubmit={handleSaveProfile} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="profile_email">Email</Label>
                      <Input
                        id="profile_email"
                        type="email"
                        value={profileForm.email}
                        onChange={(e) => handleProfileChange("email", e.target.value)}
                        disabled={savingProfile}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="profile_name">Nombre</Label>
                      <Input
                        id="profile_name"
                        value={profileForm.name}
                        onChange={(e) => handleProfileChange("name", e.target.value)}
                        disabled={savingProfile}
                        placeholder="Nombre"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="profile_phone">Telefono</Label>
                      <Input
                        id="profile_phone"
                        value={profileForm.phone}
                        onChange={(e) => handleProfileChange("phone", e.target.value)}
                        disabled={savingProfile}
                        placeholder="Telefono de contacto"
                      />
                    </div>
                  </div>

                  <div className="pt-2">
                    <Button type="submit" disabled={savingProfile} className="gap-2">
                      <Save className="w-4 h-4" />
                      {savingProfile ? "Guardando..." : "Guardar cambios"}
                    </Button>
                  </div>
                </form>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Detalles del perfil</CardTitle>
              <CardDescription className="text-left">Informacion de tu cuenta y perfil asociado.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {detailItems.map((item) => {
                  const Icon = item.icon;
                  const value = normalizeValue(item.value);
                  return (
                    <div key={item.key} className="rounded-lg border p-3 text-left">
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Icon className="w-4 h-4" />
                        <span className="text-xs uppercase tracking-wide">{item.label}</span>
                      </div>
                      <p className="mt-1 text-sm font-medium text-foreground break-words">{value}</p>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="password" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-primary" />
                Seguridad de cuenta
              </CardTitle>
              <CardDescription className="text-left">Cambia tu contrasena de acceso.</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSavePassword} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="password_1">Nueva contrasena</Label>
                    <Input
                      id="password_1"
                      type="password"
                      value={passwordForm.password}
                      onChange={(e) => handlePasswordChange("password", e.target.value)}
                      disabled={savingPassword}
                      placeholder="Minimo 6 caracteres"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="password_2">Repetir contrasena</Label>
                    <Input
                      id="password_2"
                      type="password"
                      value={passwordForm.password2}
                      onChange={(e) => handlePasswordChange("password2", e.target.value)}
                      disabled={savingPassword}
                    />
                  </div>
                </div>

                <div className="pt-2">
                  <Button type="submit" disabled={savingPassword} className="gap-2">
                    <KeyRound className="w-4 h-4" />
                    {savingPassword ? "Guardando..." : "Cambiar contrasena"}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
