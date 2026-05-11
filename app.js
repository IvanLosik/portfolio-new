const stageFrame = document.getElementById("stageFrame");
const stageIntroGif = document.getElementById("stageIntroGif");
const stageEmpty = document.getElementById("stageEmpty");
const stageLoading = document.getElementById("stageLoading");
const carousel = document.getElementById("playableList");
const rail = document.getElementById("playableRail");
const stageScreen = document.querySelector(".stage-screen");
const PAGE_VOLUME = 0.1;
const introGifs = [
  {src: "assets/2njr.gif", duration: 1440},
  {src: "assets/5KzX.gif", duration: 10560},
  {src: "assets/5OYG.gif", duration: 2240},
  {src: "assets/5RWp.gif", duration: 1000},
];
const INTRO_NOISE_MS = 1000;
let playables = [];
let activeTransitionId = 0;
let introGifIndex = 0;
let introCycleTimer = null;
let isIntroCycleActive = false;
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

function clearIntroCycleTimer() {
  if (introCycleTimer !== null) {
    window.clearTimeout(introCycleTimer);
    introCycleTimer = null;
  }
}

function showIntroNoise() {
  if (!isIntroCycleActive) {
    return;
  }

  stageIntroGif.classList.add("is-hidden");
  stageIntroGif.removeAttribute("src");
  stageEmpty.classList.remove("is-hidden");
  introCycleTimer = window.setTimeout(showNextIntroGif, INTRO_NOISE_MS);
}

function showNextIntroGif() {
  if (!isIntroCycleActive) {
    return;
  }

  const gif = introGifs[introGifIndex];
  introGifIndex = (introGifIndex + 1) % introGifs.length;
  stageEmpty.classList.add("is-hidden");
  stageIntroGif.classList.remove("is-hidden");
  stageIntroGif.removeAttribute("src");
  stageIntroGif.src = gif.src;
  introCycleTimer = window.setTimeout(showIntroNoise, gif.duration);
}

function startIntroCycle() {
  isIntroCycleActive = true;
  clearIntroCycleTimer();
  showNextIntroGif();
}

function stopIntroCycle() {
  isIntroCycleActive = false;
  clearIntroCycleTimer();
  stageIntroGif.classList.add("is-hidden");
  stageIntroGif.removeAttribute("src");
}

function setEmptyStage() {
  activeTransitionId += 1;
  stageFrame.src = "about:blank";
  stageFrame.classList.add("is-hidden");
  stageIntroGif.classList.remove("is-hidden");
  stageEmpty.classList.add("is-hidden");
  stageLoading.classList.add("is-hidden");
  isPointerInsideStage = false;
  startIntroCycle();

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

  stopIntroCycle();
  stageFrame.src = "about:blank";
  stageFrame.classList.add("is-hidden");
  stageIntroGif.classList.add("is-hidden");
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

loadPlayables();
