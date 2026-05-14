import { fireEvent, render, screen } from "@testing-library/react";
import Login from "../Login";

const mocks = vi.hoisted(() => ({
  login: vi.fn(),
}));

vi.mock("@/context/AuthProvider", () => ({
  useAuth: () => ({
    login: mocks.login,
  }),
}));

vi.mock("@/components/common/AnimatedLogo", () => ({
  AnimatedLogo: (props) => <img {...props} />,
}));

describe("Login", () => {
  beforeEach(() => {
    mocks.login.mockReset();
  });

  it("muestra un error visible cuando las credenciales son incorrectas", async () => {
    mocks.login.mockRejectedValue({
      response: {
        data: {
          Error: "Contraseña o nombre de usuario incorrectos",
        },
      },
    });

    render(<Login />);

    fireEvent.change(screen.getByPlaceholderText("Usuario"), { target: { value: "demo" } });
    fireEvent.change(screen.getByPlaceholderText("Contraseña"), { target: { value: "mal" } });
    fireEvent.click(screen.getByRole("button", { name: /iniciar sesión/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Contraseña o nombre de usuario incorrectos");
  });

  it("reserva espacio para el boton de mostrar contraseña en passwords largas", () => {
    render(<Login />);

    const passwordInput = screen.getByPlaceholderText("Contraseña");

    expect(passwordInput).toHaveClass("truncate");
    expect(passwordInput).toHaveClass("pr-12");
  });
});
