import { render, screen } from "@testing-library/react";
import GenerateWeekDialog from "../GenerateWeekDialog";

describe("GenerateWeekDialog", () => {
  const baseProps = {
    open: true,
    onOpenChange: vi.fn(),
    weekStartDate: "2026-03-23",
    onWeekStartDateChange: vi.fn(),
    dailyCapacityLiters: "500",
    onDailyCapacityLitersChange: vi.fn(),
    regenerate: false,
    onRegenerateChange: vi.fn(),
    autoEstimateWithoutContact: false,
    onAutoEstimateWithoutContactChange: vi.fn(),
    checkingWeekGenerationContext: false,
    hasExistingWeekStops: false,
    submittingGenerate: false,
    onSubmit: vi.fn(),
  };

  it("oculta la opcion de regenerar si no hay paradas existentes", () => {
    render(<GenerateWeekDialog {...baseProps} />);

    expect(screen.queryByLabelText(/regenerar paradas existentes/i)).not.toBeInTheDocument();
    expect(screen.getByText(/no hay paradas existentes en esa semana/i)).toBeInTheDocument();
  });

  it("muestra la opcion de regenerar si la semana ya tiene paradas", () => {
    render(<GenerateWeekDialog {...baseProps} hasExistingWeekStops regenerate />);

    expect(screen.getByLabelText(/regenerar paradas existentes/i)).toBeInTheDocument();
  });
});
