import { buildClientDashboardUrl, getSession, requireAuth } from "./auth.js";

if (requireAuth()) {
  const session = getSession();

  if (session?.role === "executive" && session.ownerPhone && session.executiveName) {
    window.location.href = `./clients.html?ownerPhone=${encodeURIComponent(session.ownerPhone)}&executive=${encodeURIComponent(session.executiveName)}`;
  }

  if (session?.role === "client" && session.clientName) {
    window.location.href = buildClientDashboardUrl(session.clientName);
  }
}
