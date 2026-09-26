import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Stats from "../Stats";

const mocks = vi.hoisted(() => {
  const snackbar = vi.fn();
  const get = vi.fn();
  const apiFactory = vi.fn(() => ({
    get,
  }));

  return {
    snackbar,
    get,
    apiFactory,
  };
});

vi.mock("framer-motion", () => ({
  motion: {
    div: ({ children, ...props }) => <div {...props}>{children}</div>,
  },
}));

vi.mock("@/context/AuthProvider", () => ({
  useAuth: () => ({
    api: mocks.apiFactory,
    authenticated: true,
  }),
}));

vi.mock("@/context/SnackbarProvider", () => ({
  useSnackbar: () => mocks.snackbar,
}));

describe("Stats", () => {
  beforeEach(() => {
    mocks.snackbar.mockReset();
    mocks.get.mockReset();
    mocks.apiFactory.mockClear();
  });

  it("muestra resumen economico y no muestra boton de recarga", async () => {
    mocks.get.mockImplementation((url) => {
      if (url === "companies/features/") return Promise.resolve({ data: { collections_enabled: true, bulk_collections_enabled: true } });
      if (url === "sales/economic-summary/") {
        return Promise.resolve({
          data: {
            total_income: "242.00",
            total_cost: "90.00",
            net_profit: "152.00",
            total_bought_volume: "90.00",
            total_sold_volume: "100.00",
            bought_quantities: { L: "90.00", KG: "82.80", UD: "90.00" },
            sold_quantities: { L: "100.00", KG: "92.00", UD: "100.00" },
            monthly: [
              { year: 2026, month: 3, income: "242.00", cost: "90.00", profit: "152.00", sold_volume: "100.00", bought_volume: "90.00" },
            ],
          },
        });
      }
      if (url === "buyers/") {
        return Promise.resolve({ data: { count: 4, results: [] } });
      }
      if (url === "sales/") {
        return Promise.resolve({ data: { count: 6, results: [] } });
      }
      if (url === "collections") {
        return Promise.resolve({ data: { count: 3, results: [] } });
      }
      if (url === "bulk-collections/") return Promise.resolve({ data: { count: 2, results: [] } });
      return Promise.reject(new Error(`Unexpected URL: ${url}`));
    });

    render(<Stats />);

    await waitFor(() => expect(mocks.get).toHaveBeenCalledTimes(6));

    expect(await screen.findByText("Resumen economico")).toBeInTheDocument();
    expect(screen.getByLabelText(/fecha inicial/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/fecha final/i)).toBeInTheDocument();
    expect(screen.getByText("Compradores")).toBeInTheDocument();
    expect(screen.getByText("Ventas registradas")).toBeInTheDocument();
    const collectionsCounter = screen.getByText("Recogidas facturables");
    expect(collectionsCounter.previousElementSibling).toHaveTextContent("5");
    expect(screen.queryByText("Recogidas al por mayor")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /recargar/i })).not.toBeInTheDocument();
  });

  it("aplica el rango de fechas al resumen y a los contadores dependientes", async () => {
    mocks.get.mockImplementation((url) => {
      if (url === "companies/features/") return Promise.resolve({ data: { collections_enabled: true, bulk_collections_enabled: true } });
      if (url === "sales/economic-summary/") {
        return Promise.resolve({
          data: {
            total_income: "242.00",
            total_cost: "90.00",
            net_profit: "152.00",
            total_bought_volume: "90.00",
            total_sold_volume: "100.00",
            bought_quantities: { L: "90.00", KG: "82.80", UD: "90.00" },
            sold_quantities: { L: "100.00", KG: "92.00", UD: "100.00" },
            monthly: [
              { year: 2026, month: 3, income: "242.00", cost: "90.00", profit: "152.00", sold_volume: "100.00", bought_volume: "90.00" },
            ],
          },
        });
      }
      if (url === "buyers/") {
        return Promise.resolve({ data: { count: 4, results: [] } });
      }
      if (url === "sales/") {
        return Promise.resolve({ data: { count: 2, results: [] } });
      }
      if (url === "collections") {
        return Promise.resolve({ data: { count: 1, results: [] } });
      }
      if (url === "bulk-collections/") return Promise.resolve({ data: { count: 1, results: [] } });
      return Promise.reject(new Error(`Unexpected URL: ${url}`));
    });

    const user = userEvent.setup();
    render(<Stats />);

    await waitFor(() => expect(mocks.get).toHaveBeenCalledTimes(6));

    fireEvent.change(screen.getByLabelText(/fecha inicial/i), { target: { value: "2026-02-01" } });
    fireEvent.change(screen.getByLabelText(/fecha final/i), { target: { value: "2026-03-31" } });
    await user.click(screen.getByRole("button", { name: /aplicar rango/i }));

    await waitFor(() => expect(mocks.get).toHaveBeenCalledTimes(11));

    expect(mocks.get).toHaveBeenCalledWith("sales/economic-summary/", {
      params: { start_date: "2026-02-01", end_date: "2026-03-31" },
    });
    expect(mocks.get).toHaveBeenCalledWith("sales/", {
      params: { page: 1, page_size: 1, start_date: "2026-02-01", end_date: "2026-03-31" },
    });
    expect(mocks.get).toHaveBeenCalledWith("collections", {
      params: { page: 1, page_size: 1, status: "CONFIRMED", billable: true, start_date: "2026-02-01", end_date: "2026-03-31" },
    });
  });
});
