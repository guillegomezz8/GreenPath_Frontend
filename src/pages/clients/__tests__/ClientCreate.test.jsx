import { fireEvent, render, screen, waitFor } from "@testing-library/react";
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

  const fillRequiredClientFields = ({
    name = "Bar Nuevo",
    address = "Calle Real 10",
    city = "Sevilla",
    postalCode = "41001",
    country = "Espana",
    phone = "600123123",
  } = {}) => {
    fireEvent.change(screen.getByLabelText(/^nombre \*/i), { target: { value: name } });
    fireEvent.change(screen.getByLabelText(/direccion \*/i), { target: { value: address } });
    fireEvent.change(screen.getByLabelText(/ciudad \*/i), { target: { value: city } });
    fireEvent.change(screen.getByLabelText(/codigo postal \*/i), { target: { value: postalCode } });
    fireEvent.change(screen.getByLabelText(/pais \*/i), { target: { value: country } });
    fireEvent.change(screen.getByLabelText(/telefono \*/i), { target: { value: phone } });
  };

  it("permite crear un cliente sin username, email ni cif cuando no se da acceso", async () => {
    mocks.post.mockResolvedValue({ data: { id: 7 } });

    render(<ClientCreate />);

    fillRequiredClientFields();
    fireEvent.click(screen.getByRole("button", { name: /crear cliente/i }));

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
      country: "Espana",
      frequency: "WEEKLY",
    });
    expect(mocks.navigate).toHaveBeenCalledWith("/clients");
  });

  it("exige email cuando se marca acceso a la plataforma", async () => {
    render(<ClientCreate />);

    fireEvent.click(screen.getByLabelText(/dar acceso a la plataforma/i));
    await waitFor(() => expect(screen.getByLabelText(/email \*/i)).toBeInTheDocument());

    fillRequiredClientFields({
      name: "Cliente Acceso",
      address: "Calle Sol 2",
      postalCode: "41002",
      phone: "600123124",
    });
    fireEvent.click(screen.getByRole("button", { name: /crear cliente/i }));

    expect(mocks.post).not.toHaveBeenCalled();
    await waitFor(() => {
      expect(mocks.snackbar).toHaveBeenCalledWith(
        "Debes indicar un email si quieres enviar acceso a la plataforma.",
        "error"
      );
    });
  });
});
