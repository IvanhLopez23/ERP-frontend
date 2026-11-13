import { describe, expect, it } from "vitest";

import {
  cantidad,
  fechaCorta,
  fechaISO,
  mediaUrl,
  moneda,
  numero,
  texto,
} from "@/lib/format";

describe("numero", () => {
  it("convierte decimales que llegan como string", () => {
    expect(numero("10.50")).toBe(10.5);
    expect(numero("1,234.50")).toBe(1234.5);
  });

  it("devuelve 0 para valores inválidos", () => {
    expect(numero(undefined)).toBe(0);
    expect(numero("abc")).toBe(0);
    expect(numero(null)).toBe(0);
  });
});

describe("moneda y cantidad", () => {
  it("formatea pesos mexicanos", () => {
    const valor = moneda(15);
    expect(valor).toContain("15.00");
  });

  it("formatea cantidades con decimales", () => {
    expect(cantidad(1234.567, 2)).toContain("1,234.57");
  });
});

describe("fechas", () => {
  it("genera fechas ISO de solo día", () => {
    expect(fechaISO(new Date(2026, 0, 5))).toBe("2026-01-05");
  });

  it("formatea fechas de solo día sin desfase", () => {
    const formateada = fechaCorta("2026-01-31");
    expect(formateada).toContain("2026");
    expect(formateada.toLowerCase()).toContain("31");
  });

  it("devuelve guion para fechas inválidas", () => {
    expect(fechaCorta("no-es-fecha")).toBe("—");
  });
});

describe("mediaUrl", () => {
  it("convierte rutas del backend al proxy del frontend", () => {
    expect(mediaUrl("/uploads/productos/a.png")).toBe(
      "/api/media/uploads/productos/a.png",
    );
  });

  it("respeta URLs absolutas y devuelve null sin ruta", () => {
    expect(mediaUrl("https://cdn.test/a.png")).toBe("https://cdn.test/a.png");
    expect(mediaUrl(null)).toBeNull();
  });
});

describe("texto", () => {
  it("usa el respaldo para valores vacíos", () => {
    expect(texto(null)).toBe("—");
    expect(texto("", "N/A")).toBe("N/A");
    expect(texto(0)).toBe("0");
  });
});
