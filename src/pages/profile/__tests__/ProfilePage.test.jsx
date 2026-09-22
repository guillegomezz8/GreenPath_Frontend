import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import ProfilePage from "../ProfilePage";

const mocks = vi.hoisted(() => {
  const snackbar = vi.fn();
  const updateAuthUser = vi.fn();
  const get = vi.fn();
  const put = vi.fn();
  const post = vi.fn();
  const apiFactory = vi.fn(() => ({
    get,
    put,
    post,
  }));

  return {
    snackbar,
    updateAuthUser,
    get,
    put,
    post,
    apiFactory,
  };
});

vi.mock("@/context/AuthProvider", () => ({
  useAuth: () => ({
    api: mocks.apiFactory,
    updateAuthUser: mocks.updateAuthUser,
    user: { role_type: "owner" },
  }),
}));

vi.mock("@/context/SnackbarProvider", () => ({
  useSnackbar: () => mocks.snackbar,
}));

vi.mock("@/components/Utils", async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    handleApiError: vi.fn(() => "Error controlado"),
  };
});

describe("ProfilePage", () => {
  beforeEach(() => {
    mocks.snackbar.mockReset();
    mocks.updateAuthUser.mockReset();
    mocks.get.mockReset();
    mocks.put.mockReset();
    mocks.post.mockReset();
    mocks.apiFactory.mockClear();
  });

  it("no muestra frecuencia cuando el perfil cargado es owner", async () => {
    mocks.get.mockResolvedValue({
      data: {
        username: "owner",
        email: "owner@example.com",
        is_active: true,
        is_staff: true,
        role_type: "owner",
        profile: {
          name: "Owner",
          surname: "Demo",
          phone: "600123123",
          dni: "12345678Z",
          birth_date: "1990-01-01",
          address: "Calle Central 1",
          company: "GreenPath Demo",
        },
      },
    });

    render(<ProfilePage />);

    await waitFor(() => expect(mocks.get).toHaveBeenCalledWith("users/profile/"));
    const emailMatches = await screen.findAllByText("owner@example.com");
    expect(emailMatches.length).toBeGreaterThan(0);
    expect(screen.queryByText("Frecuencia")).not.toBeInTheDocument();
  });

  it("muestra solo datos no editables en los detalles del perfil", async () => {
    mocks.get.mockResolvedValue({
      data: {
        username: "owner",
        email: "owner@example.com",
        is_active: true,
        is_staff: true,
        role_type: "owner",
        profile: {
          name: "Owner",
          surname: "Demo",
          phone: "600123123",
          dni: "12345678Z",
          birth_date: "1990-01-01",
          address: "Calle Central 1",
          company: "GreenPath Demo",
        },
      },
    });

    render(<ProfilePage />);

    const details = await screen.findByRole("region", { name: /detalles del perfil/i });

    expect(within(details).getByText("Usuario")).toBeInTheDocument();
    expect(within(details).getByText("owner")).toBeInTheDocument();
    expect(within(details).getByText("Empresa")).toBeInTheDocument();
    expect(within(details).getByText("GreenPath Demo")).toBeInTheDocument();
    expect(within(details).queryByText("Email")).not.toBeInTheDocument();
    expect(within(details).queryByText("Telefono")).not.toBeInTheDocument();
    expect(within(details).queryByText("Apellidos")).not.toBeInTheDocument();
    expect(within(details).queryByText("DNI")).not.toBeInTheDocument();
    expect(within(details).queryByText("Fecha nacimiento")).not.toBeInTheDocument();
    expect(within(details).queryByText("Direccion")).not.toBeInTheDocument();
  });

  it("permite subir imagen cuando el perfil incluye foto", async () => {
    mocks.get.mockResolvedValue({
      data: {
        username: "cliente",
        email: "cliente@example.com",
        is_active: true,
        is_staff: false,
        role_type: "client",
        profile: {
          name: "Cliente Demo",
          phone: "600123123",
          photo: "",
        },
      },
    });
    mocks.put.mockResolvedValue({
      data: {
        username: "cliente",
        email: "cliente@example.com",
        is_active: true,
        is_staff: false,
        role_type: "client",
        profile: {
          name: "Cliente Demo",
          phone: "600123123",
          photo: "/media/clients/avatar.png",
        },
      },
    });

    render(<ProfilePage />);

    expect(await screen.findByRole("button", { name: /cambiar imagen/i })).toBeInTheDocument();

    const file = new File(["avatar"], "avatar.png", { type: "image/png" });
    const input = document.querySelector('input[type="file"]');
    fireEvent.change(input, { target: { files: [file] } });

    await waitFor(() => {
      expect(mocks.put).toHaveBeenCalledWith(
        "users/profile/",
        expect.any(FormData),
        expect.objectContaining({
          headers: { "Content-Type": "multipart/form-data" },
        })
      );
    });
    expect(mocks.put.mock.calls[0][1].get("photo")).toBe(file);
    expect(mocks.updateAuthUser).toHaveBeenCalledWith(expect.objectContaining({ photo: "/media/clients/avatar.png" }));
  });

  it("guarda los campos ampliados del perfil de trabajador", async () => {
    mocks.get.mockResolvedValue({
      data: {
        username: "worker",
        email: "worker@example.com",
        is_active: true,
        is_staff: false,
        role_type: "worker",
        profile: {
          name: "Worker",
          surname: "Demo",
          phone: "600123123",
          dni: "12345678Z",
          birth_date: "1990-01-01",
          address: "Calle Antigua 1",
          photo: "",
        },
      },
    });
    mocks.put.mockResolvedValue({
      data: {
        username: "worker",
        email: "worker-updated@example.com",
        is_active: true,
        is_staff: false,
        role_type: "worker",
        profile: {
          name: "Worker",
          surname: "Actualizado",
          phone: "611222333",
          dni: "87654321X",
          birth_date: "1995-05-10",
          address: "Calle Perfil 12",
          photo: "",
        },
      },
    });

    render(<ProfilePage />);

    fireEvent.change(await screen.findByLabelText(/email/i), { target: { value: "worker-updated@example.com" } });
    fireEvent.change(screen.getByLabelText(/apellidos/i), { target: { value: "Actualizado" } });
    fireEvent.change(screen.getByLabelText(/telefono/i), { target: { value: "611222333" } });
    fireEvent.change(screen.getByLabelText(/dni/i), { target: { value: "87654321X" } });
    fireEvent.change(screen.getByLabelText(/fecha de nacimiento/i), { target: { value: "1995-05-10" } });
    fireEvent.change(screen.getByLabelText(/direccion/i), { target: { value: "Calle Perfil 12" } });
    fireEvent.click(screen.getByRole("button", { name: /guardar cambios/i }));

    await waitFor(() => {
      expect(mocks.put).toHaveBeenCalledWith(
        "users/profile/",
        expect.objectContaining({
          email: "worker-updated@example.com",
          name: "Worker",
          surname: "Actualizado",
          phone: "611222333",
          address: "Calle Perfil 12",
          dni: "87654321X",
          birth_date: "1995-05-10",
        })
      );
    });
  });
});
