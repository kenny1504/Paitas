import { APP_SERVICES, LOGIN_NOTIFICATION_EMAIL } from "./config.js";

export function notifyLogin(session) {
  if (!session) {
    return;
  }

  const now = new Date();
  const loginTime = now.toLocaleString("es-NI", {
    dateStyle: "full",
    timeStyle: "medium"
  });
  const roleLabel = getRoleLabel(session);
  const accessScope = getAccessScope(session);
  const targetLabel = getTargetLabel(session);
  const loginId = `LOGIN-${now.getTime()}`;
  const message = [
    "Se detecto un nuevo inicio de sesion en el panel de clientes de Radio Futura.",
    "",
    `ID de evento: ${loginId}`,
    `Usuario: ${session.username || "No disponible"}`,
    `Tipo de acceso: ${roleLabel}`,
    `Alcance: ${accessScope}`,
    `Destino inicial: ${session.homeUrl || "No disponible"}`,
    `Fecha y hora: ${loginTime}`,
    `Origen: ${window.location.origin}`,
    `Pagina de acceso: ${window.location.href}`,
    `Navegador: ${navigator.userAgent}`,
    `Idioma: ${navigator.language || "No disponible"}`,
    targetLabel ? `Referencia: ${targetLabel}` : ""
  ]
    .filter(Boolean)
    .join("\n");

  const body = new FormData();
  body.append("_subject", `Inicio de sesion ${roleLabel} - ${session.username}`);
  body.append("_template", "table");
  body.append("_captcha", "false");
  body.append("name", "Panel Radio Futura");
  body.append("email", "no-reply@radiofutura.local");
  body.append("message", message);
  body.append("destino", LOGIN_NOTIFICATION_EMAIL);
  body.append("id_evento", loginId);
  body.append("usuario", session.username || "");
  body.append("tipo_acceso", roleLabel);
  body.append("alcance", accessScope);
  body.append("fecha_hora", loginTime);
  body.append("ruta_inicial", session.homeUrl || "");
  body.append("ejecutivo", session.executiveName || "");
  body.append("telefono_ejecutivo", session.ownerPhone || "");
  body.append("cliente", session.clientName || "");
  body.append("origen", window.location.origin);
  body.append("navegador", navigator.userAgent);

  const sentByBeacon = sendByBeacon(body);

  if (!sentByBeacon) {
    fetch(APP_SERVICES.loginNotificationEndpoint, {
      method: "POST",
      body,
      headers: {
        Accept: "application/json"
      },
      mode: "cors",
      keepalive: true
    }).catch((error) => {
      console.warn("No se pudo notificar el inicio de sesion por correo.", error);
    });
  }
}

function getRoleLabel(session) {
  switch (session?.role) {
    case "admin":
      return "Administrador";
    case "executive":
      return "Ejecutivo";
    case "client":
      return "Cliente externo";
    default:
      return "Usuario";
  }
}

function getAccessScope(session) {
  if (session?.role === "admin") {
    return "Acceso completo al sistema";
  }

  if (session?.role === "executive") {
    return "Acceso restringido a cartera asignada";
  }

  if (session?.role === "client") {
    return "Acceso directo a dashboard individual";
  }

  return "Acceso no identificado";
}

function getTargetLabel(session) {
  if (session?.role === "executive") {
    return `${session.executiveName || "Ejecutivo sin nombre"} | ${session.ownerPhone || "Sin telefono"}`;
  }

  if (session?.role === "client") {
    return session.clientName || "";
  }

  return "";
}

function sendByBeacon(formData) {
  if (typeof navigator.sendBeacon !== "function") {
    return false;
  }

  try {
    return navigator.sendBeacon(APP_SERVICES.loginNotificationEndpoint, formData);
  } catch {
    return false;
  }
}
