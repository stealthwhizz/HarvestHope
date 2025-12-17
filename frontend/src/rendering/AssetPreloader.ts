import * as PIXI from 'pixi.js';

export interface AssetManifest {
  textures: Record<string, string>;
  spritesheets: Record<string, string>;
  audio: Record<string, string>;
}

export interface PreloadProgress {
  loaded: number;
  total: number;
  percentage: number;
  currentAsset: string;
  stage: 'textures' | 'spritesheets' | 'audio' | 'complete';
}

export class AssetPreloader {
  private static instance: AssetPreloader;
  private loadedAssets: Set<string> = new Set();
  private textureCache: Map<string, PIXI.Texture> = new Map();
  private isPreloading: boolean = false;
  private preloadPromise: Promise<void> | null = null;

  static getInstance(): AssetPreloader {
    if (!AssetPreloader.instance) {
      AssetPreloader.instance = new AssetPreloader();
    }
    return AssetPreloader.instance;
  }

  private constructor() {
    // Configure PIXI for optimal performance
    PIXI.settings.PREFER_ENV = PIXI.ENV.WEBGL2;
    PIXI.settings.ROUND_PIXELS = true; // Better for pixel art
    PIXI.settings.SCALE_MODE = PIXI.SCALE_MODES.NEAREST; // Pixel art scaling
  }

  async preloadCriticalAssets(
    onProgress?: (progress: PreloadProgress) => void
  ): Promise<void> {
    if (this.preloadPromise) {
      return this.preloadPromise;
    }

    this.isPreloading = true;
    
    this.preloadPromise = this.performPreload(onProgress);
    await this.preloadPromise;
    
    this.isPreloading = false;
  }

  private async performPreload(
    onProgress?: (progress: PreloadProgress) => void
  ): Promise<void> {
    const manifest = this.getCriticalAssetManifest();
    const totalAssets = Object.keys(manifest.textures).length + 
                       Object.keys(manifest.spritesheets).length + 
                       Object.keys(manifest.audio).length;
    
    let loadedCount = 0;

    const updateProgress = (stage: PreloadProgress['stage'], currentAsset: string) => {
      if (onProgress) {
        onProgress({
          loaded: loadedCount,
          total: totalAssets,
          percentage: Math.round((loadedCount / totalAssets) * 100),
          currentAsset,
          stage,
        });
      }
    };

    // Preload textures
    updateProgress('textures', 'Loading textures...');
    await this.preloadTextures(manifest.textures, (asset) => {
      loadedCount++;
      updateProgress('textures', asset);
    });

    // Preload spritesheets
    updateProgress('spritesheets', 'Loading spritesheets...');
    await this.preloadSpritesheets(manifest.spritesheets, (asset) => {
      loadedCount++;
      updateProgress('spritesheets', asset);
    });

    // Preload audio (if needed)
    updateProgress('audio', 'Loading audio...');
    await this.preloadAudio(manifest.audio, (asset) => {
      loadedCount++;
      updateProgress('audio', asset);
    });

    updateProgress('complete', 'Preloading complete');
  }

  private getCriticalAssetManifest(): AssetManifest {
    // Define critical assets that should be preloaded
    return {
      textures: {
        // UI elements
        'ui_button': '/assets/ui/button.png',
        'ui_panel': '/assets/ui/panel.png',
        'ui_icons': '/assets/ui/icons.png',
        
        // Farm elements
        'farm_tiles': '/assets/farm/tiles.png',
        'farm_grid': '/assets/farm/grid.png',
        
        // Weather effects
        'weather_rain': '/assets/weather/rain.png',
        'weather_sun': '/assets/weather/sun.png',
        'weather_cloud': '/assets/weather/cloud.png',
      },
      spritesheets: {
        'crops': '/assets/spritesheets/crops.json',
        'characters': '/assets/spritesheets/characters.json',
        'effects': '/assets/spritesheets/effects.json',
      },
      audio: {
        // Critical audio files will be handled by AudioManager
      },
    };
  }

  private async preloadTextures(
    textures: Record<string, string>,
    onAssetLoaded?: (assetName: string) => void
  ): Promise<void> {
    const promises = Object.entries(textures).map(async ([name, url]) => {
      try {
        // For now, create programmatic textures since we don't have actual assets
        const texture = this.createPlaceholderTexture(name);
        this.textureCache.set(name, texture);
        this.loadedAssets.add(name);
        
        if (onAssetLoaded) {
          onAssetLoaded(name);
        }
      } catch (error) {
        console.warn(`Failed to load texture ${name}:`, error);
        // Create fallback texture
        const fallback = this.createFallbackTexture();
        this.textureCache.set(name, fallback);
      }
    });

    await Promise.all(promises);
  }

  private async preloadSpritesheets(
    spritesheets: Record<string, string>,
    onAssetLoaded?: (assetName: string) => void
  ): Promise<void> {
    const promises = Object.entries(spritesheets).map(async ([name, url]) => {
      try {
        // For now, mark as loaded since we're using programmatic sprites
        this.loadedAssets.add(name);
        
        if (onAssetLoaded) {
          onAssetLoaded(name);
        }
      } catch (error) {
        console.warn(`Failed to load spritesheet ${name}:`, error);
      }
    });

    await Promise.all(promises);
  }

  private async preloadAudio(
    audio: Record<string, string>,
    onAssetLoaded?: (assetName: string) => void
  ): Promise<void> {
    // Audio preloading is handled by AudioManager
    // Just mark as complete for progress tracking
    Object.keys(audio).forEach((name) => {
      this.loadedAssets.add(name);
      if (onAssetLoaded) {
        onAssetLoaded(name);
      }
    });
  }

  private createPlaceholderTexture(name: string): PIXI.Texture {
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext('2d')!;

    ctx.imageSmoothingEnabled = false;

    // Create different placeholder textures based on name
    if (name.includes('ui_')) {
      // UI elements
      ctx.fillStyle = '#4169E1';
      ctx.fillRect(0, 0, 64, 64);
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 2;
      ctx.strokeRect(0, 0, 64, 64);
      
      // Add icon based on type
      ctx.fillStyle = '#FFFFFF';
      ctx.font = '16px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(name.split('_')[1].toUpperCase(), 32, 36);
    } else if (name.includes('farm_')) {
      // Farm elements
      ctx.fillStyle = '#8B4513';
      ctx.fillRect(0, 0, 64, 64);
      
      // Add grid pattern
      ctx.strokeStyle = '#654321';
      ctx.lineWidth = 1;
      for (let i = 0; i < 64; i += 8) {
        ctx.beginPath();
        ctx.moveTo(i, 0);
        ctx.lineTo(i, 64);
        ctx.moveTo(0, i);
        ctx.lineTo(64, i);
        ctx.stroke();
      }
    } else if (name.includes('weather_')) {
      // Weather elements
      ctx.fillStyle = '#87CEEB';
      ctx.fillRect(0, 0, 64, 64);
      
      if (name.includes('rain')) {
        ctx.strokeStyle = '#4682B4';
        ctx.lineWidth = 2;
        for (let i = 0; i < 10; i++) {
          const x = Math.random() * 64;
          const y = Math.random() * 64;
          ctx.beginPath();
          ctx.moveTo(x, y);
          ctx.lineTo(x + 2, y + 8);
          ctx.stroke();
        }
      } else if (name.includes('sun')) {
        ctx.fillStyle = '#FFD700';
        ctx.beginPath();
        ctx.arc(32, 32, 20, 0, Math.PI * 2);
        ctx.fill();
      }
    } else {
      // Default placeholder
      ctx.fillStyle = '#90EE90';
      ctx.fillRect(0, 0, 64, 64);
      ctx.strokeStyle = '#000000';
      ctx.strokeRect(0, 0, 64, 64);
    }

    const texture = PIXI.Texture.from(canvas);
    texture.source.scaleMode = 'nearest';
    return texture;
  }

  private createFallbackTexture(): PIXI.Texture {
    const canvas = document.createElement('canvas');
    canvas.width = 32;
    canvas.height = 32;
    const ctx = canvas.getContext('2d')!;
    
    ctx.fillStyle = '#FF00FF'; // Magenta for missing textures
    ctx.fillRect(0, 0, 32, 32);
    
    return PIXI.Texture.from(canvas);
  }

  getTexture(name: string): PIXI.Texture | null {
    return this.textureCache.get(name) || null;
  }

  isAssetLoaded(name: string): boolean {
    return this.loadedAssets.has(name);
  }

  isPreloadingComplete(): boolean {
    return !this.isPreloading && this.preloadPromise !== null;
  }

  // Memory management
  clearUnusedAssets(): void {
    // Clear textures that haven't been used recently
    const unusedTextures: string[] = [];
    
    this.textureCache.forEach((texture, name) => {
      // Simple heuristic: if texture has no references, mark for cleanup
      if (texture.source && (texture.source as any).referenceCount === 0) {
        unusedTextures.push(name);
      }
    });

    unusedTextures.forEach(name => {
      const texture = this.textureCache.get(name);
      if (texture) {
        texture.destroy();
        this.textureCache.delete(name);
        this.loadedAssets.delete(name);
      }
    });

    console.log(`Cleaned up ${unusedTextures.length} unused textures`);
  }

  // Get memory usage statistics
  getMemoryStats(): {
    loadedAssets: number;
    cachedTextures: number;
    estimatedMemoryMB: number;
  } {
    let estimatedMemory = 0;
    
    this.textureCache.forEach(texture => {
      if (texture.source) {
        // Rough estimate: width * height * 4 bytes (RGBA)
        estimatedMemory += texture.width * texture.height * 4;
      }
    });

    return {
      loadedAssets: this.loadedAssets.size,
      cachedTextures: this.textureCache.size,
      estimatedMemoryMB: Math.round(estimatedMemory / (1024 * 1024) * 100) / 100,
    };
  }

  destroy(): void {
    this.textureCache.forEach(texture => texture.destroy());
    this.textureCache.clear();
    this.loadedAssets.clear();
    this.preloadPromise = null;
  }
}