// runaway oneko variant

(function runawayOneko() {
  const isReducedMotion =
    window.matchMedia(`(prefers-reduced-motion: reduce)`) === true ||
    window.matchMedia(`(prefers-reduced-motion: reduce)`).matches === true;

  if (isReducedMotion) return;

  const nekoEl = document.createElement("div");

  let nekoPosX = Math.max(window.innerWidth - 96, 32);
  let nekoPosY = Math.max(window.innerHeight - 96, 32);
  let mousePosX = window.innerWidth / 2;
  let mousePosY = window.innerHeight / 2;

  let frameCount = 0;
  let idleTime = 0;
  let idleAnimation = null;
  let idleAnimationFrame = 0;
  let wanderTargetX = null;
  let wanderTargetY = null;

  const nekoSpeed = 10;
  const interactionRadius = 220;
  const fleeStep = 140;
  const spriteSize = 32;
  const renderScale = 1.5;
  const renderHalf = (spriteSize * renderScale) / 2;

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
    const scripts = document.querySelectorAll('script[src*="oneko-runaway.js"]');
    const curScript = scripts[scripts.length - 1];
    if (curScript && curScript.dataset.cat) {
      nekoFile = curScript.dataset.cat;
    }

    nekoEl.id = "oneko-runaway";
    nekoEl.ariaHidden = true;
    nekoEl.style.width = `${spriteSize}px`;
    nekoEl.style.height = `${spriteSize}px`;
    nekoEl.style.position = "fixed";
    nekoEl.style.pointerEvents = "none";
    nekoEl.style.imageRendering = "pixelated";
    nekoEl.style.transform = `scale(${renderScale})`;
    nekoEl.style.transformOrigin = "top left";
    nekoEl.style.left = `${nekoPosX - renderHalf}px`;
    nekoEl.style.top = `${nekoPosY - renderHalf}px`;
    nekoEl.style.zIndex = 2147483646;
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

  function setRunAlongStageTarget(edge) {
    const bounds = window.__onekoStageBounds;
    if (!bounds) {
      chooseWanderTarget();
      return;
    }

    if (edge === "left" || edge === "right") {
      wanderTargetX = edge === "left" ? bounds.left - 24 : bounds.right + 24;
      const directionY = Math.sign(nekoPosY - mousePosY) || (Math.random() > 0.5 ? 1 : -1);
      wanderTargetY = nekoPosY + directionY * fleeStep;
      wanderTargetY = Math.min(Math.max(renderHalf, wanderTargetY), window.innerHeight - renderHalf);
      return;
    }

    wanderTargetY = edge === "top" ? bounds.top - 24 : bounds.bottom + 24;
    const directionX = Math.sign(nekoPosX - mousePosX) || (Math.random() > 0.5 ? 1 : -1);
    wanderTargetX = nekoPosX + directionX * fleeStep;
    wanderTargetX = Math.min(Math.max(renderHalf, wanderTargetX), window.innerWidth - renderHalf);
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

  function chooseFleeTarget(distance, diffX, diffY) {
    const normalizedX = distance > 0 ? diffX / distance : 0;
    const normalizedY = distance > 0 ? diffY / distance : 0;
    wanderTargetX = nekoPosX - normalizedX * fleeStep;
    wanderTargetY = nekoPosY - normalizedY * fleeStep;
    wanderTargetX = Math.min(Math.max(renderHalf, wanderTargetX), window.innerWidth - renderHalf);
    wanderTargetY = Math.min(Math.max(renderHalf, wanderTargetY), window.innerHeight - renderHalf);
    if (isInsideStage(wanderTargetX, wanderTargetY)) {
      const bounds = window.__onekoStageBounds;
      if (bounds) {
        const nearestEdge =
          Math.abs(nekoPosX - bounds.left) < Math.abs(nekoPosX - bounds.right)
            ? "left"
            : "right";
        setRunAlongStageTarget(nearestEdge);
      }
    }
  }

  function frame() {
    if (window.__onekoMouse) {
      mousePosX = window.__onekoMouse.x;
      mousePosY = window.__onekoMouse.y;
    }

    frameCount += 1;
    const diffX = mousePosX - nekoPosX;
    const diffY = mousePosY - nekoPosY;
    const cursorDistance = Math.sqrt(diffX ** 2 + diffY ** 2);
    const cursorNearby = cursorDistance <= interactionRadius;

    if (cursorNearby) {
      resetIdleAnimation();
      chooseFleeTarget(cursorDistance, diffX, diffY);

      if (idleTime > 1) {
        setSprite("alert", 0);
        idleTime = Math.min(idleTime, 5);
        idleTime -= 1;
        return;
      }

      idleTime = 0;
      const fleeStepResult = moveToward(wanderTargetX, wanderTargetY);
      if (fleeStepResult.blockedEdge) {
        setRunAlongStageTarget(fleeStepResult.blockedEdge);
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
      setRunAlongStageTarget(wanderStep.blockedEdge);
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
