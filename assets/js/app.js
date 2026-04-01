import { fetchClients, fetchDashboardRange } from "./api.js";
import { buildClientDashboardUrl, getSession, requireAuth } from "./auth.js";
import {
  bindEvents,
  clearSearch,
  getDom,
  hideAlert,
  hideClientDropdown,
  populateClientSelect,
  renderClientDropdown,
  renderDashboard,
  setExportEnabled,
  setLoading,
  showAlert,
  updateClientCard
} from "./ui.js";
import { durationToSeconds, extractHour, formatClientName, toInputDate } from "./utils.js";

const dom = getDom();
const urlParams = new URLSearchParams(window.location.search);
const ownerPhoneFilter = normalizePhone(urlParams.get("ownerPhone") || "");
const selectedClientParam = String(urlParams.get("client") || "").trim().toLowerCase();
const executiveName = urlParams.get("executive") || "";

const state = {
  clients: [],
  selectedClient: "",
  currentDashboard: null
};

initialize();

async function initialize() {
  if (!requireAuth()) {
    return;
  }

  const session = getSession();
  if (session?.role === "client" && session.clientName && selectedClientParam && session.clientName !== selectedClientParam) {
    window.location.href = buildClientDashboardUrl(session.clientName);
    return;
  }

  const today = new Date();
  const previousWindow = new Date();
  previousWindow.setDate(today.getDate() - 29);

  dom.startDateInput.value = toInputDate(previousWindow);
  dom.endDateInput.value = toInputDate(today);

  bindEvents(dom, {
    onLoadDashboard: loadDashboard,
    onClientSelect: () => {
      syncSelectedClientFromSelect();
      hideAlert(dom);
    },
    onSearchFocus: () => renderDropdown(dom.clientSearchInput.value),
    onSearchInput: () => renderDropdown(dom.clientSearchInput.value),
    onClearSearch: () => {
      clearSearch(dom);
      renderDropdown("");
    },
    onExportExcel: exportDetailsToExcel,
    onCloseDropdown: () => hideClientDropdown(dom)
  });

  try {
    updateNavigation();
    setLoading(dom, true, "Cargando clientes...");
    const allClients = await fetchClients();
    state.clients = session?.role === "client" && session.clientName
      ? allClients.filter((client) => String(client.client || "").trim().toLowerCase() === session.clientName)
      : ownerPhoneFilter
      ? allClients.filter((client) => normalizePhone(client.phone || "") === ownerPhoneFilter)
      : allClients;

    if (!state.clients.length) {
      throw new Error("No hay clientes disponibles para este ejecutivo.");
    }

    populateClientSelect(dom, state.clients);
    state.selectedClient = "";
    state.currentDashboard = null;
    dom.clientSearchInput.value = "";
    setExportEnabled(dom, false);

    if (selectedClientParam && state.clients.some((client) => String(client.client || "").trim().toLowerCase() === selectedClientParam)) {
      dom.clientInput.value = selectedClientParam;
      syncSelectedClientFromSelect();
      await loadDashboard();
    } else if (session?.role === "client" && session.clientName && state.clients.length) {
      dom.clientInput.value = session.clientName;
      syncSelectedClientFromSelect();
      await loadDashboard();
    } else {
      updateClientCard(dom, {
        client: "--",
        startDate: "",
        endDate: ""
      });
    }
  } catch (error) {
    console.error(error);
    showAlert(dom, "No se pudo cargar el listado de clientes desde /clientes/data/index.json.");
  } finally {
    setLoading(dom, false);
  }
}

async function loadDashboard() {
  const client = (dom.clientInput.value || "").trim().toLowerCase();
  const startDate = dom.startDateInput.value;
  const endDate = dom.endDateInput.value;

  if (!client || !startDate || !endDate) {
    showAlert(dom, "Debes indicar cliente, fecha desde y fecha hasta.");
    return;
  }

  if (startDate > endDate) {
    showAlert(dom, "La fecha desde no puede ser mayor que la fecha hasta.");
    return;
  }

  hideAlert(dom);
  setLoading(dom, true, "Consultando archivos diarios...");

  try {
    const results = await fetchDashboardRange(client, startDate, endDate);
    const dashboard = buildDashboard(client, startDate, endDate, results);
    state.currentDashboard = dashboard;
    renderDashboard(dom, dashboard);
    setExportEnabled(dom, dashboard.details.length > 0);
  } catch (error) {
    console.error(error);
    showAlert(dom, "Ocurrio un error al cargar el dashboard. Revisa la consola del navegador y la ruta de los archivos JSON.");
  } finally {
    setLoading(dom, false);
  }
}

function buildDashboard(client, startDate, endDate, results) {
  const dailySeries = [];
  const details = [];
  const spotCounts = new Map();
  const hourCounts = new Map();
  const durationsBySpot = new Map();

  let totalSpots = 0;
  let daysWithData = 0;
  let daysWithoutData = 0;
  let daysWithError = 0;

  for (const item of results) {
    if (item?.error) {
      daysWithError += 1;
    }

    if (!item.found || !item.data) {
      daysWithoutData += 1;
      dailySeries.push({ date: item.date, total: 0 });
      continue;
    }

    daysWithData += 1;
    const totalPerDay = Number(item.data.total_spots || 0);
    totalSpots += totalPerDay;
    dailySeries.push({ date: item.date, total: totalPerDay });

    const detections = Array.isArray(item.data.detections) ? item.data.detections : [];

    for (const detection of detections) {
      const timestamp = detection.timestamp || "";
      const spot = String(detection.spot || "SIN NOMBRE").trim();
      const duration = detection.duration || "00:00";
      const hour = extractHour(timestamp);
      const seconds = durationToSeconds(duration);

      details.push({
        date: item.date,
        hour: timestamp.split(" ")[1] || "",
        spot,
        duration
      });

      spotCounts.set(spot, (spotCounts.get(spot) || 0) + 1);
      hourCounts.set(hour, (hourCounts.get(hour) || 0) + 1);

      if (!durationsBySpot.has(spot)) {
        durationsBySpot.set(spot, []);
      }

      durationsBySpot.get(spot).push(seconds);
    }
  }

  const dailyAverage = dailySeries.length ? totalSpots / dailySeries.length : 0;

  const topSpots = [...spotCounts.entries()]
    .map(([spot, total]) => ({
      spot,
      total,
      percentage: totalSpots ? (total / totalSpots) * 100 : 0
    }))
    .sort((left, right) => right.total - left.total)
    .slice(0, 10);

  const hourlyDetections = [...hourCounts.entries()]
    .map(([hour, total]) => ({ hour: Number(hour), total }))
    .sort((left, right) => left.hour - right.hour);

  const durations = [...durationsBySpot.entries()]
    .map(([spot, values]) => ({
      spot,
      averageSeconds: values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0
    }))
    .sort((left, right) => right.averageSeconds - left.averageSeconds);

  details.sort((left, right) => `${right.date} ${right.hour}`.localeCompare(`${left.date} ${left.hour}`));
  const topSpot = topSpots.length ? topSpots[0].spot : "Sin datos";
  const activityRate = dailySeries.length ? `${Math.round((daysWithData / dailySeries.length) * 100)}%` : "0%";

  return {
    client: formatClientName(client),
    startDate,
    endDate,
    topSpot,
    activityRate,
    totalSpots,
    daysWithData,
    daysWithoutData,
    daysWithError,
    dailyAverage,
    dailySeries,
    topSpots,
    hourlyDetections,
    durations,
    details
  };
}

function getCurrentClient() {
  return state.clients.find((client) => String(client.client || "").trim().toLowerCase() === state.selectedClient) || null;
}

function syncSelectedClientFromSelect() {
  state.selectedClient = (dom.clientInput.value || "").trim().toLowerCase();
  const current = getCurrentClient();

  if (!current) {
    dom.clientSearchInput.value = "";
    state.currentDashboard = null;
    setExportEnabled(dom, false);
    updateClientCard(dom, {
      client: "--",
      startDate: "",
      endDate: ""
    });
    return;
  }

  dom.clientSearchInput.value = formatClientName(current.client);
  updateClientCard(dom, {
    client: formatClientName(current.client),
    startDate: dom.startDateInput.value || "--",
    endDate: dom.endDateInput.value || "--"
  });
}

function renderDropdown(filterText) {
  renderClientDropdown(dom, state.clients, filterText, (selectedValue) => {
    selectClientAndLoad(selectedValue);
    hideClientDropdown(dom);
  });
}

function selectClientAndLoad(selectedValue) {
  dom.clientInput.value = selectedValue;
  syncSelectedClientFromSelect();
  loadDashboard();
}

function normalizePhone(value) {
  return String(value || "").replace(/\D/g, "");
}

function updateNavigation() {
  if (!dom.navExecutives) {
    return;
  }

  const session = getSession();
  if (session?.role === "client") {
    dom.navExecutives.classList.add("hidden");
    if (dom.navClients) {
      dom.navClients.classList.add("hidden");
    }
    return;
  }

  const executivesHref = ownerPhoneFilter
    ? `./Home.html?ownerPhone=${encodeURIComponent(ownerPhoneFilter)}&executive=${encodeURIComponent(executiveName)}`
    : "./Home.html";

  const clientsHref = ownerPhoneFilter
    ? `./clients.html?ownerPhone=${encodeURIComponent(ownerPhoneFilter)}&executive=${encodeURIComponent(executiveName)}`
    : "./clients.html";

  dom.navExecutives.href = executivesHref;

  if (dom.navClients) {
    dom.navClients.href = clientsHref;
  }
}

function exportDetailsToExcel() {
  const dashboard = state.currentDashboard;

  if (!dashboard || !dashboard.details.length) {
    showAlert(dom, "No hay detalles para exportar.");
    return;
  }

  const rows = dashboard.details.map((item) => ({
    Fecha: item.date,
    Hora: item.hour,
    Spot: item.spot,
    Duracion: item.duration
  }));

  const worksheet = XLSX.utils.json_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Detalles");

  const fileClient = dashboard.client.replaceAll(" ", "_");
  const fileName = `detalle_spots_${fileClient}_${dashboard.startDate}_${dashboard.endDate}.xlsx`;
  XLSX.writeFile(workbook, fileName);
}
