import { expect, test } from "@playwright/test";

import { login } from "./helpers";

test.describe("Navegación principal", () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test("lista los productos del almacén", async ({ page }) => {
    await page.goto("/almacen/productos");
    await expect(
      page.getByRole("heading", { name: "Productos", level: 1 }),
    ).toBeVisible();
    await expect(page.getByText("DEV-PROD-001")).toBeVisible();
  });

  test("abre el catálogo de proveedores", async ({ page }) => {
    await page.goto("/compras/proveedores");
    await expect(
      page.getByRole("heading", { name: "Proveedores", level: 1 }),
    ).toBeVisible();
  });

  test("muestra la matriz de permisos por rol", async ({ page }) => {
    await page.goto("/configuraciones/permisos");
    await page.getByLabel("Rol").selectOption({ index: 1 });

    await expect(
      page.getByRole("button", { name: "Guardar permisos" }),
    ).toBeVisible();
    await expect(page.getByText("/configuraciones/usuarios")).toBeVisible();
  });

  test("carga la conversación de prueba en el chat", async ({ page }) => {
    await page.goto("/chat");
    await expect(
      page.getByRole("heading", { name: "Chat", level: 1 }),
    ).toBeVisible();
    await expect(page.getByText("Chat desarrollo").first()).toBeVisible();
  });

  test("el dashboard muestra los tabs de los módulos", async ({ page }) => {
    for (const tab of [
      "Ventas",
      "Compras",
      "Almacén",
      "Recursos Humanos",
      "Mantenimiento",
      "Finanzas",
    ]) {
      await expect(page.getByRole("tab", { name: tab })).toBeVisible();
    }
  });

  test("el buscador abre y navega a una pantalla", async ({ page }) => {
    await page.getByRole("button", { name: /Buscar/ }).click();
    await expect(page.getByRole("dialog")).toBeVisible();

    await page
      .getByPlaceholder("Buscar pantalla, módulo o ruta…")
      .fill("Productos");
    await page.getByRole("option", { name: /Productos/ }).first().click();

    await expect(page).toHaveURL(/\/almacen\/productos$/);
  });

  test("el menú lateral despliega los submódulos de operaciones", async ({ page }) => {
    const modulos: [string, string][] = [
      ["Almacén", "Productos"],
      ["Compras", "Proveedores"],
      ["RH", "Empleados"],
      ["Mantenimiento", "Equipos"],
      ["Ventas", "Clientes"],
      ["Finanzas", "Pólizas"],
    ];

    for (const [padre, hijo] of modulos) {
      await page.getByRole("button", { name: padre, exact: true }).click();
      await expect(
        page.getByRole("link", { name: hijo, exact: true }),
      ).toBeVisible();
    }

    await expect(
      page.getByRole("link", { name: "Políticas vacacionales", exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: "Turnos", exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: "Saldos vacacionales", exact: true }),
    ).toHaveCount(0);

    for (const hijo of [
      "Categorías",
      "Unidades de medida",
      "Productos",
      "Almacenes",
    ]) {
      await expect(
        page.getByRole("link", { name: hijo, exact: true }),
      ).toBeVisible();
    }

    await page.getByRole("link", { name: "Productos", exact: true }).click();
    await expect(page).toHaveURL(/\/almacen\/productos$/);
  });

  test("al desplegar un módulo con el sidebar colapsado se expande y muestra sus hijos", async ({ page }) => {
    await page.getByRole("button", { name: "Colapsar menú" }).click();
    await expect(
      page.getByRole("button", { name: "Expandir menú" }),
    ).toBeVisible();

    await page.getByTitle("Compras").click();

    await expect(
      page.getByRole("button", { name: "Colapsar menú" }),
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: "Proveedores", exact: true }),
    ).toBeVisible();
  });

  test("oculta los módulos desactivados en la base de datos", async ({ page }) => {
    await expect(
      page.getByRole("link", { name: "Catálogos", exact: true }),
    ).toHaveCount(0);
  });

  test("el botón del header colapsa el menú lateral", async ({ page }) => {
    const boton = page.getByRole("button", { name: "Colapsar menú" });
    await expect(boton).toBeVisible();
    await boton.click();
    await expect(
      page.getByRole("button", { name: "Expandir menú" }),
    ).toBeVisible();
  });

  test("el dashboard muestra los dashboards de los módulos por tabs", async ({ page }) => {
    await expect(page.getByRole("tab", { name: "Ventas" })).toBeVisible();
    await expect(
      page.getByRole("region", { name: "Dashboard de Ventas" }),
    ).toBeVisible();

    await page.getByRole("tab", { name: "Almacén" }).click();
    await expect(
      page.getByRole("region", { name: "Dashboard de Almacén" }),
    ).toBeVisible();
  });

  test("los dashboards tienen filtros de tiempo", async ({ page }) => {
    await expect(page.getByLabel("Desde")).toBeVisible();
    await expect(page.getByLabel("Hasta")).toBeVisible();

    await page.getByLabel("Agrupación").selectOption("semana");
    await expect(
      page.getByRole("region", { name: "Dashboard de Ventas" }),
    ).toBeVisible();
  });

  test("el formulario de producto usa secciones numeradas", async ({ page }) => {
    await page.goto("/almacen/productos");
    await page
      .getByRole("button", { name: /Acciones de/ })
      .first()
      .click();
    await page.getByRole("menuitem", { name: "Editar" }).click();

    await expect(
      page.getByRole("heading", { name: "Editar producto" }),
    ).toBeVisible();
    for (const titulo of [
      "Información general",
      "Precios",
      "Clasificación",
      "Imagen",
    ]) {
      await expect(page.getByText(titulo, { exact: true })).toBeVisible();
    }
    await expect(
      page.getByRole("button", { name: "Guardar producto" }),
    ).toBeVisible();
  });

  test("el formulario de empleado usa secciones numeradas", async ({ page }) => {
    await page.goto("/rh/empleados");
    await page
      .getByRole("button", { name: /Acciones de/ })
      .first()
      .click();
    await page.getByRole("menuitem", { name: "Editar" }).click();

    await expect(
      page.getByRole("heading", { name: "Editar empleado" }),
    ).toBeVisible();
    for (const titulo of [
      "Información general",
      "Asignación",
      "Contacto",
      "Documentos",
      "Fotografía",
    ]) {
      await expect(page.getByText(titulo, { exact: true })).toBeVisible();
    }
    await expect(
      page.getByRole("button", { name: "Guardar empleado" }),
    ).toBeVisible();
  });

  test("el formulario de puesto muestra todos los departamentos activos", async ({ page }) => {
    const activos = await page.request
      .get("/api/proxy/rh/puestos/departamentos")
      .then((respuesta) => respuesta.json());

    await page.goto("/rh/puestos");
    await page.getByRole("button", { name: "Nuevo puesto" }).click();

    await expect(
      page.getByRole("heading", { name: "Nuevo puesto" }),
    ).toBeVisible();
    await expect(
      page.getByLabel("Departamento", { exact: true }).locator("option"),
    ).toHaveCount(activos.length + 1);
  });

  test("el grid de puestos filtra por departamento", async ({ page }) => {
    const departamentos = await page.request
      .get("/api/proxy/rh/puestos/departamentos")
      .then((respuesta) => respuesta.json());
    const puestos = await page.request
      .get("/api/proxy/rh/puestos/paginacion?pagina=1&registros=1")
      .then((respuesta) => respuesta.json());
    const departamentoId =
      puestos.data?.[0]?.departamento?.publicId ?? departamentos[0].publicId;

    const paginados = await page.request
      .get(
        `/api/proxy/rh/puestos/paginacion?pagina=1&registros=10&departamentoId=${departamentoId}`,
      )
      .then((respuesta) => respuesta.json());

    await page.goto("/rh/puestos");
    await page
      .getByLabel("Filtrar puestos por departamento")
      .selectOption(departamentoId);

    await expect(
      page.getByText(`${paginados.total} registros`, { exact: true }),
    ).toBeVisible();
  });

  test("el formulario de empleado filtra puestos por departamento", async ({ page }) => {
    const departamentos = await page.request
      .get("/api/proxy/rh/puestos/departamentos")
      .then((respuesta) => respuesta.json());
    const puestos = await page.request
      .get("/api/proxy/rh/puestos")
      .then((respuesta) => respuesta.json());

    const conPuestos = departamentos.filter((departamento: { publicId: string }) =>
      puestos.some(
        (puesto: { departamento?: { publicId?: string } }) =>
          puesto.departamento?.publicId === departamento.publicId,
      ),
    );
    if (conPuestos.length < 2) {
      throw new Error("Se requieren al menos dos departamentos con puestos.");
    }

    const [departamentoA, departamentoB] = conPuestos;
    const puestosA = puestos
      .filter(
        (puesto: { departamento?: { publicId?: string } }) =>
          puesto.departamento?.publicId === departamentoA.publicId,
      )
      .map((puesto: { nombre?: string }) => puesto.nombre ?? "");
    const puestosB = puestos
      .filter(
        (puesto: { departamento?: { publicId?: string } }) =>
          puesto.departamento?.publicId === departamentoB.publicId,
      )
      .map((puesto: { nombre?: string }) => puesto.nombre ?? "");

    await page.goto("/rh/empleados");
    await page.getByRole("button", { name: "Nuevo empleado" }).click();
    await expect(
      page.getByRole("heading", { name: "Nuevo empleado" }),
    ).toBeVisible();

    const selectDepartamento = page.getByLabel("Departamento", {
      exact: true,
    });
    const selectPuesto = page.getByLabel("Puesto", { exact: true });

    const opcionesDe = async (departamentoId: string) => {
      await selectDepartamento.selectOption(departamentoId);
      return selectPuesto.locator("option").allTextContents();
    };

    const opcionesA = await opcionesDe(departamentoA.publicId);
    expect([...opcionesA].sort()).toEqual(["Selecciona…", ...puestosA].sort());

    const opcionesB = await opcionesDe(departamentoB.publicId);
    expect([...opcionesB].sort()).toEqual(["Selecciona…", ...puestosB].sort());

    await selectPuesto.selectOption({ index: 1 });
    await selectDepartamento.selectOption(departamentoA.publicId);
    await expect(selectPuesto).toHaveValue("");
  });

  test("el alta de empleado captura el salario desde un contrato", async ({
    page,
  }) => {
    await page.goto("/rh/empleados");
    await page.getByRole("button", { name: "Nuevo empleado" }).click();

    await expect(
      page.getByRole("heading", { name: "Nuevo empleado" }),
    ).toBeVisible();
    await expect(page.getByText("Contrato", { exact: true })).toBeVisible();
    await expect(page.getByLabel("Tipo de contrato")).toBeVisible();
    await expect(page.getByLabel("Inicio del contrato")).toBeVisible();
    await expect(page.getByLabel("Salario del contrato")).toBeVisible();
    await expect(page.getByLabel("Salario", { exact: true })).toHaveCount(0);
  });

  test("asistencias muestra el personal activo y filtra por día y departamento", async ({
    page,
  }) => {
    await page.goto("/rh/asistencias");
    await expect(
      page.getByRole("heading", { name: "Asistencias", level: 1 }),
    ).toBeVisible();
    await expect(page.getByLabel("Filtrar por día")).toBeVisible();
    await expect(page.getByLabel("Filtrar por departamento")).toBeVisible();
    await expect(page.getByText("EMP-DEV-001")).toBeVisible();

    await page.getByLabel("Filtrar por día").fill("2026-11-12");
    await expect(page.getByText("sin registro").first()).toBeVisible();

    const empleados = await page.request
      .get("/api/proxy/rh/empleados")
      .then((respuesta) => respuesta.json());
    const empleado = empleados.find(
      (item: { codigo?: string }) => item.codigo === "EMP-DEV-001",
    );

    await page
      .getByLabel("Filtrar por departamento")
      .selectOption(empleado.departamento.publicId);

    await expect(page.getByText("EMP-DEV-001")).toBeVisible();
    await expect(page.getByText("EMP-JUR-001")).toHaveCount(0);
  });

  test("las solicitudes de permiso permiten adjuntar un comprobante", async ({
    page,
  }) => {
    await page.goto("/rh/solicitudes-permiso");
    await page.getByRole("button", { name: "Nueva solicitud" }).click();
    await expect(
      page.getByRole("heading", { name: "Nueva solicitud" }),
    ).toBeVisible();
    await expect(page.getByText("Comprobante (opcional)")).toBeVisible();

    await page.getByLabel("Comprobante (opcional)").setInputFiles({
      name: "carta-vacaciones.pdf",
      mimeType: "application/pdf",
      buffer: Buffer.from("%PDF-1.4 carta firmada"),
    });
    await expect(page.getByText("carta-vacaciones.pdf")).toBeVisible();
  });

  test("el grid de solicitudes permite adjuntar comprobante", async ({
    page,
  }) => {
    await page.goto("/rh/solicitudes-permiso");
    await expect(page.getByRole("table")).toBeVisible();
    await expect(
      page
        .getByRole("button", {
          name: /Adjuntar comprobante|Reemplazar comprobante/,
        })
        .first(),
    ).toBeVisible();
  });

  test("el formulario de producto muestra todas las categorías", async ({
    page,
  }) => {
    const categorias = await page.request
      .get("/api/proxy/almacen/productos/categorias")
      .then((respuesta) => respuesta.json());

    await page.goto("/almacen/productos");
    await page.getByRole("button", { name: "Nuevo producto" }).click();

    await expect(
      page.getByLabel("Categoría", { exact: true }).locator("option"),
    ).toHaveCount(categorias.length + 1);
  });

  test("inventario muestra el stock y los cortes mensuales", async ({
    page,
  }) => {
    await page.goto("/almacen/inventario");
    await expect(
      page.getByRole("heading", { name: "Inventario", level: 1 }),
    ).toBeVisible();
    await expect(
      page.getByRole("tab", { name: /Stock actual/ }),
    ).toBeVisible();
    await expect(
      page.getByRole("tab", { name: /Cortes mensuales/ }),
    ).toBeVisible();
    await expect(page.getByText("DEV-PROD-001")).toBeVisible();

    await page.getByRole("tab", { name: /Cortes mensuales/ }).click();
    await expect(
      page.getByRole("button", { name: "Generar corte" }),
    ).toBeVisible();
    await expect(
      page.getByLabel("Filtrar cortes por almacén"),
    ).toBeVisible();
  });

  test("salidas de inventario lista y abre el formulario", async ({
    page,
  }) => {
    await page.goto("/almacen/salidas");
    await expect(
      page.getByRole("heading", {
        name: "Salidas de inventario",
        level: 1,
      }),
    ).toBeVisible();

    await page.getByRole("button", { name: "Nueva salida" }).click();
    await expect(
      page.getByRole("heading", { name: "Nueva salida" }),
    ).toBeVisible();
    await expect(page.getByLabel("Almacén de origen")).toBeVisible();
    await expect(page.getByLabel("Motivo")).toBeVisible();
  });

  test("la pantalla de turnos lista y abre el formulario", async ({ page }) => {
    await page.goto("/rh/turnos");
    await expect(
      page.getByRole("heading", { name: "Turnos", level: 1 }),
    ).toBeVisible();
    await expect(
      page.getByRole("columnheader", { name: "Horario" }),
    ).toBeVisible();

    await page.getByRole("button", { name: "Nuevo turno" }).click();
    await expect(
      page.getByRole("heading", { name: "Nuevo turno" }),
    ).toBeVisible();
    await expect(page.getByLabel("Periodicidad")).toBeVisible();
    await expect(page.getByLabel("Hora de entrada")).toBeVisible();
    await expect(
      page.getByRole("group", { name: "Días laborables" }),
    ).toBeVisible();
  });

  test("el perfil muestra el nombre del rol y no el uuid", async ({ page }) => {
    await page.goto("/perfil");
    await expect(
      page.getByRole("heading", { name: "Mi perfil", level: 1 }),
    ).toBeVisible();

    const detalle = await page.locator("dl").innerText();
    expect(detalle).toContain("Administra");
    expect(detalle).not.toMatch(/[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}/i);
  });
});
