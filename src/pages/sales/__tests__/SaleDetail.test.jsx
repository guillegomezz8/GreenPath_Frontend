import { render, screen } from "@testing-library/react";
import SaleDetail from "../SaleDetail";

const mocks = vi.hoisted(() => {
  const navigate = vi.fn();
  const snackbar = vi.fn();
  const get = vi.fn();
  const post = vi.fn();
  const del = vi.fn();
  const apiFactory = vi.fn(() => ({
    get,
    post,
    delete: del,
  }));

  return {
    navigate,
    snackbar,
    get,
    post,
    del,
    apiFactory,
  };
});

vi.mock("react-router-dom", () => ({
  useNavigate: () => mocks.navigate,
  useParams: () => ({ id: "9" }),
}));

vi.mock("@/context/AuthProvider", () => ({
  useAuth: () => ({
    api: mocks.apiFactory,
  }),
}));

vi.mock("@/context/SnackbarProvider", () => ({
  useSnackbar: () => mocks.snackbar,
}));

describe("SaleDetail", () => {
  beforeEach(() => {
    mocks.navigate.mockReset();
    mocks.snackbar.mockReset();
    mocks.get.mockReset();
    mocks.post.mockReset();
    mocks.del.mockReset();
    mocks.apiFactory.mockClear();
  });

  it("no muestra la anotacion legacy de criterio actual", async () => {
    mocks.get.mockResolvedValue({
      data: {
        id: 9,
        invoice_number: "004/2026",
        invoice_date: "2026-03-24",
        invoice_generated_at: "2026-03-24T10:00:00Z",
        buyer: 2,
        buyer_name: "Comprador Demo",
        buyer_tax_id: "B12345678",
        product_description: "Venta demo",
        quantity: "120.00",
        unit: "L",
        unit_price: "0.82",
        tax_rate: "21.00",
        tax_amount: "20.66",
        subtotal: "98.40",
        total: "119.06",
        currency: "EUR",
        notes: "",
      },
    });

    render(<SaleDetail />);

    const invoiceMatches = await screen.findAllByText("004/2026");
    expect(invoiceMatches.length).toBeGreaterThan(0);
    expect(screen.queryByText(/criterio actual/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/numero definido manualmente/i)).not.toBeInTheDocument();
  });
});
