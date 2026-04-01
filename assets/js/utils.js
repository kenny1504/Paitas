export function toInputDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function formatNumber(value) {
  return new Intl.NumberFormat("es-NI").format(value || 0);
}

export function formatClientName(value) {
  return String(value ?? "")
    .replaceAll("_", " ")
    .trim()
    .toUpperCase();
}

export function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

export function getDateRange(start, end) {
  const dates = [];
  const current = new Date(`${start}T00:00:00`);
  const last = new Date(`${end}T00:00:00`);

  while (current <= last) {
    dates.push(toInputDate(current));
    current.setDate(current.getDate() + 1);
  }

  return dates;
}

export async function runInBatches(items, limit, callback) {
  const results = [];

  for (let index = 0; index < items.length; index += limit) {
    const batch = items.slice(index, index + limit);
    const partial = await Promise.all(batch.map(callback));
    results.push(...partial);
  }

  return results;
}

export function extractHour(timestamp) {
  if (!timestamp || !timestamp.includes(" ")) {
    return 0;
  }

  const hour = Number(timestamp.split(" ")[1]?.split(":")[0] || 0);
  return Number.isNaN(hour) ? 0 : hour;
}

export function durationToSeconds(value) {
  const parts = (value || "00:00").split(":").map(Number);

  if (parts.length === 2) {
    return (parts[0] * 60) + parts[1];
  }

  if (parts.length === 3) {
    return (parts[0] * 3600) + (parts[1] * 60) + parts[2];
  }

  return 0;
}

export function secondsToText(seconds) {
  const total = Math.round(seconds || 0);
  const minutes = String(Math.floor(total / 60)).padStart(2, "0");
  const remainingSeconds = String(total % 60).padStart(2, "0");
  return `${minutes}:${remainingSeconds}`;
}
