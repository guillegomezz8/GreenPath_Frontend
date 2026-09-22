import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import TrucksList from "../TrucksList";

const mocks = vi.hoisted(() => {
  const navigate = vi.fn();
  const snackbar = vi.fn();
  const get = vi.fn();
  const del = vi.fn();
  const apiFactory = vi.fn(() => ({
    get,
    delete: del,
  }));

  return {
    navigate,
    snackbar,
    get,
    del,
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

describe("TrucksList", () => {
  beforeEach(() => {
    mocks.navigate.mockReset();
    mocks.snackbar.mockReset();
    mocks.get.mockReset();
    mocks.del.mockReset();
    mocks.apiFactory.mockClear();
  });

  it("muestra el estado vacio cuando no hay camiones", async () => {
    mocks.get.mockResolvedValue({
      data: {
        results: [],
        count: 0,
        counts: {
          active: 0,
          in_service: 0,
          maintenance: 0,
          out_of_service: 0,
          decommissioned: 0,
        },
      },
    });

    render(<TrucksList />);

    await waitFor(() => expect(mocks.get).toHaveBeenCalledTimes(1));
    expect(await screen.findByText("No hay camiones disponibles.")).toBeInTheDocument();
  });

  it("muestra una ficha movil legible y permite editar el camion", async () => {
    const user = userEvent.setup();
    mocks.get.mockResolvedValue({
      data: {
        results: [
          {
            id: 7,
            registration_number: "1234-ABC",
            brand: "Iveco",
            model: "Daily",
            year: 2024,
            capacity: "3500.00",
            driver_name: "Ana Ruiz",
            status: "ACTIVE",
            status_display: "Activo",
            fuel_display: "Diésel",
          },
        ],
        count: 1,
        counts: {},
      },
    });

    render(<TrucksList />);

    const mobileList = await screen.findByLabelText("Lista de camiones");
    expect(within(mobileList).getByText("1234-ABC")).toBeInTheDocument();
    expect(within(mobileList).getByText("Iveco Daily · 2024")).toBeInTheDocument();
    expect(within(mobileList).getByText("3500 L")).toBeInTheDocument();
    expect(within(mobileList).getByText("Ana Ruiz")).toBeInTheDocument();

    await user.click(within(mobileList).getByRole("button", { name: "Editar" }));
    expect(mocks.navigate).toHaveBeenCalledWith("/trucks/7/edit");
  });
});
