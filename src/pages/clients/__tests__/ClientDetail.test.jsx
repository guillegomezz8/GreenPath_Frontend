import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ClientDetail from "../ClientDetail";

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
  useParams: () => ({ id: "6" }),
}));

vi.mock("@/context/AuthProvider", () => ({
  useAuth: () => ({
    api: mocks.apiFactory,
  }),
}));

vi.mock("@/context/SnackbarProvider", () => ({
  useSnackbar: () => mocks.snackbar,
}));

describe("ClientDetail", () => {
  beforeEach(() => {
    mocks.navigate.mockReset();
    mocks.snackbar.mockReset();
    mocks.get.mockReset();
    mocks.del.mockReset();
    mocks.apiFactory.mockClear();
  });

  it("muestra badges facturable y no facturable en el historial", async () => {
    mocks.get
      .mockResolvedValueOnce({
        data: {
          id: 6,
          name: "Cliente Demo",
          email: "cliente@example.com",
          phone: "600123123",
          cif: "B12345678",
          address: "Calle Demo 1",
          city: "Sevilla",
          postal_code: "41001",
          country: "Espana",
          frequency: "WEEKLY",
          last_pick_up: "2026-03-20",
          companies: [1],
        },
      })
      .mockResolvedValueOnce({
        data: {
          historial: [
            {
              id: 1,
              collection_date: "2026-03-20",
              route_name: "Ruta 1",
              container_number: 2,
              container_type: "BIDONES",
              net_liters: "100.00",
              total_price: "120.00",
              status: "CONFIRMED",
              billable: true,
            },
            {
              id: 2,
              collection_date: "2026-03-10",
              route_name: "Ruta 2",
              container_number: 1,
              container_type: "BIDONES",
              net_liters: "60.00",
              total_price: "72.00",
              status: "CONFIRMED",
              billable: false,
            },
          ],
          total_liters: 160,
          stats: {
            total_collections: 2,
            effective_collections: 2,
            confirmed_collections: 2,
            pending_collections: 0,
            canceled_collections: 0,
            total_liters: 160,
            avg_liters: 80,
            total_paid: 120,
          },
        },
      });

    const user = userEvent.setup();
    render(<ClientDetail />);

    await screen.findByText("Cliente Demo");
    await user.click(screen.getByRole("tab", { name: /historial/i }));

    expect(await screen.findByText("Facturable")).toBeInTheDocument();
    expect(screen.getByText("No facturable")).toBeInTheDocument();
  });
});
