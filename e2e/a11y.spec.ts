import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

import { login } from "./helpers";

function resumen(violaciones: { id: string; impact?: string | null }[]) {
  return violaciones
    .map((violacion) => `${violacion.id}:${violacion.impact}`)
    .join(", ");
}

test.describe("Accesibilidad (axe)", () => {
  test("login sin violaciones críticas", async ({ page }) => {
    await page.goto("/login");
    const resultado = await new AxeBuilder({ page }).analyze();
    const graves = resultado.violations.filter(
      (violacion) =>
        violacion.impact === "critical" || violacion.impact === "serious",
    );
    expect(graves, resumen(graves)).toEqual([]);
  });

  test("dashboard sin violaciones críticas", async ({ page }) => {
    await login(page);
    const resultado = await new AxeBuilder({ page }).analyze();
    const graves = resultado.violations.filter(
      (violacion) =>
        violacion.impact === "critical" || violacion.impact === "serious",
    );
    expect(graves, resumen(graves)).toEqual([]);
  });

  test("productos sin violaciones críticas", async ({ page }) => {
    await login(page);
    await page.goto("/almacen/productos");
    await expect(
      page.getByRole("heading", { name: "Productos", level: 1 }),
    ).toBeVisible();

    const resultado = await new AxeBuilder({ page }).analyze();
    const graves = resultado.violations.filter(
      (violacion) =>
        violacion.impact === "critical" || violacion.impact === "serious",
    );
    expect(graves, resumen(graves)).toEqual([]);
  });

  test("finanzas sin violaciones críticas", async ({ page }) => {
    await login(page);
    await page.goto("/contabilidad");
    await expect(
      page.getByRole("heading", { name: "Finanzas", level: 1 }),
    ).toBeVisible();

    const resultado = await new AxeBuilder({ page }).analyze();
    const graves = resultado.violations.filter(
      (violacion) =>
        violacion.impact === "critical" || violacion.impact === "serious",
    );
    expect(graves, resumen(graves)).toEqual([]);
  });

  test("pólizas sin violaciones críticas", async ({ page }) => {
    await login(page);
    await page.goto("/contabilidad/polizas");
    await expect(
      page.getByRole("heading", { name: "Pólizas", level: 1 }),
    ).toBeVisible();

    const resultado = await new AxeBuilder({ page }).analyze();
    const graves = resultado.violations.filter(
      (violacion) =>
        violacion.impact === "critical" || violacion.impact === "serious",
    );
    expect(graves, resumen(graves)).toEqual([]);
  });
});
