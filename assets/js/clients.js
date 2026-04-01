import { fetchClients, fetchDashboardRange } from "./api.js";
import { buildClientDashboardUrl, getSession, requireAuth } from "./auth.js";
import { escapeHtml, formatClientName, runInBatches, toInputDate } from "./utils.js";

const dom = {
  pageLoader: document.getElementById("pageLoader"),
  pageLoaderText: document.getElementById("pageLoaderText"),
  alertBox: document.getElementById("alerta"),
  clientsSearchInput: document.getElementById("clientesSearchInput"),
  clearClientsSearchButton: document.getElementById("limpiarClientesSearchBtn"),
  clientsGrid: document.getElementById("clientesGrid"),
  clientsSummary: document.getElementById("clientesResumen"),
  exportButton: document.getElementById("exportarClientesBtn"),
  clientsHeroDescription: document.getElementById("clientsHeroDescription"),
  clientsCountText: document.getElementById("clientsCountText"),
  executiveTitle: document.getElementById("executiveTitle"),
  navExecutives: document.getElementById("navEjecutivos"),
  navDashboard: document.getElementById("navDashboard")
};

const params = new URLSearchParams(window.location.search);
const ownerPhone = normalizePhone(params.get("ownerPhone") || "");
const executiveName = params.get("executive") || "Ejecutivo";
const state = {
  clients: []
};

initialize();

async function initialize() {
  if (!requireAuth()) {
    return;
  }

  const session = getSession();
  if (session?.role === "client" && session.clientName) {
    window.location.href = buildClientDashboardUrl(session.clientName);
    return;
  }

  updateNavigation();
  updateExecutiveCopy();
  dom.exportButton?.addEventListener("click", exportClientsToExcel);
  dom.clientsSearchInput?.addEventListener("input", renderClientsGrid);
  dom.clearClientsSearchButton?.addEventListener("click", () => {
    dom.clientsSearchInput.value = "";
    renderClientsGrid();
    dom.clientsSearchInput.focus();
  });
  setExportEnabled(false);

  if (!ownerPhone) {
    showAlert("No se identifico un ejecutivo valido para cargar sus clientes.");
    dom.clientsSummary.textContent = "Sin ejecutivo seleccionado";
    dom.clientsCountText.textContent = "No se puede construir la cartera sin un ejecutivo definido.";
    return;
  }

  try {
    setLoading(true, "Cargando clientes asignados...");
    const allClients = await fetchClients();
    const clients = allClients
      .filter((client) => normalizePhone(client.phone || "") === ownerPhone)
      .sort((left, right) => formatClientName(left.client).localeCompare(formatClientName(right.client), "es"));

    if (!clients.length) {
      dom.clientsSummary.textContent = "0 cliente(s) disponibles";
      dom.clientsCountText.textContent = "No se encontraron clientes asignados a este ejecutivo.";
      dom.clientsGrid.innerHTML = '<div class="client-card client-card--empty">No hay clientes disponibles para este ejecutivo.</div>';
      return;
    }

    setLoading(true, "Validando actividad reciente...");
    const clientsWithActivity = await decorateClientsWithRecentActivity(clients);
    state.clients = clientsWithActivity;
    dom.clientsSummary.textContent = `${clients.length} cliente(s) disponibles`;
    dom.clientsCountText.textContent = `${clients.length} cliente(s) asignados para gestion comercial.`;
    renderClientsGrid();
    setExportEnabled(clientsWithActivity.length > 0);
  } catch (error) {
    console.error(error);
    showAlert("No se pudo cargar el listado de clientes.");
    dom.clientsSummary.textContent = "Error al cargar";
    dom.clientsCountText.textContent = "Ocurrio un problema al consultar la cartera asignada.";
    setExportEnabled(false);
  } finally {
    setLoading(false);
  }
}

function renderClientCard(client) {
  const clientName = formatClientName(client.client);
  const clientValue = encodeURIComponent(String(client.client || "").trim().toLowerCase());
  const dashboardUrl = `./dashboard_spots_demo.html?ownerPhone=${encodeURIComponent(ownerPhone)}&executive=${encodeURIComponent(executiveName)}&client=${clientValue}`;
  const activityClass = client.hasRecentActivity ? " client-card__status--active" : " client-card__status--inactive";
  const activityLabel = client.hasRecentActivity ? "Actividad reciente" : "Inactivo";

  return `
    <article class="client-card client-card--link">
      <div>
        <span class="client-card__status${activityClass}">${activityLabel}</span>
        <strong class="client-card__title">${escapeHtml(clientName)}</strong>
        <p class="client-card__text">Abre el dashboard individual de este cliente.</p>
      </div>
      <a href="${dashboardUrl}" class="client-card__cta client-card__cta--link">Ver dashboard</a>
    </article>
  `;
}

function renderClientsGrid() {
  const query = String(dom.clientsSearchInput?.value || "").trim().toLowerCase();
  const filteredClients = state.clients.filter((client) => {
    const clientName = formatClientName(client.client).toLowerCase();
    return !query || clientName.includes(query);
  });

  dom.clientsSummary.textContent = `${filteredClients.length} cliente(s) disponibles`;

  if (!filteredClients.length) {
    dom.clientsGrid.innerHTML = '<div class="client-card client-card--empty">No hay clientes que coincidan con la busqueda.</div>';
    setExportEnabled(false);
    return;
  }

  dom.clientsGrid.innerHTML = filteredClients.map(renderClientCard).join("");
  setExportEnabled(filteredClients.length > 0);
}

function updateExecutiveCopy() {
  dom.executiveTitle.textContent = executiveName;
  dom.clientsHeroDescription.textContent = `Explora la cartera asignada a ${executiveName} y entra al dashboard individual de cada cliente cuando lo necesites.`;
}

function updateNavigation() {
  const executivesUrl = ownerPhone
    ? `./Home.html?ownerPhone=${encodeURIComponent(ownerPhone)}&executive=${encodeURIComponent(executiveName)}`
    : "./Home.html";

  dom.navExecutives.href = executivesUrl;
  dom.navDashboard.href = "./dashboard_spots_demo.html";
}

function showAlert(message) {
  dom.alertBox.textContent = message;
  dom.alertBox.classList.remove("hidden");
}

function setLoading(isLoading, message = "Cargando informacion...") {
  if (dom.pageLoaderText) {
    dom.pageLoaderText.textContent = message;
  }

  if (dom.pageLoader) {
    dom.pageLoader.classList.toggle("hidden", !isLoading);
  }
}

function setExportEnabled(enabled) {
  if (dom.exportButton) {
    dom.exportButton.disabled = !enabled;
  }
}

function exportClientsToExcel() {
  const query = String(dom.clientsSearchInput?.value || "").trim().toLowerCase();
  const exportClients = state.clients.filter((client) => {
    const clientName = formatClientName(client.client).toLowerCase();
    return !query || clientName.includes(query);
  });

  if (!exportClients.length) {
    showAlert("No hay clientes para exportar.");
    return;
  }

  const rows = exportClients.map((client) => ({
    Ejecutivo: executiveName,
    Cliente: formatClientName(client.client),
    Telefono: client.phone || "",
    Estado: client.hasRecentActivity ? "Actividad reciente" : "Inactivo"
  }));

  const worksheet = XLSX.utils.json_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Clientes");

  const executiveSlug = executiveName.replaceAll(" ", "_");
  XLSX.writeFile(workbook, `clientes_${executiveSlug}.xlsx`);
}

async function decorateClientsWithRecentActivity(clients) {
  const today = new Date();
  const startDate = new Date();
  startDate.setDate(today.getDate() - 4);

  const from = toInputDate(startDate);
  const to = toInputDate(today);

  return runInBatches(clients, 4, async (client) => {
    const clientKey = String(client.client || "").trim().toLowerCase();
    const results = await fetchDashboardRange(clientKey, from, to);
    const hasRecentActivity = results.some((item) => {
      if (!item.found || !item.data) {
        return false;
      }

      const totalSpots = Number(item.data.total_spots || 0);
      const detections = Array.isArray(item.data.detections) ? item.data.detections.length : 0;
      return totalSpots > 0 || detections > 0;
    });

    return {
      ...client,
      hasRecentActivity
    };
  });
}

function normalizePhone(value) {
  return String(value || "").replace(/\D/g, "");
}
