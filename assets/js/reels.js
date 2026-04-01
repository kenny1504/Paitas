import { APP_PATHS, buildSiteUrl } from "./config.js";
import { runInBatches } from "./utils.js";

const reelsByDate = new Map();
let activeAudio = null;
let activeContainer = null;

export async function preloadReelsForDates(dates) {
  const uniqueDates = [...new Set((dates || []).filter(Boolean))].filter((date) => !reelsByDate.has(date));

  await runInBatches(uniqueDates, 3, async (date) => {
    const reels = await fetchReelsForDate(date);
    reelsByDate.set(date, reels);
    return reels;
  });
}

export function findReelForTimestamp(date, timestamp) {
  const reels = reelsByDate.get(date) || [];
  const detectionTime = new Date(timestamp);

  for (const reel of reels) {
    if (detectionTime >= reel.start && detectionTime <= reel.end) {
      return {
        file: reel.file,
        url: getReelFileUrl(date, reel.file)
      };
    }
  }

  return null;
}

export async function playReelInContainer(container, date, file, timestamp) {
  if (!container) {
    return;
  }

  pauseCurrentReelPlayback();

  const reelUrl = getReelFileUrl(date, file);
  const metaUrl = getReelMetaUrl(date, file);

  let startOffset = 0;

  try {
    const response = await fetch(metaUrl, { cache: "no-store" });
    if (response.ok) {
      const meta = await response.json();
      if (meta.start_time) {
        const reelStart = new Date(meta.start_time);
        const spotTime = new Date(timestamp);
        startOffset = Math.floor((spotTime - reelStart) / 1000);
        if (startOffset < 0) {
          startOffset = 0;
        }
      }
    }
  } catch {
    startOffset = 0;
  }

  container.innerHTML = `
    <div class="reel-player-card">
      <div class="reel-player__header">
        <div>
          <p class="section-label">Reel adjunto</p>
          <h3>Reproduccion del spot</h3>
        </div>
        <button type="button" class="secondary-button reel-player__close">Cerrar</button>
      </div>
      <audio id="audioReel" controls autoplay class="reel-player__audio">
        <source src="${reelUrl}" type="audio/mpeg">
      </audio>
      <div class="reel-player__actions">
        <button type="button" class="secondary-button reel-player__toggle">Detener</button>
        <a href="${reelUrl}" download class="secondary-button reel-player__download">Descargar</a>
      </div>
    </div>
  `;

  container.classList.remove("hidden");

  const audio = container.querySelector("#audioReel");
  const toggleButton = container.querySelector(".reel-player__toggle");
  const closeButton = container.querySelector(".reel-player__close");

  activeAudio = audio;
  activeContainer = container;

  const syncToggleLabel = () => {
    if (!toggleButton || !audio) {
      return;
    }

    toggleButton.textContent = audio.paused || audio.ended ? "Reproducir" : "Detener";
  };

  audio?.addEventListener("loadedmetadata", () => {
    audio.currentTime = startOffset;
    syncToggleLabel();
  });

  toggleButton?.addEventListener("click", async () => {
    if (audio) {
      if (audio.paused || audio.ended) {
        if (audio.ended) {
          audio.currentTime = startOffset;
        }

        try {
          await audio.play();
        } catch {
          return;
        }
      } else {
        audio.pause();
        audio.currentTime = startOffset;
      }

      syncToggleLabel();
    }
  });

  audio?.addEventListener("play", syncToggleLabel);
  audio?.addEventListener("pause", syncToggleLabel);
  audio?.addEventListener("ended", () => {
    if (audio) {
      audio.currentTime = startOffset;
    }
    syncToggleLabel();
  });

  closeButton?.addEventListener("click", () => {
    closeReelPlayer();
  });
}

export function pauseCurrentReelPlayback() {
  if (activeAudio) {
    activeAudio.pause();
  }
}

export function closeReelPlayer() {
  if (activeAudio) {
    activeAudio.pause();
  }

  if (activeContainer) {
    activeContainer.classList.add("hidden");
    activeContainer.innerHTML = "";
  }

  activeAudio = null;
  activeContainer = null;
}

async function fetchReelsForDate(date) {
  try {
    const response = await fetch(buildSiteUrl(`${APP_PATHS.reelsIndex}?date=${date}`), { cache: "no-store" });
    const data = response.ok ? await response.json() : { reels: [] };
    const files = Array.isArray(data.reels) ? data.reels : [];

    const metas = await Promise.all(files.map(async (file) => {
      const metaUrl = getReelMetaUrl(date, file);
      try {
        const metaResponse = await fetch(metaUrl, { cache: "no-store" });
        if (!metaResponse.ok) {
          return null;
        }

        const meta = await metaResponse.json();
        return {
          file: meta.filename || file,
          start: new Date(meta.start_time),
          end: new Date(meta.end_time)
        };
      } catch {
        return null;
      }
    }));

    return metas.filter(Boolean);
  } catch {
    return [];
  }
}

function getReelMetaUrl(date, file) {
  return buildSiteUrl(`${APP_PATHS.reelsBase}/${date}/${file}.meta.json`.replace(".mp3.meta", ".meta"));
}

function getReelFileUrl(date, file) {
  return buildSiteUrl(`${APP_PATHS.reelsBase}/${date}/${file}`);
}
