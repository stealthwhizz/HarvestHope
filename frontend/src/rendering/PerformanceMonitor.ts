export interface PerformanceMetrics {
  fps: number;
  frameTime: number;
  memoryUsage: number;
  renderTime: number;
  updateTime: number;
  drawCalls: number;
  activeObjects: number;
}

export interface PerformanceThresholds {
  minFPS: number;
  maxFrameTime: number;
  maxMemoryMB: number;
  maxRenderTime: number;
}

export class PerformanceMonitor {
  private static instance: PerformanceMonitor;
  private metrics: PerformanceMetrics;
  private thresholds: PerformanceThresholds;
  private frameHistory: number[] = [];
  private lastFrameTime: number = 0;
  private frameCount: number = 0;
  private isMonitoring: boolean = false;
  private callbacks: ((metrics: PerformanceMetrics) => void)[] = [];

  static getInstance(): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor();
    }
    return PerformanceMonitor.instance;
  }

  private constructor() {
    this.metrics = {
      fps: 60,
      frameTime: 16.67,
      memoryUsage: 0,
      renderTime: 0,
      updateTime: 0,
      drawCalls: 0,
      activeObjects: 0,
    };

    this.thresholds = {
      minFPS: 30,
      maxFrameTime: 33.33, // 30 FPS
      maxMemoryMB: 512,
      maxRenderTime: 16,
    };
  }

  startMonitoring(): void {
    if (this.isMonitoring) return;

    this.isMonitoring = true;
    this.lastFrameTime = performance.now();
    this.monitorFrame();
  }

  stopMonitoring(): void {
    this.isMonitoring = false;
  }

  private monitorFrame(): void {
    if (!this.isMonitoring) return;

    const currentTime = performance.now();
    const frameTime = currentTime - this.lastFrameTime;
    
    // Update frame history
    this.frameHistory.push(frameTime);
    if (this.frameHistory.length > 60) {
      this.frameHistory.shift();
    }

    // Calculate FPS
    const avgFrameTime = this.frameHistory.reduce((a, b) => a + b, 0) / this.frameHistory.length;
    this.metrics.fps = Math.round(1000 / avgFrameTime);
    this.metrics.frameTime = Math.round(avgFrameTime * 100) / 100;

    // Update memory usage (if available)
    if ('memory' in performance) {
      const memory = (performance as any).memory;
      this.metrics.memoryUsage = Math.round(memory.usedJSHeapSize / 1024 / 1024 * 100) / 100;
    }

    this.frameCount++;
    this.lastFrameTime = currentTime;

    // Notify callbacks
    this.callbacks.forEach(callback => callback(this.metrics));

    // Check for performance issues
    this.checkPerformanceIssues();

    // Continue monitoring
    requestAnimationFrame(() => this.monitorFrame());
  }

  private checkPerformanceIssues(): void {
    const issues: string[] = [];

    if (this.metrics.fps < this.thresholds.minFPS) {
      issues.push(`Low FPS: ${this.metrics.fps} (target: ${this.thresholds.minFPS}+)`);
    }

    if (this.metrics.frameTime > this.thresholds.maxFrameTime) {
      issues.push(`High frame time: ${this.metrics.frameTime}ms (target: <${this.thresholds.maxFrameTime}ms)`);
    }

    if (this.metrics.memoryUsage > this.thresholds.maxMemoryMB) {
      issues.push(`High memory usage: ${this.metrics.memoryUsage}MB (target: <${this.thresholds.maxMemoryMB}MB)`);
    }

    if (this.metrics.renderTime > this.thresholds.maxRenderTime) {
      issues.push(`High render time: ${this.metrics.renderTime}ms (target: <${this.thresholds.maxRenderTime}ms)`);
    }

    if (issues.length > 0) {
      console.warn('Performance issues detected:', issues);
    }
  }

  updateRenderMetrics(renderTime: number, drawCalls: number, activeObjects: number): void {
    this.metrics.renderTime = Math.round(renderTime * 100) / 100;
    this.metrics.drawCalls = drawCalls;
    this.metrics.activeObjects = activeObjects;
  }

  updateUpdateTime(updateTime: number): void {
    this.metrics.updateTime = Math.round(updateTime * 100) / 100;
  }

  getMetrics(): PerformanceMetrics {
    return { ...this.metrics };
  }

  setThresholds(thresholds: Partial<PerformanceThresholds>): void {
    this.thresholds = { ...this.thresholds, ...thresholds };
  }

  onMetricsUpdate(callback: (metrics: PerformanceMetrics) => void): void {
    this.callbacks.push(callback);
  }

  removeCallback(callback: (metrics: PerformanceMetrics) => void): void {
    const index = this.callbacks.indexOf(callback);
    if (index > -1) {
      this.callbacks.splice(index, 1);
    }
  }

  // Performance optimization suggestions
  getOptimizationSuggestions(): string[] {
    const suggestions: string[] = [];

    if (this.metrics.fps < 45) {
      suggestions.push('Consider reducing visual effects or sprite count');
      suggestions.push('Enable object pooling for frequently created/destroyed objects');
    }

    if (this.metrics.memoryUsage > 256) {
      suggestions.push('Clear unused textures and assets');
      suggestions.push('Implement texture atlasing to reduce memory fragmentation');
    }

    if (this.metrics.drawCalls > 100) {
      suggestions.push('Batch similar sprites together');
      suggestions.push('Use sprite sheets to reduce texture switches');
    }

    if (this.metrics.activeObjects > 1000) {
      suggestions.push('Implement frustum culling to hide off-screen objects');
      suggestions.push('Use level-of-detail (LOD) for distant objects');
    }

    return suggestions;
  }

  // Adaptive quality settings
  getRecommendedQuality(): 'low' | 'medium' | 'high' {
    if (this.metrics.fps < 30 || this.metrics.memoryUsage > 400) {
      return 'low';
    } else if (this.metrics.fps < 45 || this.metrics.memoryUsage > 200) {
      return 'medium';
    } else {
      return 'high';
    }
  }

  // Export performance data for analysis
  exportPerformanceData(): {
    timestamp: number;
    metrics: PerformanceMetrics;
    frameHistory: number[];
    userAgent: string;
  } {
    return {
      timestamp: Date.now(),
      metrics: this.getMetrics(),
      frameHistory: [...this.frameHistory],
      userAgent: navigator.userAgent,
    };
  }
}

// Performance-aware render culling
export class RenderCuller {
  private viewBounds: { x: number; y: number; width: number; height: number };
  private margin: number;

  constructor(viewBounds: { x: number; y: number; width: number; height: number }, margin: number = 100) {
    this.viewBounds = viewBounds;
    this.margin = margin;
  }

  updateViewBounds(bounds: { x: number; y: number; width: number; height: number }): void {
    this.viewBounds = bounds;
  }

  isVisible(object: { x: number; y: number; width?: number; height?: number }): boolean {
    const objWidth = object.width || 32;
    const objHeight = object.height || 32;

    return !(
      object.x + objWidth < this.viewBounds.x - this.margin ||
      object.x > this.viewBounds.x + this.viewBounds.width + this.margin ||
      object.y + objHeight < this.viewBounds.y - this.margin ||
      object.y > this.viewBounds.y + this.viewBounds.height + this.margin
    );
  }

  cullObjects<T extends { x: number; y: number; width?: number; height?: number; visible: boolean }>(
    objects: T[]
  ): { visible: T[]; culled: number } {
    const visible: T[] = [];
    let culled = 0;

    for (const obj of objects) {
      if (this.isVisible(obj)) {
        obj.visible = true;
        visible.push(obj);
      } else {
        obj.visible = false;
        culled++;
      }
    }

    return { visible, culled };
  }
}

// Adaptive quality manager
export class AdaptiveQualityManager {
  private performanceMonitor: PerformanceMonitor;
  private currentQuality: 'low' | 'medium' | 'high' = 'high';
  private qualitySettings: Record<string, any> = {};
  private adjustmentCooldown: number = 5000; // 5 seconds
  private lastAdjustment: number = 0;

  constructor() {
    this.performanceMonitor = PerformanceMonitor.getInstance();
    this.initializeQualitySettings();
    this.startAdaptiveAdjustment();
  }

  private initializeQualitySettings(): void {
    this.qualitySettings = {
      low: {
        particleCount: 10,
        animationQuality: 0.5,
        shadowQuality: 0,
        effectsEnabled: false,
        maxSprites: 500,
      },
      medium: {
        particleCount: 25,
        animationQuality: 0.75,
        shadowQuality: 0.5,
        effectsEnabled: true,
        maxSprites: 1000,
      },
      high: {
        particleCount: 50,
        animationQuality: 1.0,
        shadowQuality: 1.0,
        effectsEnabled: true,
        maxSprites: 2000,
      },
    };
  }

  private startAdaptiveAdjustment(): void {
    this.performanceMonitor.onMetricsUpdate((metrics) => {
      const now = Date.now();
      if (now - this.lastAdjustment < this.adjustmentCooldown) {
        return;
      }

      const recommendedQuality = this.performanceMonitor.getRecommendedQuality();
      if (recommendedQuality !== this.currentQuality) {
        this.adjustQuality(recommendedQuality);
        this.lastAdjustment = now;
      }
    });
  }

  private adjustQuality(newQuality: 'low' | 'medium' | 'high'): void {
    console.log(`Adjusting quality from ${this.currentQuality} to ${newQuality}`);
    this.currentQuality = newQuality;
    
    // Emit quality change event
    window.dispatchEvent(new CustomEvent('qualityChanged', {
      detail: {
        quality: newQuality,
        settings: this.qualitySettings[newQuality],
      },
    }));
  }

  getCurrentQuality(): 'low' | 'medium' | 'high' {
    return this.currentQuality;
  }

  getQualitySettings(): any {
    return this.qualitySettings[this.currentQuality];
  }

  setQuality(quality: 'low' | 'medium' | 'high'): void {
    this.adjustQuality(quality);
  }
}