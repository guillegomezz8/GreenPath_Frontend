import { render, screen, waitFor } from "@testing-library/react";
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
    mocks.get.mockResolvedValue({
      data: {
        results: [
          { id: 1, fiscal_name: "Comprador Demo", tax_id: "B12345678" },
        ],
      },
    });

    render(<SaleForm mode="create" />);

    await waitFor(() => expect(mocks.get).toHaveBeenCalledWith("buyers/", { params: { page: 1, page_size: 300 } }));

    expect(screen.getByLabelText(/numero de factura/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/fecha de factura/i)).toBeInTheDocument();
    expect(screen.queryByLabelText(/fecha de venta/i)).not.toBeInTheDocument();
  });
});
