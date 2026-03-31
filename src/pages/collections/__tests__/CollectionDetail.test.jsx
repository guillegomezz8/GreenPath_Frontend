import { render, screen } from "@testing-library/react";
import CollectionDetail from "../CollectionDetail";

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
  useParams: () => ({ id: "4" }),
}));

vi.mock("@/context/AuthProvider", () => ({
  useAuth: () => ({
    api: mocks.apiFactory,
    user: { role_type: "owner" },
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
});
