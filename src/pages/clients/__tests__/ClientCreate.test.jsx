import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ClientCreate from "../ClientCreate";

const mocks = vi.hoisted(() => {
  const navigate = vi.fn();
  const snackbar = vi.fn();
  const post = vi.fn();
  const apiFactory = vi.fn(() => ({
    post,
  }));

  return {
    navigate,
    snackbar,
    post,
    apiFactory,
  };
});

vi.mock("react-router-dom", () => ({
  useNavigate: () => mocks.navigate,
}));

vi.mock("@/context/AuthProvider", () => ({
  useAuth: () => ({
    api: mocks.apiFactory,
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

describe("ClientCreate", () => {
  beforeEach(() => {
    mocks.navigate.mockReset();
    mocks.snackbar.mockReset();
    mocks.post.mockReset();
    mocks.apiFactory.mockClear();
  });

  it("permite crear un cliente sin username, email ni cif cuando no se da acceso", async () => {
    mocks.post.mockResolvedValue({ data: { id: 7 } });
    const user = userEvent.setup();

    render(<ClientCreate />);

    await user.type(screen.getByLabelText(/^nombre \*/i), "Bar Nuevo");
    await user.type(screen.getByLabelText(/direccion \*/i), "Calle Real 10");
    await user.type(screen.getByLabelText(/ciudad \*/i), "Sevilla");
    await user.type(screen.getByLabelText(/codigo postal \*/i), "41001");
    await user.clear(screen.getByLabelText(/pais \*/i));
    await user.type(screen.getByLabelText(/pais \*/i), "España");
    await user.type(screen.getByLabelText(/telefono \*/i), "600123123");

    await user.click(screen.getByRole("button", { name: /crear cliente/i }));

    await waitFor(() => expect(mocks.post).toHaveBeenCalledTimes(1));

    const [url, payload] = mocks.post.mock.calls[0];
    expect(url).toBe("/clients/");
    expect(payload).toEqual({
      get_access: false,
      user: {
        username: "",
        email: "",
      },
      name: "Bar Nuevo",
      address: "Calle Real 10",
      phone: "600123123",
      cif: "",
      city: "Sevilla",
      postal_code: "41001",
      country: "España",
      frequency: "WEEKLY",
    });
    expect(mocks.navigate).toHaveBeenCalledWith("/clients");
  });

  it("exige email cuando se marca acceso a la plataforma", async () => {
    const user = userEvent.setup();

    render(<ClientCreate />);

    await user.click(screen.getByLabelText(/dar acceso a la plataforma/i));
    await user.type(screen.getByLabelText(/^nombre \*/i), "Cliente Acceso");
    await user.type(screen.getByLabelText(/direccion \*/i), "Calle Sol 2");
    await user.type(screen.getByLabelText(/ciudad \*/i), "Sevilla");
    await user.type(screen.getByLabelText(/codigo postal \*/i), "41002");
    await user.clear(screen.getByLabelText(/pais \*/i));
    await user.type(screen.getByLabelText(/pais \*/i), "España");
    await user.type(screen.getByLabelText(/telefono \*/i), "600123124");
    await user.click(screen.getByRole("button", { name: /crear cliente/i }));

    expect(mocks.post).not.toHaveBeenCalled();
    expect(mocks.snackbar).toHaveBeenCalledWith(
      "Debes indicar un email si quieres enviar acceso a la plataforma.",
      "error"
    );
  });
});
