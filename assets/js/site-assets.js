import { APP_PATHS, buildSiteUrl } from "./config.js";

const ASSET_MAP = {
  futuraLogo: APP_PATHS.futuraLogo,
  tuSpotLogo: APP_PATHS.tuSpotLogo,
  sergioPhoto: APP_PATHS.sergioPhoto,
  jaquelinPhoto: APP_PATHS.jaquelinPhoto
};

document.querySelectorAll("[data-site-asset]").forEach((node) => {
  const assetKey = node.getAttribute("data-site-asset");
  const assetPath = ASSET_MAP[assetKey];

  if (!assetPath) {
    return;
  }

  node.setAttribute("src", buildSiteUrl(assetPath));
});
