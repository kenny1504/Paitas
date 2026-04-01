# Futura

Frontend estatico para Radio Futura con acceso por roles, vistas de ejecutivos, cartera de clientes y dashboard individual por cliente.

## Vistas

- `index.html`: pantalla de acceso.
- `Home.html`: vista principal para administradores con acceso a ejecutivos.
- `clients.html`: cartera de clientes filtrada por ejecutivo.
- `dashboard_spots_demo.html`: dashboard individual del cliente.

## Tipos de acceso

- `Admin / Admin123*`: acceso completo a Home, Clientes y Dashboard.
- `user1 / A1234*`: acceso directo a la cartera de `Lic. Sergio Hernandez`.
- `user2 / B1234*`: acceso directo a la cartera de `Lic. Jaquelin Zeledon`.
- `cliente / 1234`: acceso directo al dashboard del cliente si existe en `https://radiofuturanicaragua.com/clientes/data/index.json`.

Nota:
El acceso de cliente externo acepta el nombre del cliente tal como existe en `index.json`. Tambien tolera variantes como `client betcris`.

## Tecnologias

- HTML, CSS y JavaScript modular.
- Tailwind CSS instalado en local.
- Chart.js para graficas.
- SheetJS (`xlsx`) para exportacion a Excel.

## Estructura

- `assets/css/dashboard.css`: estilos principales de la aplicacion.
- `assets/css/tailwind.css`: entrada local de Tailwind.
- `assets/css/tailwind.generated.css`: salida compilada de Tailwind.
- `assets/js/auth.js`: autenticacion y control de sesiones.
- `assets/js/login.js`: flujo de acceso.
- `assets/js/home.js`: proteccion y redireccion de Home.
- `assets/js/clients.js`: cartera de clientes del ejecutivo.
- `assets/js/app.js`: dashboard individual del cliente.
- `assets/js/ui.js`: utilidades de interfaz del dashboard.
- `assets/js/api.js`: consultas a `index.json` y archivos diarios.

## Instalacion

```bash
npm install
```

## Tailwind en local

Compilar una vez:

```bash
npm run build:tailwind
```

Mantener compilacion en escucha:

```bash
npm run watch:tailwind
```

## Flujo de uso

1. Iniciar sesion desde `index.html`.
2. Si el usuario es `Admin`, entra a `Home.html`.
3. Si el usuario es un ejecutivo, entra directo a su cartera en `clients.html`.
4. Si el acceso es de cliente externo, entra directo a `dashboard_spots_demo.html`.

## Fuentes de datos

- Clientes:
  `/clientes/data/index.json`
- Dashboard por cliente y fecha:
  `/clientes/data/{cliente}/{yyyy-mm-dd}.json`

## Centralizacion de rutas

- La URL base del sitio y las rutas de datos quedaron centralizadas en [assets/js/config.js](C:\Users\kenny\Documents\Ksoft\Futura\assets\js\config.js#L1).
- Las imagenes del frontend usan rutas relativas al sitio para no repetir el dominio completo en cada HTML.

## Notas

- Las vistas `Home`, `Clientes` y `Dashboard` estan protegidas por sesion.
- La exportacion a Excel esta disponible en la vista de clientes y en el dashboard.
- La vista de clientes muestra actividad reciente segun spots detectados en los ultimos 5 dias.
