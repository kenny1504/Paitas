import { APP_PATHS, buildSiteUrl } from "./config.js";

const AUTH_KEY = "futura_admin_session";
const CLIENT_INDEX_URL = buildSiteUrl(APP_PATHS.clientIndex);

const USERS = {
  Admin: {
    password: "Admin123*",
    role: "admin",
    homeUrl: "./Home.html"
  },
  user1: {
    password: "A1234*",
    role: "executive",
    executiveName: "Lic. Sergio Hernandez",
    ownerPhone: "50578793255"
  },
  user2: {
    password: "B1234*",
    role: "executive",
    executiveName: "Lic. Jaquelin Zeledon",
    ownerPhone: "50584992075"
  }
};

export function login(username, password) {
  const account = USERS[username];

  if (!account || account.password !== password) {
    return null;
  }

  const session = {
    username,
    role: account.role,
    executiveName: account.executiveName || "",
    ownerPhone: account.ownerPhone || "",
    homeUrl: account.role === "admin"
      ? "./Home.html"
      : buildClientsUrl(account.ownerPhone, account.executiveName)
  };

  sessionStorage.setItem(AUTH_KEY, JSON.stringify(session));
  return session;
}

export async function loginClient(username, password) {
  if (password !== "1234") {
    return null;
  }

  const response = await fetch(CLIENT_INDEX_URL, { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`No se pudo validar el cliente: ${response.status}`);
  }

  const data = await response.json();
  const clients = Array.isArray(data) ? data : [];
  const normalizedUsername = normalizeClientLogin(username);

  const matchedClient = clients.find((item) => {
    const clientName = String(item?.client || "");
    return normalizeClientLogin(clientName) === normalizedUsername;
  });

  if (!matchedClient) {
    return null;
  }

  const clientName = String(matchedClient.client || "").trim().toLowerCase();
  const session = {
    username,
    role: "client",
    executiveName: "",
    ownerPhone: "",
    clientName,
    homeUrl: buildClientDashboardUrl(clientName)
  };

  sessionStorage.setItem(AUTH_KEY, JSON.stringify(session));
  return session;
}

export function logout() {
  sessionStorage.removeItem(AUTH_KEY);
}

export function getSession() {
  try {
    const raw = sessionStorage.getItem(AUTH_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function isAuthenticated() {
  return Boolean(getSession());
}

export function requireAuth(redirectTo = "./index.html") {
  if (!isAuthenticated()) {
    window.location.href = redirectTo;
    return false;
  }

  return true;
}

export function getDefaultRoute() {
  const session = getSession();
  return session?.homeUrl || "./Home.html";
}

export function buildClientsUrl(ownerPhone, executiveName) {
  return `./clients.html?ownerPhone=${encodeURIComponent(ownerPhone)}&executive=${encodeURIComponent(executiveName)}`;
}

export function buildClientDashboardUrl(clientName) {
  return `./dashboard_spots_demo.html?client=${encodeURIComponent(clientName)}`;
}

function normalizeClientLogin(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/^client\s+/i, "")
    .replaceAll("_", " ")
    .replace(/\s+/g, " ")
    .trim();
}
