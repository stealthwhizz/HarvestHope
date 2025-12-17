import * as PIXI from 'pixi.js';
import { FarmRenderer } from './FarmRenderer';
import { SpriteManager } from './SpriteManager';
import { CameraController } from './CameraController';
import { CRTShader } from './shaders/CRTShader';
import { AnimationSystem } from './AnimationSystem';
import { AssetPreloader } from './AssetPreloader';
import { PerformanceMonitor, RenderCuller, AdaptiveQualityManager } from './PerformanceMonitor';
import { PoolManager, SpritePool, GraphicsPool } from './ObjectPool';
import type { FarmData } from '../../../shared/types/game-state';

export interface PixiGameEngineConfig {
  width: number;
  height: number;
  backgroundColor: number;
  antialias: boolean;
  resolution: number;
  enableCRTShader: boolean;
  enableAnimations: boolean;
}

export class PixiGameEngine {
  private app: PIXI.Application;
  private farmRenderer!: FarmRenderer;
  private spriteManager!: SpriteManager;
  private cameraController!: CameraController;
  private crtShader!: CRTShader;
  private animationSystem!: AnimationSystem;
  private assetPreloader!: AssetPreloader;
  private performanceMonitor!: PerformanceMonitor;
  private renderCuller!: RenderCuller;
  private qualityManager!: AdaptiveQualityManager;
  private poolManager!: PoolManager;
  private isInitialized: boolean = false;
  private lastRenderTime: number = 0;
  private frameCount: number = 0;

  private config: PixiGameEngineConfig;

  constructor(config: PixiGameEngineConfig) {
    this.config = config;
    // Initialize PIXI Application with retro pixel art configuration
    this.app = new PIXI.Application();
  }

  async initialize(canvas: HTMLCanvasElement): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    // Initialize performance monitoring
    this.performanceMonitor = PerformanceMonitor.getInstance();
    this.performanceMonitor.startMonitoring();

    // Initialize PIXI app with optimized settings
    await this.app.init({
      canvas,
      width: this.config.width,
      height: this.config.height,
      backgroundColor: this.config.backgroundColor,
      antialias: this.config.antialias, // Disabled for pixel art
      resolution: this.config.resolution,
      preference: 'webgl', // Prefer WebGL for better compatibility
      powerPreference: 'high-performance',
    });

    // Configure PIXI for optimal performance
    this.app.renderer.runners.contextChange.add({
      contextChange: () => {
        // Enable batch rendering optimizations
        const renderer = this.app.renderer as PIXI.Renderer;
        // Batch configuration removed due to PixiJS v8 API changes
      }
    });

    // Initialize asset preloader
    this.assetPreloader = AssetPreloader.getInstance();
    
    // Initialize object pools
    this.poolManager = PoolManager.getInstance();
    
    // Initialize render culler
    this.renderCuller = new RenderCuller({
      x: 0,
      y: 0,
      width: this.config.width,
      height: this.config.height,
    });

    // Initialize adaptive quality manager
    this.qualityManager = new AdaptiveQualityManager();

    // Initialize subsystems
    this.spriteManager = new SpriteManager();
    await this.spriteManager.initialize();

    this.farmRenderer = new FarmRenderer(this.app.stage, this.spriteManager);
    this.cameraController = new CameraController(this.app.stage, {
      worldWidth: 1600, // 32x32 pixel tiles, 50x50 grid
      worldHeight: 1600,
      viewportWidth: this.config.width,
      viewportHeight: this.config.height,
    });

    // Initialize retro effects based on quality settings
    if (this.config.enableCRTShader && this.qualityManager.getCurrentQuality() !== 'low') {
      this.crtShader = new CRTShader({
        enabled: true,
        scanlineIntensity: 0.2,
        curvature: 0.05,
        vignetteIntensity: 0.15,
        noiseIntensity: 0.03,
        brightness: 1.1,
        contrast: 1.15,
      });

      const filter = this.crtShader.getFilter();
      if (filter) {
        this.app.stage.filters = [filter];
      }
    }

    // Initialize animation system
    if (this.config.enableAnimations) {
      this.animationSystem = new AnimationSystem();
    }

    // Set up quality change listener
    window.addEventListener('qualityChanged', this.onQualityChanged.bind(this));

    this.isInitialized = true;
  }

  updateFarm(farmData: FarmData): void {
    if (!this.isInitialized) {
      console.warn('PixiGameEngine not initialized');
      return;
    }
    
    this.farmRenderer.updateFarmData(farmData);
  }

  render(): void {
    if (!this.isInitialized) {
      return;
    }

    const renderStart = performance.now();
    
    // Update render culler bounds based on camera
    const cameraBounds = this.cameraController.getBounds();
    this.renderCuller.updateViewBounds({
      x: cameraBounds.left,
      y: cameraBounds.top,
      width: cameraBounds.right - cameraBounds.left,
      height: cameraBounds.bottom - cameraBounds.top
    });
    
    // Render farm with culling
    this.farmRenderer.render();

    // Update CRT shader time for animated effects (only if enabled)
    if (this.crtShader && this.qualityManager.getCurrentQuality() !== 'low') {
      this.crtShader.updateTime(this.app.ticker.deltaMS);
    }

    // Update performance metrics
    const renderTime = performance.now() - renderStart;
    const drawCalls = this.getEstimatedDrawCalls();
    const activeObjects = this.getActiveObjectCount();
    
    this.performanceMonitor.updateRenderMetrics(renderTime, drawCalls, activeObjects);
    
    this.frameCount++;
    
    // Periodic memory cleanup (every 300 frames ≈ 5 seconds at 60fps)
    if (this.frameCount % 300 === 0) {
      this.performMemoryCleanup();
    }
  }

  handleInput(inputType: string, data: any): void {
    switch (inputType) {
      case 'camera_move':
        this.cameraController.move(data.deltaX, data.deltaY);
        break;
      case 'camera_zoom':
        this.cameraController.zoom(data.factor, data.centerX, data.centerY);
        break;
      case 'farm_click':
        this.farmRenderer.handleClick(data.x, data.y);
        break;
    }
  }

  resize(width: number, height: number): void {
    if (!this.isInitialized) {
      return;
    }
    
    this.app.renderer.resize(width, height);
    this.cameraController.updateViewport(width, height);
  }

  destroy(): void {
    if (this.animationSystem) {
      this.animationSystem.destroy();
    }
    if (this.app) {
      this.app.destroy(true, true);
    }
    this.isInitialized = false;
  }

  getApp(): PIXI.Application {
    return this.app;
  }

  getAnimationSystem(): AnimationSystem | null {
    return this.animationSystem || null;
  }

  getCRTShader(): CRTShader | null {
    return this.crtShader || null;
  }

  setCRTEnabled(enabled: boolean): void {
    if (this.crtShader) {
      this.crtShader.setEnabled(enabled);
      const filter = this.crtShader.getFilter();
      this.app.stage.filters = enabled && filter ? [filter] : [];
    }
  }

  updateCRTConfig(config: any): void {
    if (this.crtShader) {
      this.crtShader.updateConfig(config);
      const filter = this.crtShader.getFilter();
      if (filter && this.crtShader.isEnabled()) {
        this.app.stage.filters = [filter];
      }
    }
  }

  private onQualityChanged(event: CustomEvent): void {
    const { quality, settings } = event.detail;
    
    // Adjust CRT shader based on quality
    if (this.crtShader) {
      if (quality === 'low') {
        this.setCRTEnabled(false);
      } else {
        this.setCRTEnabled(this.config.enableCRTShader);
      }
    }

    // Adjust animation quality
    if (this.animationSystem) {
      // Could implement animation quality scaling here
    }

    console.log(`Quality adjusted to ${quality}`, settings);
  }

  private getEstimatedDrawCalls(): number {
    // Rough estimate based on visible objects
    // In a real implementation, this would be more accurate
    return Math.min(this.getActiveObjectCount() / 10, 100);
  }

  private getActiveObjectCount(): number {
    // Count active display objects in the scene
    let count = 0;
    
    const countChildren = (container: PIXI.Container): void => {
      count += container.children.length;
      container.children.forEach(child => {
        if (child instanceof PIXI.Container) {
          countChildren(child);
        }
      });
    };

    countChildren(this.app.stage);
    return count;
  }

  private performMemoryCleanup(): void {
    // Clean up unused assets
    if (this.assetPreloader) {
      this.assetPreloader.clearUnusedAssets();
    }

    // Clean up object pools
    // Note: This is a gentle cleanup, not clearing active objects
    
    // Force garbage collection if available (development only)
    if (typeof window !== 'undefined' && (window as any).gc) {
      (window as any).gc();
    }
  }

  // Performance monitoring methods
  getPerformanceMetrics() {
    return this.performanceMonitor.getMetrics();
  }

  getMemoryStats() {
    const assetStats = this.assetPreloader?.getMemoryStats() || {
      loadedAssets: 0,
      cachedTextures: 0,
      estimatedMemoryMB: 0,
    };

    const poolStats = this.poolManager?.getGlobalStats() || {};

    return {
      assets: assetStats,
      pools: poolStats,
      renderer: {
        drawCalls: this.getEstimatedDrawCalls(),
        activeObjects: this.getActiveObjectCount(),
      },
    };
  }

  // Adaptive quality methods
  getCurrentQuality() {
    return this.qualityManager?.getCurrentQuality() || 'high';
  }

  setQuality(quality: 'low' | 'medium' | 'high') {
    this.qualityManager?.setQuality(quality);
  }

  // Asset preloading
  async preloadAssets(onProgress?: (progress: any) => void): Promise<void> {
    if (this.assetPreloader) {
      await this.assetPreloader.preloadCriticalAssets(onProgress);
    }
  }

  isAssetsReady(): boolean {
    return this.assetPreloader?.isPreloadingComplete() || false;
  }
}