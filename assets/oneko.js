// oneko.js: customized local variant

(function oneko() {
  const isReducedMotion =
    window.matchMedia(`(prefers-reduced-motion: reduce)`) === true ||
    window.matchMedia(`(prefers-reduced-motion: reduce)`).matches === true;

  if (isReducedMotion) return;

  const nekoEl = document.createElement("div");
  let persistPosition = true;

  let nekoPosX = 32;
  let nekoPosY = 32;
  let mousePosX = window.innerWidth / 2;
  let mousePosY = window.innerHeight / 2;

  let frameCount = 0;
  let idleTime = 0;
  let idleAnimation = null;
  let idleAnimationFrame = 0;
  let wanderTargetX = null;
  let wanderTargetY = null;
  let chaseCooldown = 0;

  const nekoSpeed = 8;
  const interactionRadius = 180;
  const spriteSize = 32;
  const renderScale = 1.5;
  const renderHalf = (spriteSize * renderScale) / 2;
  const catchRadius = 22;

  const spriteSets = {
    idle: [[-3, -3]],
    alert: [[-7, -3]],
    scratchSelf: [
      [-5, 0],
      [-6, 0],
      [-7, 0],
    ],
    scratchWallN: [
      [0, 0],
      [0, -1],
    ],
    scratchWallS: [
      [-7, -1],
      [-6, -2],
    ],
    scratchWallE: [
      [-2, -2],
      [-2, -3],
    ],
    scratchWallW: [
      [-4, 0],
      [-4, -1],
    ],
    tired: [[-3, -2]],
    sleeping: [
      [-2, 0],
      [-2, -1],
    ],
    N: [
      [-1, -2],
      [-1, -3],
    ],
    NE: [
      [0, -2],
      [0, -3],
    ],
    E: [
      [-3, 0],
      [-3, -1],
    ],
    SE: [
      [-5, -1],
      [-5, -2],
    ],
    S: [
      [-6, -3],
      [-7, -2],
    ],
    SW: [
      [-5, -3],
      [-6, -1],
    ],
    W: [
      [-4, -2],
      [-4, -3],
    ],
    NW: [
      [-1, 0],
      [-1, -1],
    ],
  };

  function init() {
    let nekoFile = "./oneko.gif";
    const curScript = document.currentScript;
    if (curScript && curScript.dataset.cat) {
      nekoFile = curScript.dataset.cat;
    }
    if (curScript && curScript.dataset.persistPosition) {
      if (curScript.dataset.persistPosition === "") {
        persistPosition = true;
      } else {
        persistPosition = JSON.parse(curScript.dataset.persistPosition.toLowerCase());
      }
    }

    if (persistPosition) {
      const storedNeko = JSON.parse(window.localStorage.getItem("oneko"));
      if (storedNeko !== null) {
        nekoPosX = storedNeko.nekoPosX;
        nekoPosY = storedNeko.nekoPosY;
        mousePosX = storedNeko.mousePosX;
        mousePosY = storedNeko.mousePosY;
        frameCount = storedNeko.frameCount;
        idleTime = storedNeko.idleTime;
        idleAnimation = storedNeko.idleAnimation;
        idleAnimationFrame = storedNeko.idleAnimationFrame;
        wanderTargetX = storedNeko.wanderTargetX;
        wanderTargetY = storedNeko.wanderTargetY;
        nekoEl.style.backgroundPosition = storedNeko.bgPos;
      }
    }

    nekoEl.id = "oneko";
    nekoEl.ariaHidden = true;
    nekoEl.style.width = `${spriteSize}px`;
    nekoEl.style.height = `${spriteSize}px`;
    nekoEl.style.position = "fixed";
    nekoEl.style.pointerEvents = "none";
    nekoEl.style.imageRendering = "pixelated";
    nekoEl.style.transform = `scale(${renderScale})`;
    nekoEl.style.transformOrigin = "top left";
    nekoEl.style.filter = "invert(1)";
    nekoEl.style.left = `${nekoPosX - renderHalf}px`;
    nekoEl.style.top = `${nekoPosY - renderHalf}px`;
    nekoEl.style.zIndex = 2147483647;
    nekoEl.style.backgroundImage = `url(${nekoFile})`;

    document.body.appendChild(nekoEl);

    document.addEventListener("mousemove", function (event) {
      mousePosX = event.clientX;
      mousePosY = event.clientY;
      if (window.__onekoMouse) {
        window.__onekoMouse.x = mousePosX;
        window.__onekoMouse.y = mousePosY;
      }
    });

    if (persistPosition) {
      window.addEventListener("beforeunload", function () {
        window.localStorage.setItem("oneko", JSON.stringify({
          nekoPosX: nekoPosX,
          nekoPosY: nekoPosY,
          mousePosX: mousePosX,
          mousePosY: mousePosY,
          frameCount: frameCount,
          idleTime: idleTime,
          idleAnimation: idleAnimation,
          idleAnimationFrame: idleAnimationFrame,
          wanderTargetX: wanderTargetX,
          wanderTargetY: wanderTargetY,
          bgPos: nekoEl.style.backgroundPosition
        }));
      });
    }

    window.requestAnimationFrame(onAnimationFrame);
  }

  let lastFrameTimestamp;

  function onAnimationFrame(timestamp) {
    if (!nekoEl.isConnected) {
      return;
    }
    if (!lastFrameTimestamp) {
      lastFrameTimestamp = timestamp;
    }
    if (timestamp - lastFrameTimestamp > 100) {
      lastFrameTimestamp = timestamp;
      frame();
    }
    window.requestAnimationFrame(onAnimationFrame);
  }

  function setSprite(name, frame) {
    const spriteName = spriteSets[name] ? name : "idle";
    const sprite = spriteSets[spriteName][frame % spriteSets[spriteName].length];
    nekoEl.style.backgroundPosition = `${sprite[0] * 32}px ${sprite[1] * 32}px`;
  }

  function resetIdleAnimation() {
    idleAnimation = null;
    idleAnimationFrame = 0;
  }

  function chooseIdleAnimation() {
    const availableIdleAnimations = ["sleeping", "scratchSelf"];
    if (nekoPosX < 32) {
      availableIdleAnimations.push("scratchWallW");
    }
    if (nekoPosY < 32) {
      availableIdleAnimations.push("scratchWallN");
    }
    if (nekoPosX > window.innerWidth - 32) {
      availableIdleAnimations.push("scratchWallE");
    }
    if (nekoPosY > window.innerHeight - 32) {
      availableIdleAnimations.push("scratchWallS");
    }
    idleAnimation =
      availableIdleAnimations[
        Math.floor(Math.random() * availableIdleAnimations.length)
      ];
  }

  function playIdle() {
    idleTime += 1;

    if (
      idleTime > 8 &&
      Math.floor(Math.random() * 90) === 0 &&
      idleAnimation == null
    ) {
      chooseIdleAnimation();
    }

    switch (idleAnimation) {
      case "sleeping":
        if (idleAnimationFrame < 8) {
          setSprite("tired", 0);
          break;
        }
        setSprite("sleeping", Math.floor(idleAnimationFrame / 4));
        if (idleAnimationFrame > 96) {
          resetIdleAnimation();
        }
        break;
      case "scratchWallN":
      case "scratchWallS":
      case "scratchWallE":
      case "scratchWallW":
      case "scratchSelf":
        setSprite(idleAnimation, idleAnimationFrame);
        if (idleAnimationFrame > 9) {
          resetIdleAnimation();
        }
        break;
      default:
        setSprite("idle", 0);
        return;
    }

    idleAnimationFrame += 1;
  }

  function chooseWanderTarget() {
    let attempts = 0;
    do {
      wanderTargetX = 32 + Math.random() * Math.max(32, window.innerWidth - 64);
      wanderTargetY = 32 + Math.random() * Math.max(32, window.innerHeight - 64);
      attempts += 1;
    } while (isInsideStage(wanderTargetX, wanderTargetY) && attempts < 40);
    constrainAwayFromStage();
  }

  function isInsideStage(x, y) {
    const bounds = window.__onekoStageBounds;
    if (!bounds) {
      return false;
    }
    return x > bounds.left && x < bounds.right && y > bounds.top && y < bounds.bottom;
  }

  function constrainAwayFromStage() {
    const bounds = window.__onekoStageBounds;
    if (!bounds || !isInsideStage(nekoPosX, nekoPosY)) {
      return null;
    }

    const distances = [
      { edge: "left", value: Math.abs(nekoPosX - bounds.left) },
      { edge: "right", value: Math.abs(bounds.right - nekoPosX) },
      { edge: "top", value: Math.abs(nekoPosY - bounds.top) },
      { edge: "bottom", value: Math.abs(bounds.bottom - nekoPosY) },
    ].sort((a, b) => a.value - b.value);

    switch (distances[0].edge) {
      case "left":
        nekoPosX = bounds.left - 18;
        return "left";
      case "right":
        nekoPosX = bounds.right + 18;
        return "right";
      case "top":
        nekoPosY = bounds.top - 18;
        return "top";
      default:
        nekoPosY = bounds.bottom + 18;
        return "bottom";
    }
  }

  function moveToward(targetX, targetY) {
    const diffX = nekoPosX - targetX;
    const diffY = nekoPosY - targetY;
    const distance = Math.sqrt(diffX ** 2 + diffY ** 2);

    if (distance < nekoSpeed || distance < 16) {
      nekoPosX = targetX;
      nekoPosY = targetY;
      nekoEl.style.left = `${nekoPosX - renderHalf}px`;
      nekoEl.style.top = `${nekoPosY - renderHalf}px`;
      return { arrived: true, blockedEdge: null };
    }

    let direction = diffY / distance > 0.5 ? "N" : "";
    direction += diffY / distance < -0.5 ? "S" : "";
    direction += diffX / distance > 0.5 ? "W" : "";
    direction += diffX / distance < -0.5 ? "E" : "";
    setSprite(direction, frameCount);

    nekoPosX -= (diffX / distance) * nekoSpeed;
    nekoPosY -= (diffY / distance) * nekoSpeed;

    nekoPosX = Math.min(Math.max(renderHalf, nekoPosX), window.innerWidth - renderHalf);
    nekoPosY = Math.min(Math.max(renderHalf, nekoPosY), window.innerHeight - renderHalf);
    const blockedEdge = constrainAwayFromStage();

    nekoEl.style.left = `${nekoPosX - renderHalf}px`;
    nekoEl.style.top = `${nekoPosY - renderHalf}px`;
    return { arrived: false, blockedEdge: blockedEdge };
  }

  function frame() {
    if (window.__onekoMouse) {
      mousePosX = window.__onekoMouse.x;
      mousePosY = window.__onekoMouse.y;
    }

    if (chaseCooldown > 0) {
      chaseCooldown -= 1;
    }

    frameCount += 1;
    const cursorDiffX = nekoPosX - mousePosX;
    const cursorDiffY = nekoPosY - mousePosY;
    const cursorDistance = Math.sqrt(cursorDiffX ** 2 + cursorDiffY ** 2);
    const cursorNearby = cursorDistance <= interactionRadius && chaseCooldown === 0;

    if (cursorNearby) {
      resetIdleAnimation();
      wanderTargetX = null;
      wanderTargetY = null;

      if (cursorDistance <= catchRadius) {
        idleTime = 0;
        setSprite("idle", 0);
        return;
      }

      if (idleTime > 1) {
        setSprite("alert", 0);
        idleTime = Math.min(idleTime, 5);
        idleTime -= 1;
        return;
      }

      idleTime = 0;
      const chaseStep = moveToward(mousePosX, mousePosY);
      if (chaseStep.blockedEdge) {
        chaseCooldown = 18;
        wanderTargetX = null;
        wanderTargetY = null;
      }
      return;
    }

    if (idleAnimation) {
      playIdle();
      return;
    }

    if (wanderTargetX == null || wanderTargetY == null) {
      if (Math.floor(Math.random() * 3) === 0) {
        chooseIdleAnimation();
        playIdle();
        return;
      }
      chooseWanderTarget();
    }

    const wanderStep = moveToward(wanderTargetX, wanderTargetY);
    if (wanderStep.blockedEdge) {
      wanderTargetX = null;
      wanderTargetY = null;
      chooseWanderTarget();
      return;
    }

    if (wanderStep.arrived) {
      wanderTargetX = null;
      wanderTargetY = null;
      if (Math.floor(Math.random() * 2) === 0) {
        chooseIdleAnimation();
      } else {
        idleTime += 1;
        setSprite("idle", 0);
      }
    }
  }

  init();
})();
