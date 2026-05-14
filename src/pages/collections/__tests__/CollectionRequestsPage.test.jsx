import { render, screen } from "@testing-library/react";
import CollectionRequestsPage from "../CollectionRequestsPage";

const mocks = vi.hoisted(() => {
  const snackbar = vi.fn();
  const get = vi.fn();
  const post = vi.fn();
  const apiFactory = vi.fn(() => ({
    get,
    post,
  }));

  return {
    snackbar,
    get,
    post,
    apiFactory,
  };
});

vi.mock("@/context/AuthProvider", () => ({
  useAuth: () => ({
    api: mocks.apiFactory,
  }),
}));

vi.mock("@/context/SnackbarProvider", () => ({
  useSnackbar: () => mocks.snackbar,
}));

describe("CollectionRequestsPage", () => {
  beforeEach(() => {
    mocks.snackbar.mockReset();
    mocks.get.mockReset();
    mocks.post.mockReset();
    mocks.apiFactory.mockClear();
  });

  it("muestra envases al cliente sin exponer el campo final interno", async () => {
    mocks.get.mockResolvedValue({
      data: {
        results: [
          {
            id: 9,
            route_name: "Ruta Principal",
            route_day_date: "2026-05-11",
            created_date: "2026-05-14T17:20:12Z",
            expires_at: "2026-05-20T14:00:00Z",
            status: "MANUAL",
            container_type: "BIDONES",
            container_number: 3,
            final_liters: "60.00",
            final_source: "MANUAL",
          },
        ],
      },
    });

    render(<CollectionRequestsPage />);

    expect(await screen.findByText("Solicitud #9")).toBeInTheDocument();
    expect(screen.queryByText("Mas recientes primero")).not.toBeInTheDocument();
    expect(screen.queryByText("Ruta Principal")).not.toBeInTheDocument();
    expect(screen.getByText("Envases y litros")).toBeInTheDocument();
    expect(screen.queryByText("Envases indicados")).not.toBeInTheDocument();
    expect(screen.getByText("3 x Bidones")).toBeInTheDocument();
    expect(screen.getByText("180 L aprox.")).toBeInTheDocument();
    expect(screen.getByText("Manual")).toBeInTheDocument();
    expect(screen.queryByText("Ajuste manual")).not.toBeInTheDocument();
    expect(screen.queryByText("Final")).not.toBeInTheDocument();
    expect(screen.queryByText("60 L")).not.toBeInTheDocument();
  });
});
