const SPRITE_SIZE = 80;
const X_FRAMES = 8;
const FPS = 24;
const GRAVITY = 10;
const MAX_JUMP_COUNT = 2;

interface SpriteInfo {
  img: string;
  frames: number;
  maxIteration?: number;
  forceDirection?: "left" | "right";
  randomChance?: number;
}

interface AnimationState {
  name: string;
  frame: number;
  iterations: number | null;
  spriteInfo: SpriteInfo;
  onComplete?: () => boolean | void;
}

const animations: Record<string, SpriteInfo> = {
  stop: { img: "wave", frames: 1, maxIteration: 50, randomChance: 1 },
  fall: { img: "fall", frames: 9, forceDirection: "left", randomChance: 0 },
  jump: { img: "jump", frames: 10, maxIteration: 10, randomChance: 2 },
  walk: { img: "walk", frames: 11, maxIteration: 20, randomChance: 10 },
  wave: { img: "wave", frames: 26, maxIteration: 1, randomChance: 2 },
  sign: {
    img: "sign",
    frames: 33,
    maxIteration: 1,
    forceDirection: "right",
    randomChance: 1,
  },
  flag: { img: "flag", frames: 25, maxIteration: 1, randomChance: 1 },
  inspect: { img: "inspect", frames: 36, maxIteration: 1, randomChance: 1 },
  phone: { img: "phone", frames: 28, maxIteration: 1, randomChance: 1 },
  action: { img: "action", frames: 16, maxIteration: 3, randomChance: 1 },
};

const overlayAnimations: Record<string, SpriteInfo> = {
  fire: { img: "fire", frames: 14, maxIteration: 1 },
};

function sampleOne<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function range(n: number): number[] {
  return Array.from({ length: n }, (_, i) => i);
}

export class HedgehogActor {
  private el: HTMLDivElement;
  private spriteEl: HTMLDivElement;
  private overlayEl: HTMLDivElement;
  private direction: "left" | "right" = "right";
  private x = 0;
  private y = 0;
  private yVelocity = -30;
  private xVelocity = 0;
  private jumpCount = 0;
  private gravity = GRAVITY;
  private isDragging = false;
  private mainAnimation: AnimationState | null = null;
  private overlayAnimation: AnimationState | null = null;
  private timer: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    // Create DOM
    this.el = document.createElement("div");
    this.el.className = "hogium-hedgehog";

    const inner = document.createElement("div");
    inner.className = "hogium-hedgehog-inner";
    this.el.appendChild(inner);

    this.spriteEl = document.createElement("div");
    this.spriteEl.className = "hogium-hedgehog-sprite";
    inner.appendChild(this.spriteEl);

    this.overlayEl = document.createElement("div");
    this.overlayEl.className = "hogium-hedgehog-overlay";
    this.overlayEl.style.display = "none";
    inner.appendChild(this.overlayEl);

    // Random start position
    this.x = Math.floor(Math.random() * (window.innerWidth - SPRITE_SIZE));
    this.y = Math.floor(Math.random() * (window.innerHeight / 2));

    this.setAnimation("fall");
    this.setupDrag();
    this.render();
  }

  start(): void {
    document.body.appendChild(this.el);
    this.loop();
  }

  destroy(): void {
    if (this.timer) clearTimeout(this.timer);
    this.el.remove();
  }

  private loop(): void {
    this.update();
    this.render();
    this.timer = setTimeout(() => this.loop(), 1000 / FPS);
  }

  private update(): void {
    // Physics
    this.applyVelocity();

    // Animate main sprite
    if (this.mainAnimation) {
      if (this.mainAnimation.name === "fall" && !this.isFalling()) {
        this.setAnimation("stop");
      }

      this.mainAnimation.frame++;
      if (this.mainAnimation.frame >= this.mainAnimation.spriteInfo.frames) {
        this.mainAnimation.frame = 0;
        if (this.mainAnimation.iterations !== null) {
          this.mainAnimation.iterations -= 1;
        }
        if (this.mainAnimation.iterations === 0) {
          this.mainAnimation.iterations = null;
          const prevent = this.mainAnimation.onComplete?.();
          if (!prevent) {
            this.setRandomAnimation();
          }
        }
      }
    }

    // Animate overlay
    if (this.overlayAnimation) {
      this.overlayAnimation.frame++;
      if (
        this.overlayAnimation.frame >= this.overlayAnimation.spriteInfo.frames
      ) {
        this.overlayAnimation.frame = 0;
        if (this.overlayAnimation.iterations !== null) {
          this.overlayAnimation.iterations -= 1;
        }
        if (this.overlayAnimation.iterations === 0) {
          this.overlayAnimation.iterations = null;
          this.overlayAnimation.onComplete?.();
        }
      }
    }

    if (this.isDragging) return;

    // Move horizontally
    this.x += this.xVelocity;

    // Bounce off edges
    if (this.x < 0) {
      this.x = 0;
      this.xVelocity = -this.xVelocity;
      this.direction = "right";
    }
    if (this.x > window.innerWidth - SPRITE_SIZE) {
      this.x = window.innerWidth - SPRITE_SIZE;
      this.xVelocity = -this.xVelocity;
      this.direction = "left";
    }
  }

  private applyVelocity(): void {
    if (this.isDragging) return;

    this.yVelocity -= this.gravity;

    // Decelerate on ground when not walking
    if (this.mainAnimation?.name !== "walk" && this.onGround()) {
      this.xVelocity *= 0.6;
    }

    let newY = this.y + this.yVelocity;

    // Ground collision (y=0 is the bottom of the viewport)
    if (this.yVelocity < 0 && newY <= 0) {
      newY = 0;
      this.yVelocity = -this.yVelocity * 0.4;
      this.jumpCount = 0;
    }

    this.y = newY;
  }

  private onGround(): boolean {
    return this.y <= 1;
  }

  private isFalling(): boolean {
    return !this.onGround() && Math.abs(this.yVelocity) > 1;
  }

  private jump(): void {
    if (this.jumpCount >= MAX_JUMP_COUNT) return;
    this.jumpCount++;
    this.yVelocity = this.gravity * 5;
  }

  private setAnimation(name: string, options?: Partial<AnimationState>): void {
    const spriteInfo = animations[name] ?? animations["stop"];

    this.mainAnimation = {
      name,
      frame: 0,
      iterations: spriteInfo.maxIteration ?? null,
      spriteInfo,
      onComplete: options?.onComplete,
    };

    this.mainAnimation.iterations =
      options?.iterations ??
      (spriteInfo.maxIteration
        ? Math.max(1, Math.floor(Math.random() * spriteInfo.maxIteration))
        : null);

    if (name !== "stop") {
      this.direction =
        spriteInfo.forceDirection ?? sampleOne(["left", "right"]);
    }

    if (name === "walk") {
      this.xVelocity = this.direction === "left" ? -1 : 1;
    } else if (name === "stop") {
      this.xVelocity = 0;
    }
  }

  private setRandomAnimation(): void {
    if (this.mainAnimation?.name !== "stop") {
      this.setAnimation("stop");
    } else {
      const choices = Object.keys(animations).reduce(
        (acc, key) => {
          const n = animations[key].randomChance || 0;
          acc.push(...range(n).map(() => key));
          return acc;
        },
        [] as string[],
      );

      this.setAnimation(sampleOne(choices));
    }
  }

  setOnFire(times = 3): void {
    const spriteInfo = overlayAnimations["fire"];
    this.overlayAnimation = {
      name: "fire",
      frame: 0,
      iterations: 1,
      spriteInfo,
      onComplete: () => {
        if (times <= 1) {
          this.overlayAnimation = null;
        } else {
          this.setOnFire(times - 1);
        }
      },
    };

    this.setAnimation("stop");
    this.direction = sampleOne(["left", "right"]);
    this.xVelocity = this.direction === "left" ? -5 : 5;
    this.jump();
  }

  private render(): void {
    // Position
    this.el.style.left = `${this.x}px`;
    this.el.style.bottom = `${this.y}px`;

    // Direction flip
    const inner = this.el.firstElementChild as HTMLDivElement;
    inner.style.transform = `scaleX(${this.direction === "right" ? 1 : -1})`;

    // Main sprite
    if (this.mainAnimation) {
      const { frame, spriteInfo } = this.mainAnimation;
      this.spriteEl.style.width = `${SPRITE_SIZE}px`;
      this.spriteEl.style.height = `${SPRITE_SIZE}px`;
      this.spriteEl.style.backgroundImage = `url(hogium://sprites/skins/default/${spriteInfo.img}.png)`;
      this.spriteEl.style.backgroundPosition = `-${(frame % X_FRAMES) * SPRITE_SIZE}px -${Math.floor(frame / X_FRAMES) * SPRITE_SIZE}px`;
      this.spriteEl.style.backgroundSize = `${X_FRAMES * 100}%`;
    }

    // Overlay
    if (this.overlayAnimation) {
      const { frame, spriteInfo } = this.overlayAnimation;
      this.overlayEl.style.display = "block";
      this.overlayEl.style.width = `${SPRITE_SIZE}px`;
      this.overlayEl.style.height = `${SPRITE_SIZE}px`;
      this.overlayEl.style.backgroundImage = `url(hogium://sprites/overlays/${spriteInfo.img}.png)`;
      this.overlayEl.style.backgroundPosition = `-${(frame % X_FRAMES) * SPRITE_SIZE}px -${Math.floor(frame / X_FRAMES) * SPRITE_SIZE}px`;
      this.overlayEl.style.opacity = "0.75";
    } else {
      this.overlayEl.style.display = "none";
    }
  }

  private setupDrag(): void {
    const onStart = (startX: number, startY: number): void => {
      this.isDragging = true;
      this.setAnimation("fall");

      const lastPositions: [number, number, number][] = [];

      const onMove = (clientX: number, clientY: number): void => {
        this.x = clientX - SPRITE_SIZE / 2;
        this.y = window.innerHeight - clientY - SPRITE_SIZE / 2;
        lastPositions.push([clientX, clientY, Date.now()]);
      };

      const onEnd = (): void => {
        this.isDragging = false;

        const recent = lastPositions.filter(
          ([, , t]) => t > Date.now() - 500 && t < Date.now() - 20,
        );

        if (recent.length > 1) {
          const [totalX, totalY] = recent.reduce(
            ([ax, ay], [cx, cy, ct], i) => {
              if (i === 0) return [0, 0];
              const dt = (ct - recent[i - 1][2]) / 1000;
              return [ax + (cx - recent[i - 1][0]) / dt, ay + (cy - recent[i - 1][1]) / dt];
            },
            [0, 0],
          );

          const maxV = 250;
          this.xVelocity = Math.min(maxV, totalX / recent.length / FPS);
          this.yVelocity = Math.min(
            maxV,
            (-totalY / recent.length / FPS),
          );
        }

        this.setAnimation("fall");
        window.removeEventListener("mousemove", mouseMove);
        window.removeEventListener("mouseup", mouseUp);
        window.removeEventListener("touchmove", touchMove);
        window.removeEventListener("touchend", touchEnd);
      };

      const mouseMove = (e: MouseEvent): void => onMove(e.clientX, e.clientY);
      const mouseUp = (): void => onEnd();
      const touchMove = (e: TouchEvent): void =>
        onMove(e.touches[0].clientX, e.touches[0].clientY);
      const touchEnd = (): void => onEnd();

      window.addEventListener("mousemove", mouseMove);
      window.addEventListener("mouseup", mouseUp);
      window.addEventListener("touchmove", touchMove);
      window.addEventListener("touchend", touchEnd);
    };

    this.el.addEventListener("mousedown", (e) => {
      e.preventDefault();
      onStart(e.clientX, e.clientY);
    });

    this.el.addEventListener("touchstart", (e) => {
      e.preventDefault();
      onStart(e.touches[0].clientX, e.touches[0].clientY);
    });
  }
}
