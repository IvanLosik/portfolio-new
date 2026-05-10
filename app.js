const stageFrame = document.getElementById("stageFrame");
const stageEmpty = document.getElementById("stageEmpty");
const stageLoading = document.getElementById("stageLoading");
const rail = document.getElementById("playableRail");
const stageScreen = document.querySelector(".stage-screen");
let playables = [];
window.__onekoMouse = window.__onekoMouse || {
  x: window.innerWidth / 2,
  y: window.innerHeight / 2,
};
let unbindFrameMouseTracking = null;
let isPointerInsideStage = false;
let lastStageMouseX = window.innerWidth / 2;
let lastStageMouseY = window.innerHeight / 2;
let lastIframeMouseTimestamp = 0;

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
window.addEventListener("scroll", updateStageBounds, { passive: true });

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
stageFrame.addEventListener("load", () => {
  stageLoading.classList.add("is-hidden");
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
  stageFrame.src = "about:blank";
  stageFrame.classList.add("is-hidden");
  stageEmpty.classList.remove("is-hidden");
  stageLoading.classList.add("is-hidden");
  isPointerInsideStage = false;

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

  stageLoading.classList.remove("is-hidden");
  stageFrame.src = playable.path;
  stageFrame.classList.remove("is-hidden");
  stageEmpty.classList.add("is-hidden");

  rail.querySelectorAll(".card").forEach((card) => {
    const isActive = card.dataset.path === playable.path;
    card.classList.toggle("active", isActive);
    if (isActive && scrollIntoView) {
      card.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
    }
  });
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
}

loadPlayables();
