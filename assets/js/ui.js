import { escapeHtml, formatClientName, formatNumber, secondsToText } from "./utils.js";
import { renderDailyChart, renderHourlyChart } from "./charts.js";

export function getDom() {
  return {
    clientInput: document.getElementById("clienteInput"),
    navExecutives: document.getElementById("navEjecutivos"),
    navClients: document.getElementById("navClientes"),
    pageLoader: document.getElementById("pageLoader"),
    pageLoaderText: document.getElementById("pageLoaderText"),
    clientSearchInput: document.getElementById("clienteSearchInput"),
    clientDropdown: document.getElementById("clienteDropdown"),
    clearSearchButton: document.getElementById("limpiarBusquedaBtn"),
    clientCardName: document.getElementById("clienteCardNombre"),
    clientCardRange: document.getElementById("clienteCardRango"),
    startDateInput: document.getElementById("desdeInput"),
    endDateInput: document.getElementById("hastaInput"),
    loadButton: document.getElementById("cargarBtn"),
    exportButton: document.getElementById("exportarExcelBtn"),
    clientSummaryName: document.getElementById("clienteResumenNombre"),
    clientSummaryRange: document.getElementById("clienteResumenRango"),
    clientSummaryTopSpot: document.getElementById("clienteResumenTopSpot"),
    clientSummaryActivity: document.getElementById("clienteResumenActividad"),
    alertBox: document.getElementById("alerta"),
    statusLabel: document.getElementById("estadoCarga"),
    rangeLabel: document.getElementById("rangoLabel"),
    totalSpots: document.getElementById("kpiTotalSpots"),
    daysWithData: document.getElementById("kpiDiasConDatos"),
    daysWithoutData: document.getElementById("kpiDiasSinDatos"),
    dailyAverage: document.getElementById("kpiPromedioDiario"),
    topSpotsTable: document.getElementById("tablaTopSpots"),
    durationsTable: document.getElementById("tablaDuraciones"),
    detailsTable: document.getElementById("tablaDetalles"),
    dailyChartCanvas: document.getElementById("chartDiario"),
    hourlyChartCanvas: document.getElementById("chartHora")
  };
}

export function bindEvents(dom, handlers) {
  dom.loadButton.addEventListener("click", handlers.onLoadDashboard);
  dom.clientInput.addEventListener("change", handlers.onClientSelect);
  dom.clientSearchInput.addEventListener("focus", handlers.onSearchFocus);
  dom.clientSearchInput.addEventListener("input", handlers.onSearchInput);
  dom.clearSearchButton.addEventListener("click", handlers.onClearSearch);
  dom.exportButton.addEventListener("click", handlers.onExportExcel);

  document.addEventListener("click", (event) => {
    const inside =
      event.target.closest("#clienteSearchInput") ||
      event.target.closest("#clienteDropdown") ||
      event.target.closest("#limpiarBusquedaBtn");

    if (!inside) {
      handlers.onCloseDropdown();
    }
  });
}

export function populateClientSelect(dom, clients) {
  dom.clientInput.innerHTML = [
    '<option value="" selected>Selecciona un cliente</option>',
    ...clients.map((client) => {
      const value = escapeHtml(client.client.toLowerCase());
      const label = escapeHtml(formatClientName(client.client));
      return `<option value="${value}">${label}</option>`;
    })
  ].join("");
}

export function renderClientDropdown(dom, clients, filterText, onSelect) {
  const query = (filterText || "").trim().toLowerCase();
  const filtered = clients
    .filter((client) => client && client.client)
    .filter((client) => {
      const name = String(client.client || "").toLowerCase();
      return !query || name.includes(query);
    })
    .slice(0, 25);

  if (!filtered.length) {
    dom.clientDropdown.innerHTML = '<div class="dropdown__empty">No se encontraron clientes.</div>';
    dom.clientDropdown.classList.remove("hidden");
    return;
  }

  dom.clientDropdown.innerHTML = filtered
    .map((client) => `
      <button type="button" class="dropdown__item" data-client="${escapeHtml(client.client.toLowerCase())}">
        <div>
          <div class="dropdown__title">${escapeHtml(formatClientName(client.client))}</div>
        </div>
        <span class="dropdown__badge">Elegir</span>
      </button>
    `)
    .join("");

  dom.clientDropdown.classList.remove("hidden");
  dom.clientDropdown.querySelectorAll(".dropdown__item").forEach((button) => {
    button.addEventListener("click", () => onSelect(button.dataset.client || ""));
  });
}

export function hideClientDropdown(dom) {
  dom.clientDropdown.classList.add("hidden");
}

export function clearSearch(dom) {
  dom.clientSearchInput.value = "";
  dom.clientSearchInput.focus();
}

export function updateClientCard(dom, data) {
  dom.clientCardName.textContent = data?.client || "--";
  dom.clientCardRange.textContent = data?.startDate && data?.endDate
    ? `${data.startDate} -> ${data.endDate}`
    : "Sin rango seleccionado";

  dom.clientSummaryName.textContent = data?.client || "--";
  dom.clientSummaryRange.textContent = data?.startDate && data?.endDate
    ? `${data.startDate} -> ${data.endDate}`
    : "Sin rango";
  dom.clientSummaryTopSpot.textContent = data?.topSpot || "Sin datos";
  dom.clientSummaryActivity.textContent = data?.activityRate || "0%";
}

export function renderDashboard(dom, dashboard) {
  dom.totalSpots.textContent = formatNumber(dashboard.totalSpots);
  dom.daysWithData.textContent = formatNumber(dashboard.daysWithData);
  dom.daysWithoutData.textContent = formatNumber(dashboard.daysWithoutData);
  dom.dailyAverage.textContent = dashboard.dailyAverage.toFixed(1);
  dom.rangeLabel.textContent = `${dashboard.startDate} -> ${dashboard.endDate}`;

  const errorInfo = dashboard.daysWithError ? ` | ${dashboard.daysWithError} dia(s) con error` : "";
  dom.statusLabel.textContent = `Cliente ${dashboard.client} | ${dashboard.details.length} detecciones consolidadas${errorInfo}`;

  updateClientCard(dom, dashboard);
  renderDailyChart(dom.dailyChartCanvas, dashboard.dailySeries);
  renderHourlyChart(dom.hourlyChartCanvas, dashboard.hourlyDetections);
  renderTopSpotsTable(dom.topSpotsTable, dashboard.topSpots);
  renderDurationsTable(dom.durationsTable, dashboard.durations);
  renderDetailsTable(dom.detailsTable, dashboard.details);
}

export function showAlert(dom, message) {
  dom.alertBox.textContent = message;
  dom.alertBox.classList.remove("hidden");
}

export function hideAlert(dom) {
  dom.alertBox.textContent = "";
  dom.alertBox.classList.add("hidden");
}

export function setLoading(dom, isLoading, message = "") {
  dom.loadButton.disabled = isLoading;
  dom.loadButton.textContent = isLoading ? "Cargando..." : "Cargar dashboard";

  if (message) {
    dom.statusLabel.textContent = message;
    if (dom.pageLoaderText) {
      dom.pageLoaderText.textContent = message;
    }
  }

  if (dom.pageLoader) {
    dom.pageLoader.classList.toggle("hidden", !isLoading);
  }
}

export function setExportEnabled(dom, enabled) {
  dom.exportButton.disabled = !enabled;
}

function renderTopSpotsTable(tbody, rows) {
  if (!rows.length) {
    tbody.innerHTML = emptyRow(3, "No hay datos para mostrar.");
    return;
  }

  tbody.innerHTML = rows
    .map((row) => `
      <tr>
        <td>${escapeHtml(row.spot)}</td>
        <td class="align-right">${formatNumber(row.total)}</td>
        <td class="align-right">${row.percentage.toFixed(1)}%</td>
      </tr>
    `)
    .join("");
}

function renderDurationsTable(tbody, rows) {
  if (!rows.length) {
    tbody.innerHTML = emptyRow(2, "No hay datos para mostrar.");
    return;
  }

  tbody.innerHTML = rows
    .map((row) => `
      <tr>
        <td>${escapeHtml(row.spot)}</td>
        <td class="align-right">${secondsToText(row.averageSeconds)}</td>
      </tr>
    `)
    .join("");
}

function renderDetailsTable(tbody, rows) {
  if (!rows.length) {
    tbody.innerHTML = emptyRow(4, "No se encontraron detecciones en el rango seleccionado.");
    return;
  }

  tbody.innerHTML = rows
    .map((row) => `
      <tr>
        <td>${row.date}</td>
        <td>${row.hour}</td>
        <td>${escapeHtml(row.spot)}</td>
        <td class="align-right">${row.duration}</td>
      </tr>
    `)
    .join("");
}

function emptyRow(colspan, message) {
  return `<tr><td colspan="${colspan}" class="table-empty">${message}</td></tr>`;
}
