import { HedgehogActor } from "./hedgehog-actor";

declare global {
  interface Window {
    __hogiumHedgehog?: HedgehogActor;
  }
}

// Prevent double-injection
if (!window.__hogiumHedgehog) {
  // Inject CSS
  const style = document.createElement("style");
  style.textContent = `
    .hogium-hedgehog {
      position: fixed;
      z-index: 2147483647;
      cursor: grab;
      pointer-events: auto;
    }
    .hogium-hedgehog:active {
      cursor: grabbing;
    }
    .hogium-hedgehog-inner {
      position: relative;
    }
    .hogium-hedgehog-sprite,
    .hogium-hedgehog-overlay {
      image-rendering: pixelated;
      image-rendering: crisp-edges;
    }
    .hogium-hedgehog-overlay {
      position: absolute;
      top: 0;
      left: 0;
    }
  `;
  document.head.appendChild(style);

  const actor = new HedgehogActor();
  window.__hogiumHedgehog = actor;
  actor.start();
}
