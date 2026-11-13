import { expect, test } from "@playwright/test";

import { login } from "./helpers";

test.describe("RH · Vacaciones", () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test("la pantalla principal muestra la tabla de saldos", async ({ page }) => {
    await page.goto("/rh/vacaciones");

    await expect(
      page.getByRole("heading", { name: "Saldo vacacional", level: 1 }),
    ).toBeVisible();
    await expect(page.getByRole("table")).toBeVisible();
    await expect(page.getByRole("cell", { name: "EMP-DEV-001" })).toBeVisible();
    await expect(page.getByText(/Periodo vacacional/).first()).toBeVisible();
  });

  test("al buscar un empleado se conserva la tabla", async ({ page }) => {
    await page.goto("/rh/vacaciones");

    const primeraCelda = page.getByRole("cell", { name: /^EMP-/ }).first();
    await expect(primeraCelda).toBeVisible();
    const codigo = ((await primeraCelda.textContent()) ?? "").trim();
    expect(codigo).toMatch(/^EMP-/);

    await page.getByLabel("Buscar empleado").fill(codigo);

    await expect(page.getByRole("table")).toBeVisible();
    await expect(
      page.getByRole("cell", { name: codigo, exact: true }),
    ).toBeVisible();
  });

  test("las políticas usan alineación izquierda", async ({ page }) => {
    await page.goto("/rh/vacaciones/politicas");
    await expect(page.getByRole("table")).toBeVisible();

    const primeraCelda = page.locator("tbody tr").first().locator("td").first();
    await expect(primeraCelda).toBeVisible();

    await expect
      .poll(async () =>
        primeraCelda.evaluate(
          (elemento) => getComputedStyle(elemento).textAlign,
        ),
      )
      .toMatch(/^(left|start)$/);
  });
});
