import { expect, test } from "@playwright/test";

import { login } from "./helpers";

test.use({ viewport: { width: 390, height: 844 } });

test.describe("Formularios en móvil", () => {
  test("las partidas de una compra no se empalman", async ({ page }) => {
    await login(page);
    await page.goto("/compras/registros");

    await page.getByRole("button", { name: "Nueva compra" }).click();
    await expect(
      page.getByRole("heading", { name: "Nueva compra" }),
    ).toBeVisible();
    await expect(page.getByLabel("Almacén de destino")).toBeVisible();

    const cantidad = page.getByLabel("Cantidad");
    const precio = page.getByLabel("P. unitario");
    await expect(cantidad).toBeVisible();
    await expect(precio).toBeVisible();

    const cajaCantidad = await cantidad.boundingBox();
    const cajaPrecio = await precio.boundingBox();

    expect(cajaCantidad?.width ?? 0).toBeGreaterThan(70);
    expect(cajaPrecio?.width ?? 0).toBeGreaterThan(70);

    const ladoAIzquierda =
      (cajaCantidad?.x ?? 0) + (cajaCantidad?.width ?? 0) <=
      (cajaPrecio?.x ?? 0) + 1;
    const apilado =
      (cajaCantidad?.y ?? 0) + (cajaCantidad?.height ?? 0) <=
      (cajaPrecio?.y ?? 0) + 1;

    expect(ladoAIzquierda || apilado).toBe(true);
  });

  test("el formulario de empleado apila sus secciones", async ({ page }) => {
    await login(page);
    await page.goto("/rh/empleados");

    await page.getByRole("button", { name: /Acciones de/ }).first().click();
    await page.getByRole("menuitem", { name: "Editar" }).click();

    await expect(
      page.getByRole("heading", { name: "Editar empleado" }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Guardar empleado" }),
    ).toBeVisible();

    const ancho = await page
      .locator('[data-slot="sheet-content"]')
      .evaluate((elemento) => elemento.getBoundingClientRect().width);
    expect(ancho).toBeLessThanOrEqual(390);
  });
});
