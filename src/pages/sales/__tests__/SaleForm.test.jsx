import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import SaleForm from "../SaleForm";

const mocks = vi.hoisted(() => {
  const navigate = vi.fn();
  const snackbar = vi.fn();
  const get = vi.fn();
  const post = vi.fn();
  const put = vi.fn();
  const apiFactory = vi.fn(() => ({
    get,
    post,
    put,
  }));

  return {
    navigate,
    snackbar,
    get,
    post,
    put,
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

describe("SaleForm", () => {
  beforeEach(() => {
    mocks.navigate.mockReset();
    mocks.snackbar.mockReset();
    mocks.get.mockReset();
    mocks.post.mockReset();
    mocks.put.mockReset();
    mocks.apiFactory.mockClear();
  });

  it("usa numero de factura manual y una unica fecha operativa", async () => {
    mocks.get.mockImplementation((url) => {
      if (url === "buyers/") {
        return Promise.resolve({
          data: {
            results: [
              { id: 1, fiscal_name: "Comprador Demo", tax_id: "B12345678" },
            ],
          },
        });
      }

      if (url === "sales/") {
        return Promise.resolve({
          data: {
            results: [
              { id: 9, invoice_number: "005/2026", product_description: "Aceite vegetal usado", unit: "kg" },
            ],
          },
        });
      }

      return Promise.reject(new Error(`Unexpected GET ${url}`));
    });

    render(<SaleForm mode="create" />);

    await waitFor(() => expect(mocks.get).toHaveBeenCalledWith("buyers/", { params: { page: 1, page_size: 300 } }));
    await waitFor(() => expect(mocks.get).toHaveBeenCalledWith("sales/", { params: { page: 1, page_size: 50 } }));

    expect(screen.getByLabelText(/numero de factura/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/numero de factura/i)).toHaveAttribute("placeholder", "Ultima factura: 005/2026");
    expect(screen.queryByText("Reutilizar concepto")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /reusar concepto/i }));

    expect(screen.getByRole("heading", { name: "Reusar concepto" })).toBeInTheDocument();
    fireEvent.click(screen.getByText("Aceite vegetal usado"));
    expect(screen.getByLabelText(/producto o descripcion/i)).toHaveValue("Aceite vegetal usado");
    expect(screen.getAllByText("kg").length).toBeGreaterThan(0);
    expect(screen.getByLabelText(/fecha de factura/i)).toBeInTheDocument();
    expect(screen.queryByLabelText(/fecha de venta/i)).not.toBeInTheDocument();
  });

  it("permite reusar conceptos tambien al editar una venta", async () => {
    mocks.get.mockImplementation((url) => {
      if (url === "buyers/") {
        return Promise.resolve({
          data: {
            results: [
              { id: 1, fiscal_name: "Comprador Demo", tax_id: "B12345678" },
            ],
          },
        });
      }

      if (url === "sales/7/") {
        return Promise.resolve({
          data: {
            id: 7,
            buyer: 1,
            invoice_number: "006/2026",
            invoice_date: "2026-05-01",
            product_description: "Concepto actual",
            quantity: "10.00",
            unit: "kg",
            unit_price: "1.50",
            tax_rate: "21.00",
            currency: "EUR",
          },
        });
      }

      if (url === "sales/") {
        return Promise.resolve({
          data: {
            results: [
              { id: 7, invoice_number: "006/2026", product_description: "Concepto actual", unit: "kg" },
              { id: 5, invoice_number: "004/2026", product_description: "Aceite usado filtrado", unit: "L" },
            ],
          },
        });
      }

      return Promise.reject(new Error(`Unexpected GET ${url}`));
    });

    render(<SaleForm mode="edit" saleId="7" />);

    await waitFor(() => expect(screen.getByLabelText(/producto o descripcion/i)).toHaveValue("Concepto actual"));
    fireEvent.click(screen.getByRole("button", { name: /reusar concepto/i }));

    expect(screen.getByRole("heading", { name: "Reusar concepto" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /concepto actual/i })).not.toBeInTheDocument();
    fireEvent.click(screen.getByText("Aceite usado filtrado"));

    expect(screen.getByLabelText(/producto o descripcion/i)).toHaveValue("Aceite usado filtrado");
    expect(screen.getAllByText("kg").length).toBeGreaterThan(0);
  });

  it("permite añadir y eliminar conceptos dentro del mismo formulario", async () => {
    mocks.get.mockImplementation((url) => {
      if (url === "buyers/") {
        return Promise.resolve({ data: { results: [] } });
      }
      if (url === "sales/") {
        return Promise.resolve({ data: { results: [] } });
      }
      return Promise.reject(new Error(`Unexpected GET ${url}`));
    });

    render(<SaleForm mode="create" />);

    await waitFor(() => expect(screen.getByRole("button", { name: /añadir concepto/i })).toBeInTheDocument());
    fireEvent.click(screen.getByRole("button", { name: /añadir concepto/i }));

    expect(screen.getAllByLabelText(/producto o descripcion/i)).toHaveLength(2);
    expect(screen.getByLabelText(/conceptos de la factura/i)).toHaveClass("overflow-y-auto");

    fireEvent.click(screen.getByRole("button", { name: /eliminar concepto 2/i }));
    expect(screen.getAllByLabelText(/producto o descripcion/i)).toHaveLength(1);
  });
});
