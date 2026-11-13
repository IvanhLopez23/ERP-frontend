import { expect, test } from "@playwright/test";

import { login } from "./helpers";

test.describe("Autenticación", () => {
  test("redirige al login cuando no hay sesión", async ({ page }) => {
    await page.goto("/almacen/productos");
    await expect(page).toHaveURL(/\/login\?redirect=%2Falmacen%2Fproductos/);
    await expect(
      page.getByRole("heading", { name: "Iniciar sesión" }),
    ).toBeVisible();
  });

  test("muestra un error con credenciales inválidas", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel("Usuario").fill("admin");
    await page.getByLabel("Contraseña", { exact: true }).fill("clave-incorrecta");
    await page.getByRole("button", { name: "Entrar" }).click();

    await expect(page.getByRole("alert")).toBeVisible();
    await expect(page).toHaveURL(/\/login/);
  });

  test("inicia sesión y cierra sesión", async ({ page }) => {
    await login(page);

    await page.getByRole("button", { name: /Abrir menú de usuario/ }).click();
    await page.getByRole("menuitem", { name: "Cerrar sesión" }).click();

    await expect(page).toHaveURL(/\/login$/);
    await expect(
      page.getByRole("heading", { name: "Iniciar sesión" }),
    ).toBeVisible();
  });

  test("protege las rutas después de cerrar sesión", async ({ page }) => {
    await login(page);
    await page.getByRole("button", { name: /Abrir menú de usuario/ }).click();
    await page.getByRole("menuitem", { name: "Cerrar sesión" }).click();
    await expect(page).toHaveURL(/\/login$/);

    await page.goto("/configuraciones/usuarios");
    await expect(page).toHaveURL(/\/login/);
  });

  test("cierra sesión desde el sidebar", async ({ page }) => {
    await login(page);
    await page.getByRole("button", { name: "Cerrar sesión" }).first().click();
    await expect(page).toHaveURL(/\/login$/);
  });
});
