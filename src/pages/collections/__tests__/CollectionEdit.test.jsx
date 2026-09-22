import { calculateCollectionTotal, calculateDeductionLiters } from "../CollectionEdit";


describe("CollectionEdit", () => {
  it("calcula los litros deducidos desde los estimados y los medidos finales", () => {
    expect(calculateDeductionLiters("120.00", "105.00")).toBe(15);
  });

  it("no genera una deduccion negativa si se miden mas litros de los estimados", () => {
    expect(calculateDeductionLiters("120.00", "130.00")).toBe(0);
  });

  it("deja la deduccion a cero mientras no exista una medicion", () => {
    expect(calculateDeductionLiters("120.00", "")).toBe(0);
  });

  it("calcula el importe con los litros finales y el precio escogido", () => {
    expect(calculateCollectionTotal("120.00", "105.00", "1.250")).toBe(131.25);
  });

  it("usa los litros estimados mientras no hay medicion y deja a cero las canceladas", () => {
    expect(calculateCollectionTotal("120.00", "", "1.250")).toBe(150);
    expect(calculateCollectionTotal("120.00", "105.00", "1.250", true)).toBe(0);
  });
});
