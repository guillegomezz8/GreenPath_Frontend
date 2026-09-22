import { describe, expect, it } from "vitest";
import { formatApiErrors, handleApiError, normalizeZoneName } from "../Utils";


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


describe("API error formatting", () => {
  it("muestra los errores anidados del usuario con etiquetas comprensibles", () => {
    const message = handleApiError(
      {
        response: {
          data: {
            user: {
              username: ["Ya existe un usuario con este nombre."],
              email: ["Ya existe un usuario con este correo electronico."],
            },
          },
        },
      },
      "No se pudo crear el trabajador.",
    );

    expect(message).toBe(
      "Usuario · Nombre de usuario: Ya existe un usuario con este nombre. | "
      + "Usuario · Correo electronico: Ya existe un usuario con este correo electronico.",
    );
  });

  it("ignora listas vacias y conserva un mensaje por defecto", () => {
    expect(formatApiErrors({ user: [] })).toBe("");
    expect(
      handleApiError(
        { response: { data: { user: [] } } },
        "No se pudo crear el trabajador.",
      ),
    ).toBe("No se pudo crear el trabajador.");
  });

  it("muestra los errores generales sin una etiqueta tecnica", () => {
    expect(formatApiErrors({ non_field_errors: ["Los datos indicados no son validos."] }))
      .toBe("Los datos indicados no son validos.");
  });
});
