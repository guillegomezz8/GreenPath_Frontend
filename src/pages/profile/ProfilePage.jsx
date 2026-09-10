import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/context/AuthProvider";
import { useSnackbar } from "@/context/SnackbarProvider";
import { getInitials, handleApiError, getRoleLabel, getRoleBadgeClass, normalizeRoleType } from "@/components/Utils";
import {
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

function toDateInputValue(value) {
  if (!value) return "";
  if (typeof value === "string") return value.slice(0, 10);
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "";
  return parsed.toISOString().slice(0, 10);
}

export default function ProfilePage() {
  const { api, updateAuthUser, user } = useAuth();
  const showSnackbar = useSnackbar();

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
    surname: "",
    phone: "",
    address: "",
    dni: "",
    birth_date: "",
    cif: "",
    city: "",
    postal_code: "",
    country: "",
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
      surname: typeof profile?.surname === "string" ? profile.surname : "",
      phone: typeof profile?.phone === "string" ? profile.phone : "",
      address: typeof profile?.address === "string" ? profile.address : "",
      dni: typeof profile?.dni === "string" ? profile.dni : "",
      birth_date: toDateInputValue(profile?.birth_date),
      cif: typeof profile?.cif === "string" ? profile.cif : "",
      city: typeof profile?.city === "string" ? profile.city : "",
      postal_code: typeof profile?.postal_code === "string" ? profile.postal_code : "",
      country: typeof profile?.country === "string" ? profile.country : "",
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
        name: profileForm.name.trim(),
        phone: profileForm.phone.trim(),
      };

      if (effectiveRoleType === "client") {
        payload.cif = profileForm.cif.trim();
        payload.address = profileForm.address.trim();
        payload.city = profileForm.city.trim();
        payload.postal_code = profileForm.postal_code.trim();
        payload.country = profileForm.country.trim();
      } else {
        payload.surname = profileForm.surname.trim();
        payload.address = profileForm.address.trim();
        payload.dni = profileForm.dni.trim();
        payload.birth_date = profileForm.birth_date || null;
      }

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

  const effectiveRoleType = useMemo(() => normalizeRoleType(profileMeta.role_type || user?.role_type || ""), [profileMeta.role_type, user?.role_type]);
  const roleLabel = useMemo(() => getRoleLabel(effectiveRoleType), [effectiveRoleType]);
  const avatarSrc = useMemo(() => buildMediaUrl(profileExtra?.photo), [profileExtra?.photo]);
  const canEditPhoto = useMemo(
    () => Boolean(profileExtra && typeof profileExtra === "object" && Object.prototype.hasOwnProperty.call(profileExtra, "photo")),
    [profileExtra]
  );
  const roleBadgeClass = useMemo(() => getRoleBadgeClass(effectiveRoleType), [effectiveRoleType]);
  const statusBadgeClass = useMemo(
    () =>
      profileMeta.is_active
        ? "bg-green-600 text-white"
        : "bg-red-600 text-white",
    [profileMeta.is_active]
  );
  const displayName = useMemo(() => {
    const composed = [profileForm.name, profileForm.surname].filter(Boolean).join(" ").trim();
    return composed || profileForm.username || "Usuario";
  }, [profileForm.name, profileForm.surname, profileForm.username]);

  const detailItems = useMemo(() => {
    const commonItems = [
      { key: "username", label: "Usuario", icon: User, value: profileForm.username },
      { key: "company", label: "Empresa", icon: Building2, value: profileExtra?.company || profileExtra?.companies },
    ];

    if (effectiveRoleType === "client") {
      return [
        ...commonItems,
        { key: "frequency", label: "Frecuencia", icon: Calendar, value: profileExtra?.frequency },
      ];
    }

    return commonItems;
  }, [effectiveRoleType, profileExtra, profileForm.username]);

  return (
    <div className="space-y-6">
      <div className="flex items-start sm:items-center">
        <div className="min-w-0 flex-1">
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-foreground flex flex-wrap items-center gap-2 lg:gap-3 leading-tight">
            <UserCircle2 className="w-6 h-6 sm:w-7 sm:h-7 lg:w-8 lg:h-8 text-primary flex-shrink-0" />
            <span>Mi perfil</span>
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground mt-1 text-left">Gestiona tus datos personales y la seguridad de tu cuenta.</p>
        </div>
      </div>

      <Card className="overflow-hidden border-primary/20">
        <div className="h-24 bg-gradient-to-r from-emerald-700/30 via-emerald-500/20 to-cyan-500/25" />
        <CardContent className="pt-0 -mt-12">
          <div className="flex flex-col items-center text-center gap-4">
            <Avatar size="xl" className="border-4 border-white shadow-sm">
              {avatarSrc && <AvatarImage src={avatarSrc} alt={displayName} className="object-cover" />}
              <AvatarFallback size="xl" className="bg-primary text-primary-foreground font-bold">
                {getInitials(profileForm.name || profileForm.username, profileForm.surname || "")}
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
        <TabsList className="grid h-11 w-full max-w-md grid-cols-2 rounded-lg border border-border/80 bg-white/90 p-1 shadow-sm">
          <TabsTrigger
            value="profile"
            className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-none data-[state=inactive]:text-muted-foreground"
          >
            Datos
          </TabsTrigger>
          <TabsTrigger
            value="password"
            className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-none data-[state=inactive]:text-muted-foreground"
          >
            Seguridad
          </TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="mt-4 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mail className="w-5 h-5 text-primary" />
                Datos editables
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <p className="text-sm text-muted-foreground text-left">Cargando perfil...</p>
              ) : (
                <form onSubmit={handleSaveProfile} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
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

                    {effectiveRoleType !== "client" ? (
                      <div className="space-y-2">
                        <Label htmlFor="profile_surname">Apellidos</Label>
                        <Input
                          id="profile_surname"
                          value={profileForm.surname}
                          onChange={(e) => handleProfileChange("surname", e.target.value)}
                          disabled={savingProfile}
                          placeholder="Apellidos"
                        />
                      </div>
                    ) : null}

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

                    {effectiveRoleType !== "client" ? (
                      <>
                        <div className="space-y-2">
                          <Label htmlFor="profile_dni">DNI</Label>
                          <Input
                            id="profile_dni"
                            value={profileForm.dni}
                            onChange={(e) => handleProfileChange("dni", e.target.value)}
                            disabled={savingProfile}
                            placeholder="12345678Z"
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="profile_birth_date">Fecha de nacimiento</Label>
                          <Input
                            id="profile_birth_date"
                            type="date"
                            value={profileForm.birth_date}
                            onChange={(e) => handleProfileChange("birth_date", e.target.value)}
                            disabled={savingProfile}
                          />
                        </div>

                        <div className="space-y-2 md:col-span-2 xl:col-span-3">
                          <Label htmlFor="profile_address">Direccion</Label>
                          <Input
                            id="profile_address"
                            value={profileForm.address}
                            onChange={(e) => handleProfileChange("address", e.target.value)}
                            disabled={savingProfile}
                            placeholder="Direccion completa"
                          />
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="space-y-2">
                          <Label htmlFor="profile_cif">CIF</Label>
                          <Input
                            id="profile_cif"
                            value={profileForm.cif}
                            onChange={(e) => handleProfileChange("cif", e.target.value)}
                            disabled={savingProfile}
                            placeholder="B12345678"
                          />
                        </div>

                        <div className="space-y-2 md:col-span-2 xl:col-span-3">
                          <Label htmlFor="profile_address">Direccion</Label>
                          <Input
                            id="profile_address"
                            value={profileForm.address}
                            onChange={(e) => handleProfileChange("address", e.target.value)}
                            disabled={savingProfile}
                            placeholder="Calle, numero, ciudad"
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="profile_city">Ciudad</Label>
                          <Input
                            id="profile_city"
                            value={profileForm.city}
                            onChange={(e) => handleProfileChange("city", e.target.value)}
                            disabled={savingProfile}
                            placeholder="Ciudad"
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="profile_postal_code">Codigo postal</Label>
                          <Input
                            id="profile_postal_code"
                            value={profileForm.postal_code}
                            onChange={(e) => handleProfileChange("postal_code", e.target.value)}
                            disabled={savingProfile}
                            placeholder="41001"
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="profile_country">Pais</Label>
                          <Input
                            id="profile_country"
                            value={profileForm.country}
                            onChange={(e) => handleProfileChange("country", e.target.value)}
                            disabled={savingProfile}
                            placeholder="España"
                          />
                        </div>
                      </>
                    )}
                  </div>

                  <div className="pt-2">
                    <Button type="submit" disabled={savingProfile} className="w-full gap-2 sm:w-auto">
                      <Save className="w-4 h-4" />
                      {savingProfile ? "Guardando..." : "Guardar cambios"}
                    </Button>
                  </div>
                </form>
              )}
            </CardContent>
          </Card>

          <Card role="region" aria-labelledby="profile-readonly-details-title">
            <CardHeader>
              <CardTitle id="profile-readonly-details-title" className="flex items-center gap-2">
                <IdCard className="w-5 h-5 text-primary" />
                Detalles del perfil
              </CardTitle>
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
