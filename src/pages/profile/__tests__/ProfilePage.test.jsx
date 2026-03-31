import { render, screen, waitFor } from "@testing-library/react";
import ProfilePage from "../ProfilePage";

const mocks = vi.hoisted(() => {
  const snackbar = vi.fn();
  const updateAuthUser = vi.fn();
  const get = vi.fn();
  const put = vi.fn();
  const post = vi.fn();
  const apiFactory = vi.fn(() => ({
    get,
    put,
    post,
  }));

  return {
    snackbar,
    updateAuthUser,
    get,
    put,
    post,
    apiFactory,
  };
});

vi.mock("@/context/AuthProvider", () => ({
  useAuth: () => ({
    api: mocks.apiFactory,
    updateAuthUser: mocks.updateAuthUser,
    user: { role_type: "owner" },
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

describe("ProfilePage", () => {
  beforeEach(() => {
    mocks.snackbar.mockReset();
    mocks.updateAuthUser.mockReset();
    mocks.get.mockReset();
    mocks.put.mockReset();
    mocks.post.mockReset();
    mocks.apiFactory.mockClear();
  });

  it("no muestra frecuencia cuando el perfil cargado es owner", async () => {
    mocks.get.mockResolvedValue({
      data: {
        username: "owner",
        email: "owner@example.com",
        is_active: true,
        is_staff: true,
        role_type: "owner",
        profile: {
          name: "Owner",
          surname: "Demo",
          phone: "600123123",
          dni: "12345678Z",
          birth_date: "1990-01-01",
          address: "Calle Central 1",
          company: "GreenPath Demo",
        },
      },
    });

    render(<ProfilePage />);

    await waitFor(() => expect(mocks.get).toHaveBeenCalledWith("users/profile/"));
    const emailMatches = await screen.findAllByText("owner@example.com");
    expect(emailMatches.length).toBeGreaterThan(0);
    expect(screen.queryByText("Frecuencia")).not.toBeInTheDocument();
  });
});
