import { fireEvent, render, screen, waitFor } from "@testing-library/react";
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

  it("permite subir imagen cuando el perfil incluye foto", async () => {
    mocks.get.mockResolvedValue({
      data: {
        username: "cliente",
        email: "cliente@example.com",
        is_active: true,
        is_staff: false,
        role_type: "client",
        profile: {
          name: "Cliente Demo",
          phone: "600123123",
          photo: "",
        },
      },
    });
    mocks.put.mockResolvedValue({
      data: {
        username: "cliente",
        email: "cliente@example.com",
        is_active: true,
        is_staff: false,
        role_type: "client",
        profile: {
          name: "Cliente Demo",
          phone: "600123123",
          photo: "/media/clients/avatar.png",
        },
      },
    });

    render(<ProfilePage />);

    expect(await screen.findByRole("button", { name: /cambiar imagen/i })).toBeInTheDocument();

    const file = new File(["avatar"], "avatar.png", { type: "image/png" });
    const input = document.querySelector('input[type="file"]');
    fireEvent.change(input, { target: { files: [file] } });

    await waitFor(() => {
      expect(mocks.put).toHaveBeenCalledWith(
        "users/profile/",
        expect.any(FormData),
        expect.objectContaining({
          headers: { "Content-Type": "multipart/form-data" },
        })
      );
    });
    expect(mocks.put.mock.calls[0][1].get("photo")).toBe(file);
    expect(mocks.updateAuthUser).toHaveBeenCalledWith(expect.objectContaining({ photo: "/media/clients/avatar.png" }));
  });
});
