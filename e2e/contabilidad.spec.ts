import { expect, test } from "@playwright/test";

import { login } from "./helpers";

test.describe("Finanzas", () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test("el hub muestra los accesos del módulo", async ({ page }) => {
    await page.goto("/contabilidad");
    await expect(
      page.getByRole("heading", { name: "Finanzas", level: 1 }),
    ).toBeVisible();

    const accesos = page.locator("section");
    for (const nombre of [
      "Catálogo de cuentas",
      "Pólizas",
      "Bancos",
      "Presupuestos",
      "Nómina contable",
    ]) {
      await expect(
        accesos.getByRole("link", { name: new RegExp(nombre) }),
      ).toBeVisible();
    }
  });

  test("el catálogo de cuentas muestra el árbol contable", async ({ page }) => {
    await page.goto("/contabilidad/cuentas");
    await expect(
      page.getByRole("heading", { name: "Catálogo de cuentas", level: 1 }),
    ).toBeVisible();
    await expect(page.getByText("1000").first()).toBeVisible();
    await expect(page.getByRole("button", { name: "Nueva cuenta" })).toBeVisible();
  });

  test("la póliza abre su detalle con partidas", async ({ page }) => {
    await page.goto("/contabilidad/polizas");
    await expect(
      page.getByRole("heading", { name: "Pólizas", level: 1 }),
    ).toBeVisible();

    await page.getByRole("button", { name: /Acciones de/ }).first().click();
    await page.getByRole("menuitem", { name: "Ver detalle" }).click();

    await expect(page.getByRole("heading", { name: /^Póliza / })).toBeVisible();
    await expect(
      page.getByRole("cell", { name: "Totales", exact: true }),
    ).toBeVisible();
  });

  test("el formulario de póliza usa secciones numeradas", async ({ page }) => {
    await page.goto("/contabilidad/polizas");
    await page.getByRole("button", { name: "Nueva póliza" }).click();

    await expect(
      page.getByRole("heading", { name: "Nueva póliza" }),
    ).toBeVisible();
    for (const titulo of ["Datos generales", "Partidas"]) {
      await expect(page.getByText(titulo, { exact: true })).toBeVisible();
    }
    await expect(
      page.getByRole("button", { name: "Crear póliza" }),
    ).toBeVisible();
  });

  test("bancos abre la conciliación de una cuenta", async ({ page }) => {
    await page.goto("/contabilidad/bancos");
    await expect(
      page.getByRole("heading", { name: "Bancos", level: 1 }),
    ).toBeVisible();

    await page.getByRole("button", { name: "Abrir", exact: true }).first().click();
    await expect(page.getByText("Saldo contable")).toBeVisible();
    await expect(page.getByText("Saldo banco")).toBeVisible();
  });

  test("cuentas por cobrar muestra la cartera", async ({ page }) => {
    await page.goto("/contabilidad/cxc");
    await expect(
      page.getByRole("heading", { name: "Cuentas por cobrar", level: 1 }),
    ).toBeVisible();
    await expect(page.getByText("Saldo").first()).toBeVisible();
  });

  test("reportes contables muestra la balanza", async ({ page }) => {
    await page.goto("/contabilidad/reportes");
    await expect(
      page.getByRole("heading", { name: "Reportes contables", level: 1 }),
    ).toBeVisible();
    await expect(page.getByLabel("Reporte")).toBeVisible();
    await expect(
      page.getByRole("cell", { name: "Totales", exact: true }),
    ).toBeVisible();
  });

  test("el reporte de IVA mensual muestra los meses en español", async ({ page }) => {
    await page.goto("/contabilidad/reportes");
    await page.getByLabel("Reporte").selectOption("iva-mensual");

    const anio = new Date().getFullYear();
    await expect(
      page.getByRole("cell", { name: `Enero ${anio}`, exact: true }),
    ).toBeVisible();
  });
});
