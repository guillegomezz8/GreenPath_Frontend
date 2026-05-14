import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import CollectionsList from "../CollectionsList";

const mocks = vi.hoisted(() => {
  const navigate = vi.fn();
  const snackbar = vi.fn();
  const get = vi.fn();
  const del = vi.fn();
  const user = { role_type: "client" };
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

describe("CollectionsList", () => {
  beforeEach(() => {
    mocks.navigate.mockReset();
    mocks.snackbar.mockReset();
    mocks.get.mockReset();
    mocks.del.mockReset();
    mocks.apiFactory.mockClear();
    mocks.user.role_type = "client";
  });

  it("renderiza el historial de cliente con tarjetas compactas y resumen", async () => {
    mocks.get.mockImplementation((url, config = {}) => {
      if (url !== "collections") {
        return Promise.reject(new Error(`Unexpected GET ${url}`));
      }

      if (config.params?.page_size === 1) {
        const countsByStatus = {
          PENDING_MEASUREMENT: 1,
          CONFIRMED: 0,
          CANCELED: 0,
        };
        return Promise.resolve({
          data: {
            count: countsByStatus[config.params?.status] ?? 1,
            results: [],
          },
        });
      }

      return Promise.resolve({
        data: {
          count: 1,
          results: [
            {
              id: 3,
              client_name: "Esturion",
              route_name: "Ruta Principal",
              collection_date: "2026-05-11",
              status: "PENDING_MEASUREMENT",
              worker_name: "Antonio Manuel Gomez Martin",
              billable: true,
              container_type: "BIDONES",
              container_number: 3,
              estimated_liters: "180.00",
              net_liters: "180.00",
              total_price: "216.00",
              notes: "Nota interna del equipo",
            },
          ],
        },
      });
    });

    render(<CollectionsList />);

    expect(await screen.findByText("Historial de Recogidas")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Buscar por trabajador...")).toBeInTheDocument();
    expect(screen.getByLabelText("Filtrar por fecha")).toHaveAttribute("type", "date");
    expect(screen.getByText("Recogida #3")).toBeInTheDocument();
    expect(screen.getByText("Registrada por")).toBeInTheDocument();
    expect(screen.getAllByText("Fecha").length).toBeGreaterThanOrEqual(2);
    expect(screen.getByText("11/5/2026")).toBeInTheDocument();
    expect(screen.queryByText("Nota interna del equipo")).not.toBeInTheDocument();
    expect(screen.queryByText("Esturion")).not.toBeInTheDocument();
    expect(screen.queryByText("Ruta Principal")).not.toBeInTheDocument();
    expect(screen.queryByText("Facturable")).not.toBeInTheDocument();
    expect(screen.queryByText("Pendiente de medicion")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Pendiente" })).not.toBeInTheDocument();
    expect(screen.getByText("Resumen de mis recogidas")).toBeInTheDocument();
    expect(screen.getByText("Totales de las recogidas visibles en esta pagina.")).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Filtrar por fecha"), { target: { value: "2026-05-11" } });

    await waitFor(() => {
      expect(mocks.get).toHaveBeenCalledWith(
        "collections",
        expect.objectContaining({
          params: expect.objectContaining({
            start_date: "2026-05-11",
            end_date: "2026-05-11",
          }),
        })
      );
    });
  });

  it("muestra cliente y ruta como campos superiores en la vista interna", async () => {
    mocks.user.role_type = "owner";
    mocks.get.mockImplementation((url, config = {}) => {
      if (url !== "collections") {
        return Promise.reject(new Error(`Unexpected GET ${url}`));
      }

      if (config.params?.page_size === 1) {
        return Promise.resolve({ data: { count: 1, results: [] } });
      }

      return Promise.resolve({
        data: {
          count: 1,
          results: [
            {
              id: 7,
              client_name: "Cliente Admin",
              route_name: "",
              collection_date: "2026-05-11",
              status: "CONFIRMED",
              worker_name: "Antonio Manuel Gomez Martin",
              billable: true,
              container_type: "BIDONES",
              container_number: 3,
              estimated_liters: "180.00",
              net_liters: "180.00",
              total_price: "216.00",
            },
          ],
        },
      });
    });

    render(<CollectionsList />);

    expect(await screen.findByText("Recogida #7")).toBeInTheDocument();
    expect(screen.getByText("Cliente")).toBeInTheDocument();
    expect(screen.getByText("Cliente Admin")).toBeInTheDocument();
    expect(screen.getByText("Ruta")).toBeInTheDocument();
    expect(screen.getByText("-")).toBeInTheDocument();
    expect(screen.queryByText("Sin ruta planificada")).not.toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Filtrar por fecha"), { target: { value: "2026-05-11" } });

    await waitFor(() => {
      expect(mocks.get).toHaveBeenCalledWith(
        "collections",
        expect.objectContaining({
          params: expect.objectContaining({
            start_date: "2026-05-11",
            end_date: "2026-05-11",
          }),
        })
      );
    });
  });
});
