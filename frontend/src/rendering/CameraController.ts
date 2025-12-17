import * as PIXI from 'pixi.js';

export interface CameraConfig {
  worldWidth: number;
  worldHeight: number;
  viewportWidth: number;
  viewportHeight: number;
  minZoom?: number;
  maxZoom?: number;
  panSpeed?: number;
  zoomSpeed?: number;
}

export class CameraController {
  private config: CameraConfig;
  private currentZoom: number = 1;
  private panX: number = 0;
  private panY: number = 0;
  private isDragging: boolean = false;
  private lastPointerPosition: { x: number; y: number } = { x: 0, y: 0 };

  private container: PIXI.Container;

  constructor(
    container: PIXI.Container,
    config: CameraConfig
  ) {
    this.container = container;
    this.config = {
      minZoom: 0.5,
      maxZoom: 3.0,
      panSpeed: 1.0,
      zoomSpeed: 0.1,
      ...config,
    };

    this.setupEventListeners();
    this.updateTransform();
  }

  private setupEventListeners(): void {
    // Make container interactive
    this.container.eventMode = 'static';
    this.container.hitArea = new PIXI.Rectangle(0, 0, this.config.worldWidth, this.config.worldHeight);

    // Mouse/touch events for panning
    this.container.on('pointerdown', this.onPointerDown.bind(this));
    this.container.on('pointerup', this.onPointerUp.bind(this));
    this.container.on('pointerupoutside', this.onPointerUp.bind(this));
    this.container.on('pointermove', this.onPointerMove.bind(this));

    // Wheel event for zooming (needs to be added to the canvas element)
    // This will be handled by the parent component
  }

  private onPointerDown(event: PIXI.FederatedPointerEvent): void {
    this.isDragging = true;
    this.lastPointerPosition = {
      x: event.global.x,
      y: event.global.y,
    };
  }

  private onPointerUp(): void {
    this.isDragging = false;
  }

  private onPointerMove(event: PIXI.FederatedPointerEvent): void {
    if (!this.isDragging) return;

    const deltaX = event.global.x - this.lastPointerPosition.x;
    const deltaY = event.global.y - this.lastPointerPosition.y;

    this.move(deltaX * this.config.panSpeed!, deltaY * this.config.panSpeed!);

    this.lastPointerPosition = {
      x: event.global.x,
      y: event.global.y,
    };
  }

  move(deltaX: number, deltaY: number): void {
    // Apply movement with zoom compensation
    const scaledDeltaX = deltaX / this.currentZoom;
    const scaledDeltaY = deltaY / this.currentZoom;

    this.panX += scaledDeltaX;
    this.panY += scaledDeltaY;

    // Clamp to world boundaries
    this.clampPan();
    this.updateTransform();
  }

  zoom(factor: number, centerX?: number, centerY?: number): void {
    const oldZoom = this.currentZoom;
    this.currentZoom = Math.max(
      this.config.minZoom!,
      Math.min(this.config.maxZoom!, this.currentZoom * factor)
    );

    // If zoom actually changed and center point provided, adjust pan to zoom towards center
    if (this.currentZoom !== oldZoom && centerX !== undefined && centerY !== undefined) {
      // const zoomRatio = this.currentZoom / oldZoom;
      
      // Convert screen coordinates to world coordinates
      const worldX = (centerX - this.panX) / oldZoom;
      const worldY = (centerY - this.panY) / oldZoom;
      
      // Adjust pan to keep the zoom center point stable
      this.panX = centerX - worldX * this.currentZoom;
      this.panY = centerY - worldY * this.currentZoom;
    }

    this.clampPan();
    this.updateTransform();
  }

  private clampPan(): void {
    const scaledWorldWidth = this.config.worldWidth * this.currentZoom;
    const scaledWorldHeight = this.config.worldHeight * this.currentZoom;

    // Calculate maximum pan values to keep world visible
    const maxPanX = Math.max(0, scaledWorldWidth - this.config.viewportWidth);
    const maxPanY = Math.max(0, scaledWorldHeight - this.config.viewportHeight);

    // If world is smaller than viewport, center it
    if (scaledWorldWidth <= this.config.viewportWidth) {
      this.panX = (this.config.viewportWidth - scaledWorldWidth) / 2;
    } else {
      this.panX = Math.max(-maxPanX, Math.min(0, this.panX));
    }

    if (scaledWorldHeight <= this.config.viewportHeight) {
      this.panY = (this.config.viewportHeight - scaledWorldHeight) / 2;
    } else {
      this.panY = Math.max(-maxPanY, Math.min(0, this.panY));
    }
  }

  private updateTransform(): void {
    this.container.scale.set(this.currentZoom);
    this.container.position.set(this.panX, this.panY);
  }

  // Public methods for external control
  setZoom(zoom: number): void {
    this.currentZoom = Math.max(
      this.config.minZoom!,
      Math.min(this.config.maxZoom!, zoom)
    );
    this.clampPan();
    this.updateTransform();
  }

  setPan(x: number, y: number): void {
    this.panX = x;
    this.panY = y;
    this.clampPan();
    this.updateTransform();
  }

  centerOn(worldX: number, worldY: number): void {
    this.panX = this.config.viewportWidth / 2 - worldX * this.currentZoom;
    this.panY = this.config.viewportHeight / 2 - worldY * this.currentZoom;
    this.clampPan();
    this.updateTransform();
  }

  screenToWorld(screenX: number, screenY: number): { x: number; y: number } {
    return {
      x: (screenX - this.panX) / this.currentZoom,
      y: (screenY - this.panY) / this.currentZoom,
    };
  }

  worldToScreen(worldX: number, worldY: number): { x: number; y: number } {
    return {
      x: worldX * this.currentZoom + this.panX,
      y: worldY * this.currentZoom + this.panY,
    };
  }

  updateViewport(width: number, height: number): void {
    this.config.viewportWidth = width;
    this.config.viewportHeight = height;
    this.clampPan();
    this.updateTransform();
  }

  getZoom(): number {
    return this.currentZoom;
  }

  getPan(): { x: number; y: number } {
    return { x: this.panX, y: this.panY };
  }

  getBounds(): { 
    left: number; 
    top: number; 
    right: number; 
    bottom: number; 
  } {
    const topLeft = this.screenToWorld(0, 0);
    const bottomRight = this.screenToWorld(this.config.viewportWidth, this.config.viewportHeight);
    
    return {
      left: topLeft.x,
      top: topLeft.y,
      right: bottomRight.x,
      bottom: bottomRight.y,
    };
  }

  // Handle wheel events (to be called from parent component)
  handleWheel(event: WheelEvent): void {
    event.preventDefault();
    
    const zoomFactor = event.deltaY > 0 ? (1 - this.config.zoomSpeed!) : (1 + this.config.zoomSpeed!);
    
    // Get mouse position relative to the canvas
    const rect = (event.target as HTMLElement).getBoundingClientRect();
    const centerX = event.clientX - rect.left;
    const centerY = event.clientY - rect.top;
    
    this.zoom(zoomFactor, centerX, centerY);
  }
}