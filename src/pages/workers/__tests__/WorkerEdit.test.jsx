import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import WorkerEdit from "../WorkerEdit";

const mocks = vi.hoisted(() => {
  const navigate = vi.fn();
  const snackbar = vi.fn();
  const get = vi.fn();
  const put = vi.fn();
  const apiFactory = vi.fn(() => ({
    get,
    put,
  }));

  return {
    navigate,
    snackbar,
    get,
    put,
    apiFactory,
  };
});

vi.mock("react-router-dom", () => {
  return {
    useNavigate: () => mocks.navigate,
    useParams: () => ({ id: "12" }),
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

describe("WorkerEdit", () => {
  beforeEach(() => {
    mocks.navigate.mockReset();
    mocks.snackbar.mockReset();
    mocks.get.mockReset();
    mocks.put.mockReset();
    mocks.apiFactory.mockClear();
  });

  it("muestra un owner como propietario en solo lectura", async () => {
    mocks.get.mockResolvedValue({
      data: {
        username: "owner-user",
        email: "owner@example.com",
        role_code: "owner",
        name: "Guillermo",
        surname: "Gomez",
        address: "Calle Mayor 1",
        phone: "600000000",
        dni: "12345678Z",
        birth_date: "1990-01-01",
      },
    });

    render(<WorkerEdit />);

    expect(await screen.findByDisplayValue("Propietario")).toBeDisabled();
  });

  it("actualiza sin enviar role, company, username ni user", async () => {
    mocks.get.mockResolvedValue({
      data: {
        username: "owner-user",
        email: "owner@example.com",
        role_code: "owner",
        name: "Guillermo",
        surname: "Gomez",
        address: "Calle Mayor 1",
        phone: "600000000",
        dni: "12345678Z",
        birth_date: "1990-01-01",
      },
    });
    mocks.put.mockResolvedValue({ data: { id: 12 } });

    const user = userEvent.setup();
    render(<WorkerEdit />);

    await screen.findByDisplayValue("Guillermo");

    const emailInput = screen.getByLabelText(/email/i);
    const nameInput = screen.getByLabelText(/^nombre \*/i);

    await user.clear(emailInput);
    await user.type(emailInput, "nuevo-owner@example.com");
    await user.clear(nameInput);
    await user.type(nameInput, "Memo");
    await user.click(screen.getByRole("button", { name: /actualizar trabajador/i }));

    await waitFor(() => expect(mocks.put).toHaveBeenCalledTimes(1));

    const [url, payload] = mocks.put.mock.calls[0];
    expect(url).toBe("/workers/12/");
    expect(payload).toEqual({
      email: "nuevo-owner@example.com",
      name: "Memo",
      surname: "Gomez",
      address: "Calle Mayor 1",
      phone: "600000000",
      dni: "12345678Z",
      birth_date: "1990-01-01",
    });
    expect(payload).not.toHaveProperty("role");
    expect(payload).not.toHaveProperty("company");
    expect(payload).not.toHaveProperty("username");
    expect(payload).not.toHaveProperty("user");
    expect(mocks.navigate).toHaveBeenCalledWith("/workers");
  });
});
