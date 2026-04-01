import { APP_PATHS, buildSiteUrl } from "./config.js";
import { getDateRange, runInBatches } from "./utils.js";

const CLIENT_INDEX_URL = buildSiteUrl(APP_PATHS.clientIndex);
const CLIENT_DATA_BASE_URL = buildSiteUrl(APP_PATHS.clientDataBase);
const BATCH_SIZE = 5;

export async function fetchClients() {
  const response = await fetch(CLIENT_INDEX_URL, { cache: "no-store" });

  if (!response.ok) {
    throw new Error(`Error cargando index.json: ${response.status}`);
  }

  const data = await response.json();
  const clients = Array.isArray(data) ? data : [];

  return clients
    .filter((item) => item && typeof item.client === "string" && item.client.trim() !== "")
    .sort((a, b) => a.client.localeCompare(b.client));
}

export async function fetchDashboardRange(client, startDate, endDate) {
  const dates = getDateRange(startDate, endDate);

  return runInBatches(dates, BATCH_SIZE, async (date) => {
    const url = `${CLIENT_DATA_BASE_URL}/${client}/${date}.json`;

    try {
      const response = await fetch(url, { cache: "no-store" });

      if (response.status === 404) {
        return { date, found: false, data: null };
      }

      if (!response.ok) {
        return { date, found: false, data: null, error: true };
      }

      const data = await response.json();
      return { date, found: true, data };
    } catch {
      return { date, found: false, data: null, error: true };
    }
  });
}
