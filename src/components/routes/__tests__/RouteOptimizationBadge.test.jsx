import { render, screen } from "@testing-library/react";
import RouteOptimizationBadge from "../RouteOptimizationBadge";
import { getRouteOptimizationFeedback } from "@/utils/routeOptimization";

describe("RouteOptimizationBadge", () => {
  it("muestra claramente una jornada no optimizada", () => {
    render(<RouteOptimizationBadge status="FAILED" message="Falta la nave" />);

    expect(screen.getByText("No optimizada")).toHaveAttribute("title", "Falta la nave");
  });

  it("resume los fallos devueltos al generar la semana", () => {
    expect(
      getRouteOptimizationFeedback([
        { optimization_status: "OPTIMIZED" },
        { optimization_status: "FAILED", optimization_message: "Falta Google Maps" },
      ]),
    ).toBe("1 jornada no se ha podido optimizar. Falta Google Maps");
  });
});
