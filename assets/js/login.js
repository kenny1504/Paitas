import { getDefaultRoute, isAuthenticated, login, loginClient } from "./auth.js";
import { notifyLogin } from "./login-notify.js";

const form = document.getElementById("loginForm");
const usernameInput = document.getElementById("username");
const passwordInput = document.getElementById("password");
const togglePasswordButton = document.getElementById("togglePassword");
const alertBox = document.getElementById("loginAlert");
const submitButton = form.querySelector('button[type="submit"]');

if (isAuthenticated()) {
  window.location.href = getDefaultRoute();
}

togglePasswordButton.addEventListener("click", () => {
  const isPassword = passwordInput.type === "password";
  passwordInput.type = isPassword ? "text" : "password";
  togglePasswordButton.textContent = isPassword ? "Ocultar" : "Mostrar";
});

form.addEventListener("submit", async (event) => {
  event.preventDefault();

  const username = usernameInput.value.trim();
  const password = passwordInput.value;
  alertBox.textContent = "";
  submitButton.disabled = true;
  submitButton.textContent = "Validando...";

  try {
    let session = login(username, password);

    if (!session) {
      session = await loginClient(username, password);
    }

    if (session) {
      notifyLogin(session);
      window.location.href = session.homeUrl;
      return;
    }

    alertBox.textContent = "Credenciales incorrectas. Verifica usuario y password.";
  } catch {
    alertBox.textContent = "No se pudo validar el acceso en este momento.";
  } finally {
    submitButton.disabled = false;
    submitButton.textContent = "Acceder";
  }
});
