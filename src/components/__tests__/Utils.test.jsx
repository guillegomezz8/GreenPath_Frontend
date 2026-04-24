import { describe, expect, it } from "vitest";
import { normalizeZoneName } from "../Utils";

describe("normalizeZoneName", () => {
  it("elimina sufijos de zonas sin clientes aunque vengan concatenados", () => {
    expect(normalizeZoneName("SevillaSin clientes asignadosSin clientes asignados")).toBe("Sevilla");
    expect(normalizeZoneName("AljarafeSin clientes asignados")).toBe("Aljarafe");
    expect(normalizeZoneName("Dos Hermanas 3 clientes en esta zona")).toBe("Dos Hermanas");
  });

  it("devuelve un fallback estable cuando el nombre queda vacio", () => {
    expect(normalizeZoneName("Sin clientes asignados")).toBe("Zona");
    expect(normalizeZoneName("")).toBe("Zona");
  });
});
