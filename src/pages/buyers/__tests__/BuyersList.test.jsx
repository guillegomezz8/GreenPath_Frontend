import { render, screen, waitFor } from "@testing-library/react";
import BuyersList from "../BuyersList";

const mocks = vi.hoisted(() => {
  const navigate = vi.fn();
  const snackbar = vi.fn();
  const get = vi.fn();
  const apiFactory = vi.fn(() => ({
    get,
    delete: vi.fn(),
  }));

  return {
    navigate,
    snackbar,
    get,
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

describe("BuyersList", () => {
  beforeEach(() => {
    mocks.navigate.mockReset();
    mocks.snackbar.mockReset();
    mocks.get.mockReset();
    mocks.apiFactory.mockClear();
  });

  it("muestra el estado vacio de compradores solo una vez", async () => {
    mocks.get.mockResolvedValue({
      data: {
        count: 0,
        results: [],
      },
    });

    render(<BuyersList />);

    const emptyStates = await screen.findAllByText("No hay compradores con los filtros seleccionados.");
    expect(emptyStates).toHaveLength(1);

    await waitFor(() => expect(mocks.get).toHaveBeenCalledTimes(1));
  });
});
