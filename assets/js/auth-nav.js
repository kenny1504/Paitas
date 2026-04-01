import { logout, requireAuth } from "./auth.js";

if (requireAuth()) {
  const logoutButton = document.getElementById("logoutButton");

  if (logoutButton) {
    logoutButton.addEventListener("click", () => {
      logout();
      window.location.href = "./index.html";
    });
  }
}
