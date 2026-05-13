const stageFrame = document.getElementById("stageFrame");
const stageEmpty = document.getElementById("stageEmpty");
const stageGif = document.getElementById("stageGif");
const stageLoading = document.getElementById("stageLoading");
const carousel = document.getElementById("playableList");
const rail = document.getElementById("playableRail");
const stageScreen = document.querySelector(".stage-screen");
const PAGE_VOLUME = 0.1;
const START_GIFS = [
  "assets/start-gifs/2njr.gif",
  "assets/start-gifs/5KzX.gif",
  "assets/start-gifs/5OYG.gif",
  "assets/start-gifs/5RWp.gif",
  "assets/start-gifs/leopold-coward.gif",
  "assets/start-gifs/lets-live-friendly-friends.gif",
  "assets/start-gifs/nu-pogodi-just-you-wait (1).gif",
  "assets/start-gifs/nu-pogodi-just-you-wait (2).gif",
  "assets/start-gifs/nu-pogodi-just-you-wait.gif",
  "assets/start-gifs/nu-pogodi-water.gif",
  "assets/start-gifs/nu-pogodi-well-just-you-wait.gif",
  "assets/start-gifs/smoke-dog.gif",
  "assets/start-gifs/tanec-tango.gif",
  "assets/start-gifs/tenor.gif",
  "assets/start-gifs/vinni-pukh-pyatachok (1).gif",
  "assets/start-gifs/vinni-pukh-pyatachok.gif",
  "assets/start-gifs/vinni-pukh-winnie-the-pooh (1).gif",
  "assets/start-gifs/vinni-pukh-winnie-the-pooh (2).gif",
  "assets/start-gifs/vinni-pukh-winnie-the-pooh.gif",
  "assets/start-gifs/winnie-the-pooh-vinni-pukh.gif",
  "assets/start-gifs/wolf-guitar.gif",
  "assets/start-gifs/давайтежитьдружно.gif",
  "assets/start-gifs/ну-погоди.gif",
  "assets/start-gifs/нупогоди-танец.gif",
];
const START_NOISE_DURATION = 1000;
const FALLBACK_GIF_DURATION = 3000;
const MAX_START_GIF_DURATION = 4500;
const MAX_START_GIF_FRAME_DELAY = 500;
let playables = [];
let activeTransitionId = 0;
let startGifIndex = 0;
let startGifTimer = null;
let startNoiseTimer = null;
let isStartLoopRunning = false;
const gifDurationCache = new Map();
window.__onekoMouse = window.__onekoMouse || {
  x: window.innerWidth / 2,
  y: window.innerHeight / 2,
};
let unbindFrameMouseTracking = null;
let isPointerInsideStage = false;
let lastStageMouseX = window.innerWidth / 2;
let lastStageMouseY = window.innerHeight / 2;
let lastIframeMouseTimestamp = 0;

window.PAGE_VOLUME = PAGE_VOLUME;

function getGifDuration(path) {
  if (gifDurationCache.has(path)) {
    return gifDurationCache.get(path);
  }

  const durationPromise = fetch(path)
    .then((response) => {
      if (!response.ok) {
        throw new Error(`Unable to load ${path}`);
      }
      return response.arrayBuffer();
    })
    .then((buffer) => {
      const bytes = new Uint8Array(buffer);
      let duration = 0;

      for (let i = 0; i < bytes.length - 5; i += 1) {
        if (bytes[i] === 0x21 && bytes[i + 1] === 0xf9 && bytes[i + 2] === 0x04) {
          const frameDelay = bytes[i + 4] | (bytes[i + 5] << 8);
          duration += Math.min(Math.max(frameDelay * 10, 20), MAX_START_GIF_FRAME_DELAY);
        }
      }

      return Math.min(duration || FALLBACK_GIF_DURATION, MAX_START_GIF_DURATION);
    })
    .catch(() => FALLBACK_GIF_DURATION);

  gifDurationCache.set(path, durationPromise);
  return durationPromise;
}

function clearStartLoopTimers() {
  window.clearTimeout(startGifTimer);
  window.clearTimeout(startNoiseTimer);
  startGifTimer = null;
  startNoiseTimer = null;
}

function stopStartLoop() {
  isStartLoopRunning = false;
  clearStartLoopTimers();
  stageEmpty.classList.remove("is-showing-gif");
  stageGif.removeAttribute("src");
}

async function showNextStartGif() {
  if (!isStartLoopRunning || START_GIFS.length === 0) {
    return;
  }

  const path = START_GIFS[startGifIndex];
  startGifIndex = (startGifIndex + 1) % START_GIFS.length;
  const duration = await getGifDuration(path);

  if (!isStartLoopRunning || stageEmpty.classList.contains("is-hidden")) {
    return;
  }

  stageGif.src = `${path}?restart=${Date.now()}`;
  stageEmpty.classList.add("is-showing-gif");

  startGifTimer = window.setTimeout(() => {
    if (!isStartLoopRunning) {
      return;
    }

    stageEmpty.classList.remove("is-showing-gif");
    stageGif.removeAttribute("src");
    startNoiseTimer = window.setTimeout(showNextStartGif, START_NOISE_DURATION);
  }, duration);
}

function startStartLoop() {
  if (isStartLoopRunning || START_GIFS.length === 0) {
    return;
  }

  isStartLoopRunning = true;
  clearStartLoopTimers();
  showNextStartGif();
}

function loadDesktopRunawayCat() {
  if (!window.matchMedia("(min-width: 721px)").matches) {
    return;
  }

  const script = document.createElement("script");
  script.src = "assets/oneko-runaway.js";
  script.dataset.cat = "assets/oneko.gif";
  document.body.appendChild(script);
}

function getPageVolume() {
  const volume = Number(window.PAGE_VOLUME);
  return Number.isFinite(volume) ? Math.min(Math.max(volume, 0), 1) : 1;
}

function applyVolumeToDocument(targetWindow, targetDocument) {
  const volume = getPageVolume();

  targetDocument.querySelectorAll("audio, video").forEach((media) => {
    media.volume = volume;
    media.muted = volume === 0;
  });

  if (targetWindow.cc && targetWindow.cc.audioEngine) {
    targetWindow.cc.audioEngine.setEffectsVolume(volume);
    targetWindow.cc.audioEngine.setMusicVolume(volume);
  }
}

function applyPageVolume() {
  applyVolumeToDocument(window, document);

  try {
    if (stageFrame.contentWindow && stageFrame.contentDocument) {
      applyVolumeToDocument(stageFrame.contentWindow, stageFrame.contentDocument);
    }
  } catch (error) {
    // Some embedded playables may block parent access.
  }
}

function updateStageBounds() {
  const rect = stageScreen.getBoundingClientRect();
  window.__onekoStageBounds = {
    left: rect.left,
    top: rect.top,
    right: rect.right,
    bottom: rect.bottom,
  };
}

function updateGlobalMouse(x, y) {
  window.__onekoMouse.x = x;
  window.__onekoMouse.y = y;
}

document.addEventListener("mousemove", (event) => {
  updateGlobalMouse(event.clientX, event.clientY);
});

window.addEventListener("resize", updateStageBounds);
window.addEventListener("scroll", updateStageBounds, {passive: true});

function updatePlayableScrollHints() {
  const horizontalOverflow = rail.scrollWidth > rail.clientWidth + 1;
  const target = rail;
  const position = horizontalOverflow ? target.scrollLeft : target.scrollTop;
  const maxPosition = horizontalOverflow
    ? target.scrollWidth - target.clientWidth
    : target.scrollHeight - target.clientHeight;

  carousel.classList.toggle("can-scroll-back", position > 1);
  carousel.classList.toggle("can-scroll-forward", maxPosition - position > 1);
}

carousel.addEventListener("scroll", updatePlayableScrollHints, {passive: true});
rail.addEventListener("scroll", updatePlayableScrollHints, {passive: true});
window.addEventListener("resize", updatePlayableScrollHints);

function updateStageFallbackMouse(x, y) {
  lastStageMouseX = x;
  lastStageMouseY = y;
  updateGlobalMouse(x, y);
}

function bindFrameMouseTracking() {
  if (typeof unbindFrameMouseTracking === "function") {
    unbindFrameMouseTracking();
    unbindFrameMouseTracking = null;
  }

  try {
    const frameWindow = stageFrame.contentWindow;
    const frameDocument = stageFrame.contentDocument;
    if (!frameWindow || !frameDocument) {
      return;
    }

    const syncMouse = (event) => {
      const rect = stageFrame.getBoundingClientRect();
      lastIframeMouseTimestamp = Date.now();
      updateStageFallbackMouse(rect.left + event.clientX, rect.top + event.clientY);
    };

    const trackedTargets = new Set();
    const bindTarget = (target) => {
      if (!target || trackedTargets.has(target)) {
        return;
      }
      trackedTargets.add(target);
      target.addEventListener("pointermove", syncMouse, true);
      target.addEventListener("mousemove", syncMouse, true);
    };

    const eventTypes = ["pointermove", "mousemove"];
    eventTypes.forEach((eventType) => {
      frameWindow.addEventListener(eventType, syncMouse, true);
      frameDocument.addEventListener(eventType, syncMouse, true);
    });

    bindTarget(frameDocument.body);
    frameDocument.querySelectorAll("canvas").forEach(bindTarget);

    const observer = new frameWindow.MutationObserver(() => {
      bindTarget(frameDocument.body);
      frameDocument.querySelectorAll("canvas").forEach(bindTarget);
    });

    if (frameDocument.documentElement) {
      observer.observe(frameDocument.documentElement, {
        childList: true,
        subtree: true,
      });
    }

    unbindFrameMouseTracking = () => {
      observer.disconnect();
      trackedTargets.forEach((target) => {
        target.removeEventListener("pointermove", syncMouse, true);
        target.removeEventListener("mousemove", syncMouse, true);
      });
      eventTypes.forEach((eventType) => {
        frameWindow.removeEventListener(eventType, syncMouse, true);
        frameDocument.removeEventListener(eventType, syncMouse, true);
      });
    };
  } catch (error) {
    // Ignore cross-document access issues for playables that block parent access.
  }
}

stageFrame.addEventListener("load", bindFrameMouseTracking);
stageFrame.addEventListener("load", applyPageVolume);
stageFrame.addEventListener("load", () => {
  if (!stageFrame.classList.contains("is-hidden")) {
    stageLoading.classList.add("is-hidden");
  }
});
updateStageBounds();

stageScreen.addEventListener("pointermove", (event) => {
  updateStageFallbackMouse(event.clientX, event.clientY);
});

stageScreen.addEventListener("pointerenter", () => {
  isPointerInsideStage = true;
  const rect = stageScreen.getBoundingClientRect();
  updateStageFallbackMouse(rect.left + rect.width / 2, rect.top + rect.height / 2);
});

stageScreen.addEventListener("pointerleave", () => {
  isPointerInsideStage = false;
});

stageFrame.addEventListener("mouseenter", () => {
  isPointerInsideStage = true;
  const rect = stageFrame.getBoundingClientRect();
  updateStageFallbackMouse(rect.left + rect.width / 2, rect.top + rect.height / 2);
});

stageFrame.addEventListener("mouseleave", () => {
  isPointerInsideStage = false;
});

window.setInterval(() => {
  if (!isPointerInsideStage || stageFrame.classList.contains("is-hidden")) {
    return;
  }

  const now = Date.now();
  if (now - lastIframeMouseTimestamp < 180) {
    return;
  }

  updateGlobalMouse(lastStageMouseX, lastStageMouseY);
}, 120);

function setEmptyStage() {
  activeTransitionId += 1;
  stageFrame.src = "about:blank";
  stageFrame.classList.add("is-hidden");
  stageEmpty.classList.remove("is-hidden");
  stageLoading.classList.add("is-hidden");
  isPointerInsideStage = false;
  startStartLoop();

  rail.querySelectorAll(".card").forEach((card) => {
    card.classList.remove("active");
  });
}

function setActivePlayable(path, scrollIntoView = false) {
  const playable = playables.find((item) => item.path === path);
  if (!playable) {
    setEmptyStage();
    return;
  }

  const transitionId = activeTransitionId + 1;
  activeTransitionId = transitionId;

  stageFrame.src = "about:blank";
  stageFrame.classList.add("is-hidden");
  stopStartLoop();
  stageEmpty.classList.add("is-hidden");
  stageLoading.classList.remove("is-hidden");

  rail.querySelectorAll(".card").forEach((card) => {
    const isActive = card.dataset.path === playable.path;
    card.classList.toggle("active", isActive);
    if (isActive && scrollIntoView) {
      card.scrollIntoView({behavior: "smooth", inline: "center", block: "nearest"});
      window.setTimeout(updatePlayableScrollHints, 220);
    }
  });

  window.setTimeout(() => {
    if (transitionId !== activeTransitionId) {
      return;
    }

    stageFrame.src = playable.path;
    stageFrame.classList.remove("is-hidden");
  }, 1000);
}

function renderCards() {
  rail.innerHTML = "";

  playables.forEach((playable) => {
    const card = document.createElement("button");
    card.type = "button";
    card.className = "card";
    card.dataset.path = playable.path;

    card.innerHTML = `
      <div class="thumb">
        <img src="${playable.image}" alt="">
      </div>
    `;

    card.addEventListener("click", () => setActivePlayable(playable.path, true));
    rail.appendChild(card);
  });
}

function loadPlayables() {
  const config = Array.isArray(window.PLAYABLES) ? window.PLAYABLES : [];
  playables = config;
  renderCards();
  setEmptyStage();
  updatePlayableScrollHints();
}

loadDesktopRunawayCat();
loadPlayables();
