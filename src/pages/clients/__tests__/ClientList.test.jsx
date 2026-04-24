import { render, screen, waitFor, within } from "@testing-library/react";
import ClientsList from "../ClientsList";

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

describe("ClientsList", () => {
  beforeEach(() => {
    mocks.navigate.mockReset();
    mocks.snackbar.mockReset();
    mocks.get.mockReset();
    mocks.del.mockReset();
    mocks.apiFactory.mockClear();
  });

  it("muestra guiones cuando faltan datos opcionales del cliente", async () => {
    mocks.get.mockResolvedValue({
      data: {
        results: [
          {
            id: 4,
            name: "Cliente sin datos",
            city: "",
            frequency: "",
            address: "",
            phone: "",
            email: "",
            last_pick_up: "",
            total_pick_ups: null,
          },
        ],
        count: 1,
        counts: {},
      },
    });

    render(<ClientsList />);

    const clientName = await screen.findByText("Cliente sin datos");
    const card = clientName.closest("[class*='hover:shadow-elegant']");

    await waitFor(() => expect(mocks.get).toHaveBeenCalledTimes(1));
    expect(card).not.toBeNull();
    expect(within(card).getByText("Ultima recogida:").parentElement).toHaveTextContent("Ultima recogida:-");
    expect(within(card).getByText("Total recogidas:").parentElement).toHaveTextContent("Total recogidas:-");
    expect(within(card).getAllByText("-").length).toBeGreaterThanOrEqual(5);
  });
});
