import { expect, type Page } from "@playwright/test";

async function intentarLogin(
  page: Page,
  usuario: string,
  contrasena: string,
) {
  await page.goto("/login");
  await page.getByLabel("Usuario").fill(usuario);
  await page.getByLabel("Contraseña", { exact: true }).fill(contrasena);
  await page.getByRole("button", { name: "Entrar" }).click();
  await page.waitForURL(/\/dashboard$/, { timeout: 15000 });
}

export async function login(
  page: Page,
  usuario = "admin",
  contrasena = "1234",
) {
  try {
    await intentarLogin(page, usuario, contrasena);
  } catch {
    // Reintento ante fallos intermitentes de red/arranque del BFF.
    await intentarLogin(page, usuario, contrasena);
  }
  await expect(
    page.getByRole("heading", { name: /Buenos|Buenas/ }),
  ).toBeVisible();
}
