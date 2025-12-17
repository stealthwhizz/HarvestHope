import * as PIXI from 'pixi.js';

export interface PoolableObject {
  reset(): void;
  destroy(): void;
}

export class ObjectPool<T extends PoolableObject> {
  private pool: T[] = [];
  private createFn: () => T;
  private resetFn?: (obj: T) => void;
  private maxSize: number;
  private activeObjects: Set<T> = new Set();

  constructor(
    createFn: () => T,
    initialSize: number = 10,
    maxSize: number = 100,
    resetFn?: (obj: T) => void
  ) {
    this.createFn = createFn;
    this.resetFn = resetFn;
    this.maxSize = maxSize;

    // Pre-populate pool
    for (let i = 0; i < initialSize; i++) {
      this.pool.push(this.createFn());
    }
  }

  acquire(): T {
    let obj: T;

    if (this.pool.length > 0) {
      obj = this.pool.pop()!;
    } else {
      obj = this.createFn();
    }

    this.activeObjects.add(obj);
    return obj;
  }

  release(obj: T): void {
    if (!this.activeObjects.has(obj)) {
      return; // Object not from this pool
    }

    this.activeObjects.delete(obj);

    // Reset object state
    if (this.resetFn) {
      this.resetFn(obj);
    } else {
      obj.reset();
    }

    // Return to pool if under max size
    if (this.pool.length < this.maxSize) {
      this.pool.push(obj);
    } else {
      obj.destroy();
    }
  }

  clear(): void {
    // Destroy all pooled objects
    this.pool.forEach(obj => obj.destroy());
    this.pool.length = 0;

    // Destroy all active objects
    this.activeObjects.forEach(obj => obj.destroy());
    this.activeObjects.clear();
  }

  getStats(): {
    pooled: number;
    active: number;
    total: number;
  } {
    return {
      pooled: this.pool.length,
      active: this.activeObjects.size,
      total: this.pool.length + this.activeObjects.size,
    };
  }
}

// Specialized sprite pool
export class SpritePool extends ObjectPool<PIXI.Sprite> {
  constructor(texture: PIXI.Texture, initialSize: number = 20, maxSize: number = 200) {
    super(
      () => new PIXI.Sprite(texture),
      initialSize,
      maxSize,
      (sprite) => {
        // Reset sprite properties
        sprite.x = 0;
        sprite.y = 0;
        sprite.scale.set(1);
        sprite.rotation = 0;
        sprite.alpha = 1;
        sprite.visible = true;
        sprite.tint = 0xFFFFFF;
        sprite.anchor.set(0);
        
        // Remove from parent if attached
        if (sprite.parent) {
          sprite.parent.removeChild(sprite);
        }
      }
    );
  }
}

// Graphics object pool for dynamic shapes
export class GraphicsPool extends ObjectPool<PIXI.Graphics> {
  constructor(initialSize: number = 10, maxSize: number = 50) {
    super(
      () => new PIXI.Graphics(),
      initialSize,
      maxSize,
      (graphics) => {
        graphics.clear();
        graphics.x = 0;
        graphics.y = 0;
        graphics.scale.set(1);
        graphics.rotation = 0;
        graphics.alpha = 1;
        graphics.visible = true;
        
        if (graphics.parent) {
          graphics.parent.removeChild(graphics);
        }
      }
    );
  }
}

// Container pool for grouping objects
export class ContainerPool extends ObjectPool<PIXI.Container> {
  constructor(initialSize: number = 5, maxSize: number = 25) {
    super(
      () => new PIXI.Container(),
      initialSize,
      maxSize,
      (container) => {
        container.removeChildren();
        container.x = 0;
        container.y = 0;
        container.scale.set(1);
        container.rotation = 0;
        container.alpha = 1;
        container.visible = true;
        
        if (container.parent) {
          container.parent.removeChild(container);
        }
      }
    );
  }
}

// Pool manager to handle multiple pools
export class PoolManager {
  private static instance: PoolManager;
  private pools: Map<string, ObjectPool<any>> = new Map();

  static getInstance(): PoolManager {
    if (!PoolManager.instance) {
      PoolManager.instance = new PoolManager();
    }
    return PoolManager.instance;
  }

  registerPool<T extends PoolableObject>(name: string, pool: ObjectPool<T>): void {
    this.pools.set(name, pool);
  }

  getPool<T extends PoolableObject>(name: string): ObjectPool<T> | null {
    return this.pools.get(name) || null;
  }

  clearAll(): void {
    this.pools.forEach(pool => pool.clear());
    this.pools.clear();
  }

  getGlobalStats(): Record<string, any> {
    const stats: Record<string, any> = {};
    
    this.pools.forEach((pool, name) => {
      stats[name] = pool.getStats();
    });

    return stats;
  }
}

// Particle system with object pooling
export class PooledParticleSystem {
  private spritePool: SpritePool;
  private activeParticles: Set<PIXI.Sprite> = new Set();
  private container: PIXI.Container;

  constructor(texture: PIXI.Texture, container: PIXI.Container) {
    this.spritePool = new SpritePool(texture, 50, 200);
    this.container = container;
  }

  createParticle(
    x: number,
    y: number,
    velocityX: number = 0,
    velocityY: number = 0,
    lifetime: number = 1000
  ): void {
    const particle = this.spritePool.acquire();
    
    particle.x = x;
    particle.y = y;
    particle.anchor.set(0.5);
    particle.scale.set(0.5 + Math.random() * 0.5);
    
    this.container.addChild(particle);
    this.activeParticles.add(particle);

    // Animate particle
    const startTime = Date.now();
    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = elapsed / lifetime;

      if (progress >= 1) {
        // Particle lifetime ended
        this.destroyParticle(particle);
        return;
      }

      // Update position
      particle.x += velocityX;
      particle.y += velocityY;

      // Fade out
      particle.alpha = 1 - progress;

      // Continue animation
      requestAnimationFrame(animate);
    };

    requestAnimationFrame(animate);
  }

  private destroyParticle(particle: PIXI.Sprite): void {
    if (this.activeParticles.has(particle)) {
      this.activeParticles.delete(particle);
      this.container.removeChild(particle);
      this.spritePool.release(particle);
    }
  }

  createBurst(
    x: number,
    y: number,
    count: number = 10,
    speed: number = 2,
    lifetime: number = 1000
  ): void {
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count;
      const velocityX = Math.cos(angle) * speed;
      const velocityY = Math.sin(angle) * speed;
      
      this.createParticle(x, y, velocityX, velocityY, lifetime);
    }
  }

  clear(): void {
    this.activeParticles.forEach(particle => {
      this.container.removeChild(particle);
      this.spritePool.release(particle);
    });
    this.activeParticles.clear();
  }

  getStats(): {
    active: number;
    pooled: number;
  } {
    const poolStats = this.spritePool.getStats();
    return {
      active: this.activeParticles.size,
      pooled: poolStats.pooled,
    };
  }

  destroy(): void {
    this.clear();
    this.spritePool.clear();
  }
}