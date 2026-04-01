export const SITE_BASE_URL = "https://radiofuturanicaragua.com";

export const APP_PATHS = {
  clientIndex: "/clientes/data/index.json",
  clientDataBase: "/clientes/data",
  reelsIndex: "/clientes/reels/index.php",
  reelsBase: "/clientes/reels",
  futuraLogo: "/images/logo-futura.png",
  tuSpotLogo: "/tuspotenlaradio/img/tuspot.png",
  sergioPhoto: "/tuspotenlaradio/futura/img/sergio.png",
  jaquelinPhoto: "/tuspotenlaradio/futura/img/jaquelin.png"
};

export function buildSiteUrl(path) {
  return `${SITE_BASE_URL}${path}`;
}
