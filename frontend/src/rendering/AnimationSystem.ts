import * as PIXI from 'pixi.js';

export interface AnimationConfig {
  duration: number;
  easing: EasingFunction;
  loop: boolean;
  yoyo: boolean;
  delay: number;
  onComplete?: () => void;
  onUpdate?: (progress: number) => void;
}

export type EasingFunction = (t: number) => number;

export interface AnimationTarget {
  object: PIXI.Container;
  property: string;
  startValue: number;
  endValue: number;
  currentValue: number;
}

export interface Animation {
  id: string;
  targets: AnimationTarget[];
  config: AnimationConfig;
  startTime: number;
  isActive: boolean;
  onComplete?: () => void;
  onUpdate?: (progress: number) => void;
}

export class AnimationSystem {
  private animations: Map<string, Animation> = new Map();
  private ticker: PIXI.Ticker;
  private animationCounter: number = 0;

  constructor() {
    this.ticker = new PIXI.Ticker();
    this.ticker.add(this.update.bind(this));
    this.ticker.start();
  }

  // Easing functions
  static readonly Easing = {
    linear: (t: number): number => t,
    easeInQuad: (t: number): number => t * t,
    easeOutQuad: (t: number): number => t * (2 - t),
    easeInOutQuad: (t: number): number => t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t,
    easeInCubic: (t: number): number => t * t * t,
    easeOutCubic: (t: number): number => (--t) * t * t + 1,
    easeInOutCubic: (t: number): number => t < 0.5 ? 4 * t * t * t : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1,
    easeInElastic: (t: number): number => {
      if (t === 0) return 0;
      if (t === 1) return 1;
      const p = 0.3;
      const s = p / 4;
      return -(Math.pow(2, 10 * (t -= 1)) * Math.sin((t - s) * (2 * Math.PI) / p));
    },
    easeOutElastic: (t: number): number => {
      if (t === 0) return 0;
      if (t === 1) return 1;
      const p = 0.3;
      const s = p / 4;
      return Math.pow(2, -10 * t) * Math.sin((t - s) * (2 * Math.PI) / p) + 1;
    },
    easeInBounce: (t: number): number => 1 - AnimationSystem.Easing.easeOutBounce(1 - t),
    easeOutBounce: (t: number): number => {
      if (t < (1 / 2.75)) {
        return 7.5625 * t * t;
      } else if (t < (2 / 2.75)) {
        return 7.5625 * (t -= (1.5 / 2.75)) * t + 0.75;
      } else if (t < (2.5 / 2.75)) {
        return 7.5625 * (t -= (2.25 / 2.75)) * t + 0.9375;
      } else {
        return 7.5625 * (t -= (2.625 / 2.75)) * t + 0.984375;
      }
    },
  };

  private update(): void {
    const currentTime = Date.now();

    for (const [id, animation] of this.animations) {
      if (!animation.isActive) continue;

      const elapsed = currentTime - animation.startTime - animation.config.delay;
      
      if (elapsed < 0) continue; // Animation hasn't started yet due to delay

      let progress = elapsed / animation.config.duration;

      if (progress >= 1) {
        if (animation.config.loop) {
          if (animation.config.yoyo) {
            // Reverse the animation
            animation.targets.forEach(target => {
              const temp = target.startValue;
              target.startValue = target.endValue;
              target.endValue = temp;
            });
          }
          animation.startTime = currentTime;
          progress = 0;
        } else {
          progress = 1;
          animation.isActive = false;
        }
      }

      // Apply easing
      const easedProgress = animation.config.easing(progress);

      // Update targets
      animation.targets.forEach(target => {
        const value = target.startValue + (target.endValue - target.startValue) * easedProgress;
        target.currentValue = value;
        (target.object as any)[target.property] = value;
      });

      // Call update callback
      if (animation.onUpdate) {
        animation.onUpdate(progress);
      }

      // Check if animation is complete
      if (!animation.isActive && animation.onComplete) {
        animation.onComplete();
        this.animations.delete(id);
      }
    }
  }

  animate(
    object: PIXI.Container,
    properties: Record<string, number>,
    config: Partial<AnimationConfig> = {}
  ): string {
    const animationId = `anim_${this.animationCounter++}`;
    
    const fullConfig: AnimationConfig = {
      duration: 1000,
      easing: AnimationSystem.Easing.easeOutQuad,
      loop: false,
      yoyo: false,
      delay: 0,
      ...config,
    };

    const targets: AnimationTarget[] = [];
    
    for (const [property, endValue] of Object.entries(properties)) {
      const startValue = (object as any)[property] || 0;
      targets.push({
        object,
        property,
        startValue,
        endValue,
        currentValue: startValue,
      });
    }

    const animation: Animation = {
      id: animationId,
      targets,
      config: fullConfig,
      startTime: Date.now(),
      isActive: true,
    };

    this.animations.set(animationId, animation);
    return animationId;
  }

  // Crop-specific animations
  animateCropGrowth(
    cropSprite: PIXI.Sprite,
    fromStage: number,
    toStage: number,
    duration: number = 2000
  ): string {
    const scaleStart = 0.3 + (fromStage * 0.2);
    const scaleEnd = 0.3 + (toStage * 0.2);
    
    return this.animate(
      cropSprite,
      {
        'scale.x': scaleEnd,
        'scale.y': scaleEnd,
        alpha: 1,
      },
      {
        duration,
        easing: AnimationSystem.Easing.easeOutElastic,
        delay: Math.random() * 500, // Stagger growth
      }
    );
  }

  animateCropHarvest(cropSprite: PIXI.Sprite, onComplete?: () => void): string {
    return this.animate(
      cropSprite,
      {
        'scale.x': 0,
        'scale.y': 0,
        alpha: 0,
        rotation: Math.PI * 2,
      },
      {
        duration: 800,
        easing: AnimationSystem.Easing.easeInCubic,
        onComplete,
      }
    );
  }

  animateCropWither(cropSprite: PIXI.Sprite): string {
    return this.animate(
      cropSprite,
      {
        'scale.x': 0.8,
        'scale.y': 0.8,
        alpha: 0.5,
        'tint': 0x8B4513, // Brown color for withered crops
      },
      {
        duration: 1500,
        easing: AnimationSystem.Easing.easeOutQuad,
      }
    );
  }

  // Character movement animations
  animateCharacterWalk(
    character: PIXI.Sprite,
    targetX: number,
    targetY: number,
    speed: number = 100
  ): string {
    const distance = Math.sqrt(
      Math.pow(targetX - character.x, 2) + Math.pow(targetY - character.y, 2)
    );
    const duration = (distance / speed) * 1000;

    // Add walking animation (simple bob)
    const walkBobId = this.animate(
      character,
      { y: character.y - 2 },
      {
        duration: 200,
        easing: AnimationSystem.Easing.easeInOutQuad,
        loop: true,
        yoyo: true,
      }
    );

    const moveId = this.animate(
      character,
      { x: targetX, y: targetY },
      {
        duration,
        easing: AnimationSystem.Easing.linear,
        onComplete: () => {
          this.stopAnimation(walkBobId);
        },
      }
    );

    return moveId;
  }

  animateCharacterTalk(character: PIXI.Sprite): string {
    return this.animate(
      character,
      { 'scale.x': 1.1, 'scale.y': 1.1 },
      {
        duration: 300,
        easing: AnimationSystem.Easing.easeInOutQuad,
        loop: true,
        yoyo: true,
      }
    );
  }

  // UI animations
  animateUIFadeIn(element: PIXI.Container, duration: number = 500): string {
    element.alpha = 0;
    return this.animate(
      element,
      { alpha: 1 },
      {
        duration,
        easing: AnimationSystem.Easing.easeOutQuad,
      }
    );
  }

  animateUIFadeOut(element: PIXI.Container, duration: number = 500): string {
    return this.animate(
      element,
      { alpha: 0 },
      {
        duration,
        easing: AnimationSystem.Easing.easeInQuad,
      }
    );
  }

  animateUISlideIn(
    element: PIXI.Container,
    direction: 'left' | 'right' | 'up' | 'down',
    distance: number = 100,
    duration: number = 500
  ): string {
    const startPos = { x: element.x, y: element.y };
    
    switch (direction) {
      case 'left':
        element.x -= distance;
        break;
      case 'right':
        element.x += distance;
        break;
      case 'up':
        element.y -= distance;
        break;
      case 'down':
        element.y += distance;
        break;
    }

    return this.animate(
      element,
      { x: startPos.x, y: startPos.y },
      {
        duration,
        easing: AnimationSystem.Easing.easeOutElastic,
      }
    );
  }

  animateUIBounce(element: PIXI.Container): string {
    return this.animate(
      element,
      { 'scale.x': 1.2, 'scale.y': 1.2 },
      {
        duration: 200,
        easing: AnimationSystem.Easing.easeOutBounce,
        yoyo: true,
      }
    );
  }

  // Weather effect animations
  animateRainEffect(container: PIXI.Container, intensity: number = 1): string {
    const rainDrops: PIXI.Graphics[] = [];
    const dropCount = Math.floor(50 * intensity);

    for (let i = 0; i < dropCount; i++) {
      const drop = new PIXI.Graphics();
      drop.rect(0, 0, 1, 8);
      drop.fill(0x87CEEB);
      drop.alpha = 0.6;
      drop.x = Math.random() * container.width;
      drop.y = -10;
      
      container.addChild(drop);
      rainDrops.push(drop);

      // Animate each drop falling
      this.animate(
        drop,
        { y: container.height + 10 },
        {
          duration: 1000 + Math.random() * 1000,
          easing: AnimationSystem.Easing.linear,
          delay: Math.random() * 2000,
          loop: true,
          onComplete: () => {
            drop.y = -10;
            drop.x = Math.random() * container.width;
          },
        }
      );
    }

    return `rain_${Date.now()}`;
  }

  // Particle effects
  createParticleEffect(
    container: PIXI.Container,
    x: number,
    y: number,
    color: number = 0xFFD700,
    count: number = 10
  ): void {
    for (let i = 0; i < count; i++) {
      const particle = new PIXI.Graphics();
      particle.circle(0, 0, 2);
      particle.fill(color);
      particle.x = x;
      particle.y = y;
      
      container.addChild(particle);

      const angle = (Math.PI * 2 * i) / count;
      const distance = 30 + Math.random() * 20;
      const targetX = x + Math.cos(angle) * distance;
      const targetY = y + Math.sin(angle) * distance;

      this.animate(
        particle,
        {
          x: targetX,
          y: targetY,
          alpha: 0,
          'scale.x': 0,
          'scale.y': 0,
        },
        {
          duration: 800 + Math.random() * 400,
          easing: AnimationSystem.Easing.easeOutQuad,
          onComplete: () => {
            container.removeChild(particle);
          },
        }
      );
    }
  }

  stopAnimation(animationId: string): void {
    const animation = this.animations.get(animationId);
    if (animation) {
      animation.isActive = false;
      this.animations.delete(animationId);
    }
  }

  stopAllAnimations(): void {
    for (const animation of this.animations.values()) {
      animation.isActive = false;
    }
    this.animations.clear();
  }

  pauseAnimation(animationId: string): void {
    const animation = this.animations.get(animationId);
    if (animation) {
      animation.isActive = false;
    }
  }

  resumeAnimation(animationId: string): void {
    const animation = this.animations.get(animationId);
    if (animation) {
      animation.isActive = true;
      animation.startTime = Date.now(); // Reset start time
    }
  }

  getActiveAnimationCount(): number {
    return Array.from(this.animations.values()).filter(anim => anim.isActive).length;
  }

  destroy(): void {
    this.stopAllAnimations();
    this.ticker.stop();
    this.ticker.destroy();
  }
}