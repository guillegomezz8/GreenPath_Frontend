import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { MainLayout } from "../MainLayout";

vi.mock("@/context/AuthProvider", () => ({
  useAuth: () => ({
    user: { role_type: "owner" },
  }),
}));

vi.mock("@/components/layout/Topbar", () => ({
  default: () => <div>Topbar</div>,
}));

vi.mock("@/components/layout/Sidebar", () => ({
  default: () => <div>Sidebar</div>,
}));

describe("MainLayout", () => {
  it("enlaza la marca y el rol con el dashboard", () => {
    render(
      <MemoryRouter>
        <MainLayout>
          <div>Contenido</div>
        </MainLayout>
      </MemoryRouter>,
    );

    expect(screen.getByRole("link", { name: "Ir al dashboard" })).toHaveAttribute(
      "href",
      "/dashboard",
    );
  });
});
