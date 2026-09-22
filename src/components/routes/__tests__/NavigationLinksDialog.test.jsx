import { render, screen } from "@testing-library/react";
import NavigationLinksDialog from "../NavigationLinksDialog";

describe("NavigationLinksDialog", () => {
  it("muestra todos los tramos de navegacion en orden", () => {
    render(
      <NavigationLinksDialog
        open
        onOpenChange={vi.fn()}
        urls={["https://maps.example/one", "https://maps.example/two"]}
      />,
    );

    expect(screen.getByRole("link", { name: /tramo 1 de 2/i })).toHaveAttribute(
      "href",
      "https://maps.example/one",
    );
    expect(screen.getByRole("link", { name: /tramo 2 de 2/i })).toHaveAttribute(
      "href",
      "https://maps.example/two",
    );
  });
});
