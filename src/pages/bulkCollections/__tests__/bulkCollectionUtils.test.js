import { describe, expect, it } from "vitest";

import { calculateBulkCollectionValues, normalizeDecimalInput } from "../bulkCollectionUtils";


describe("calculateBulkCollectionValues", () => {
  it("calcula el importe final con cantidad y precio", () => {
    expect(calculateBulkCollectionValues({ calculation_mode: "TOTAL", quantity: "25", unit_price: "1.5", total_price: "" }).total_price).toBe("37.50");
  });

  it("calcula el precio unitario con cantidad e importe", () => {
    expect(calculateBulkCollectionValues({ calculation_mode: "UNIT_PRICE", quantity: "20", unit_price: "", total_price: "50" }).unit_price).toBe("2.5000");
  });

  it("limita el precio unitario calculado a cuatro decimales", () => {
    expect(calculateBulkCollectionValues({ calculation_mode: "UNIT_PRICE", quantity: "3", unit_price: "", total_price: "10" }).unit_price).toBe("3.3333");
  });

  it("calcula la cantidad con precio e importe", () => {
    expect(calculateBulkCollectionValues({ calculation_mode: "QUANTITY", quantity: "", unit_price: "2.5", total_price: "50" }).quantity).toBe("20.00");
  });
});

describe("normalizeDecimalInput", () => {
  it("acepta cantidades grandes sin separador", () => {
    expect(normalizeDecimalInput("3750", { thousands: true })).toBe("3750");
  });

  it("normaliza separadores españoles en cantidades", () => {
    expect(normalizeDecimalInput("3.750", { thousands: true })).toBe("3750");
    expect(normalizeDecimalInput("3.750,50", { thousands: true })).toBe("3750.50");
  });
});
