import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import WorkerCreate from "../WorkerCreate";

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

vi.mock("react-router-dom", () => {
  return {
    useNavigate: () => mocks.navigate,
  };
});

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

describe("WorkerCreate", () => {
  beforeEach(() => {
    mocks.navigate.mockReset();
    mocks.snackbar.mockReset();
    mocks.post.mockReset();
    mocks.apiFactory.mockClear();
  });

  it("muestra el rol como trabajador en solo lectura", () => {
    render(<WorkerCreate />);

    expect(screen.getByDisplayValue("Trabajador")).toBeDisabled();
    expect(screen.queryByRole("combobox", { name: /rol/i })).not.toBeInTheDocument();
  });

  it("crea el trabajador sin enviar role ni company", async () => {
    mocks.post.mockResolvedValue({ data: { id: 3 } });
    const user = userEvent.setup();

    render(<WorkerCreate />);

    await user.type(screen.getByLabelText(/username/i), "nuevo-worker");
    await user.type(screen.getByLabelText(/^email \*/i), "worker@example.com");
    await user.type(screen.getByLabelText(/^nombre \*/i), "Pablo");
    await user.type(screen.getByLabelText(/apellidos/i), "Lopez");
    await user.type(screen.getByLabelText(/telefono/i), "600123123");
    await user.type(screen.getByLabelText(/dni/i), "12345678Z");
    await user.type(screen.getByLabelText(/direccion/i), "Calle Real 10");

    await user.click(screen.getByRole("button", { name: /crear trabajador/i }));

    await waitFor(() => expect(mocks.post).toHaveBeenCalledTimes(1));

    const [url, payload] = mocks.post.mock.calls[0];
    expect(url).toBe("/workers/");
    expect(payload).toEqual({
      get_access: false,
      user: {
        username: "nuevo-worker",
        email: "worker@example.com",
      },
      name: "Pablo",
      surname: "Lopez",
      address: "Calle Real 10",
      phone: "600123123",
      dni: "12345678Z",
      birth_date: null,
    });
    expect(payload).not.toHaveProperty("role");
    expect(payload).not.toHaveProperty("company");
    expect(mocks.navigate).toHaveBeenCalledWith("/workers");
  });
});
