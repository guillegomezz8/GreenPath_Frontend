import { render, screen } from "@testing-library/react";
import CollectionDetail from "../CollectionDetail";

const mocks = vi.hoisted(() => {
  const navigate = vi.fn();
  const snackbar = vi.fn();
  const get = vi.fn();
  const del = vi.fn();
  const user = { role_type: "owner" };
  const apiFactory = vi.fn(() => ({
    get,
    delete: del,
  }));

  return {
    navigate,
    snackbar,
    get,
    del,
    user,
    apiFactory,
  };
});

vi.mock("react-router-dom", () => ({
  useNavigate: () => mocks.navigate,
  useParams: () => ({ id: "4" }),
}));

vi.mock("@/context/AuthProvider", () => ({
  useAuth: () => ({
    api: mocks.apiFactory,
    user: mocks.user,
  }),
}));

vi.mock("@/context/SnackbarProvider", () => ({
  useSnackbar: () => mocks.snackbar,
}));

describe("CollectionDetail", () => {
  beforeEach(() => {
    mocks.navigate.mockReset();
    mocks.snackbar.mockReset();
    mocks.get.mockReset();
    mocks.del.mockReset();
    mocks.apiFactory.mockClear();
    mocks.user.role_type = "owner";
  });

  it("muestra si una recogida es facturable y el motivo de deduccion traducido", async () => {
    mocks.get.mockResolvedValue({
      data: {
        id: 4,
        client_name: "Cliente Demo",
        route_name: "Ruta Demo",
        collection_date: "2026-03-24",
        status: "CONFIRMED",
        worker_name: "Guillermo",
        route_day_client: 12,
        billable: false,
        billable_label: "No facturable",
        container_type: "BIDONES",
        container_number: 2,
        estimated_liters: "120.00",
        measured_liters: "110.00",
        deduction_liters: "10.00",
        net_liters: "100.00",
        deduction_reason: "RESIDUE",
        deduction_reason_label: "Residuos/posos",
        deduction_notes: "Posos",
        price_per_liter: "1.200",
        total_price: "120.00",
        notes: "Notas demo",
      },
    });

    render(<CollectionDetail />);

    expect(await screen.findByText("Residuos/posos")).toBeInTheDocument();
    expect(screen.getAllByText("No facturable").length).toBeGreaterThan(0);
  });

  it("oculta informacion interna al cliente y muestra precios con dos decimales", async () => {
    mocks.user.role_type = "client";
    mocks.get.mockResolvedValue({
      data: {
        id: 4,
        client_name: "Cliente Demo",
        route_name: "Ruta Demo",
        collection_date: "2026-03-24",
        status: "PENDING_MEASUREMENT",
        worker_name: "Guillermo",
        route_day_client: 12,
        billable: true,
        billable_label: "Facturable",
        container_type: "BIDONES",
        container_number: 2,
        estimated_liters: "120.00",
        measured_liters: null,
        deduction_liters: "0.00",
        net_liters: "120.00",
        price_per_liter: "1.200",
        total_price: "144.00",
        notes: "Notas demo",
      },
    });

    render(<CollectionDetail />);

    expect(await screen.findByText("Mi recogida #4")).toBeInTheDocument();
    expect(screen.getAllByText("Litros registrados").length).toBeGreaterThan(0);
    expect(screen.getByText("1.20 EUR")).toBeInTheDocument();
    expect(screen.queryByText("Cliente Demo")).not.toBeInTheDocument();
    expect(screen.queryByText("Ruta Demo")).not.toBeInTheDocument();
    expect(screen.queryByText("Estado:")).not.toBeInTheDocument();
    expect(screen.queryByText("Facturable")).not.toBeInTheDocument();
    expect(screen.queryByText("Notas:")).not.toBeInTheDocument();
    expect(screen.queryByText("Notas demo")).not.toBeInTheDocument();
  });
});
