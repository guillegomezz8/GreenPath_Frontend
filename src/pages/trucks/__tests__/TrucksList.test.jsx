import { render, screen, waitFor } from "@testing-library/react";
import TrucksList from "../TrucksList";

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

vi.mock("@/components/Utils", async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    handleApiError: vi.fn(() => "Error controlado"),
  };
});

describe("TrucksList", () => {
  beforeEach(() => {
    mocks.navigate.mockReset();
    mocks.snackbar.mockReset();
    mocks.get.mockReset();
    mocks.del.mockReset();
    mocks.apiFactory.mockClear();
  });

  it("muestra el estado vacio cuando no hay camiones", async () => {
    mocks.get.mockResolvedValue({
      data: {
        results: [],
        count: 0,
        counts: {
          active: 0,
          in_service: 0,
          maintenance: 0,
          out_of_service: 0,
          decommissioned: 0,
        },
      },
    });

    render(<TrucksList />);

    await waitFor(() => expect(mocks.get).toHaveBeenCalledTimes(1));
    expect(await screen.findByText("No hay camiones disponibles.")).toBeInTheDocument();
  });
});
