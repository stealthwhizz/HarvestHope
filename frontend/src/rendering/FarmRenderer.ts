import * as PIXI from 'pixi.js';
import { SpriteManager } from './SpriteManager';
import type { FarmData, CropData } from '../../../shared/types/game-state';

export interface FarmGridConfig {
  tileSize: number;
  gridWidth: number;
  gridHeight: number;
  cropAreaColor: number;
  pathColor: number;
}

export class FarmRenderer {
  private container: PIXI.Container;
  private farmGrid: PIXI.Container;
  private cropContainer: PIXI.Container;
  private backgroundContainer: PIXI.Container;
  private config: FarmGridConfig;
  private farmData: FarmData | null = null;

  private stage: PIXI.Container;
  private spriteManager: SpriteManager;

  constructor(
    stage: PIXI.Container,
    spriteManager: SpriteManager
  ) {
    this.stage = stage;
    this.spriteManager = spriteManager;
    this.config = {
      tileSize: 32,
      gridWidth: 50,
      gridHeight: 50,
      cropAreaColor: 0x8B4513, // Brown soil color
      pathColor: 0x654321, // Darker brown for paths
    };

    this.container = new PIXI.Container();
    this.backgroundContainer = new PIXI.Container();
    this.farmGrid = new PIXI.Container();
    this.cropContainer = new PIXI.Container();

    // Layer order: background -> grid -> crops
    this.container.addChild(this.backgroundContainer);
    this.container.addChild(this.farmGrid);
    this.container.addChild(this.cropContainer);
    
    this.stage.addChild(this.container);

    this.initializeFarmGrid();
  }

  private initializeFarmGrid(): void {
    // Create background tiles
    for (let x = 0; x < this.config.gridWidth; x++) {
      for (let y = 0; y < this.config.gridHeight; y++) {
        const tile = this.createGridTile(x, y);
        this.farmGrid.addChild(tile);
      }
    }

    // Create configurable crop areas (example layout)
    this.createCropAreas();
  }

  private createGridTile(gridX: number, gridY: number): PIXI.Graphics {
    const tile = new PIXI.Graphics();
    const pixelX = gridX * this.config.tileSize;
    const pixelY = gridY * this.config.tileSize;

    // Determine tile type based on position
    const isCropArea = this.isCropArea(gridX, gridY);
    const color = isCropArea ? this.config.cropAreaColor : this.config.pathColor;

    tile.rect(pixelX, pixelY, this.config.tileSize, this.config.tileSize);
    tile.fill(color);

    // Add subtle border for pixel art effect
    tile.stroke({ width: 1, color: 0x000000, alpha: 0.2 });

    return tile;
  }

  private isCropArea(gridX: number, gridY: number): boolean {
    // Define crop areas - leaving paths between sections
    const isPath = (gridX % 10 === 0) || (gridY % 10 === 0);
    const isEdge = gridX < 2 || gridY < 2 || gridX >= this.config.gridWidth - 2 || gridY >= this.config.gridHeight - 2;
    
    return !isPath && !isEdge;
  }

  private createCropAreas(): void {
    // Create visual indicators for different crop areas
    const areas = [
      { x: 5, y: 5, width: 8, height: 8, label: 'Field A' },
      { x: 15, y: 5, width: 8, height: 8, label: 'Field B' },
      { x: 25, y: 5, width: 8, height: 8, label: 'Field C' },
      { x: 5, y: 15, width: 8, height: 8, label: 'Field D' },
    ];

    areas.forEach(area => {
      const areaGraphics = new PIXI.Graphics();
      const pixelX = area.x * this.config.tileSize;
      const pixelY = area.y * this.config.tileSize;
      const pixelWidth = area.width * this.config.tileSize;
      const pixelHeight = area.height * this.config.tileSize;

      // Draw area border
      areaGraphics.rect(pixelX, pixelY, pixelWidth, pixelHeight);
      areaGraphics.stroke({ width: 2, color: 0xFFFFFF, alpha: 0.5 });

      this.farmGrid.addChild(areaGraphics);
    });
  }

  updateFarmData(farmData: FarmData): void {
    this.farmData = farmData;
    this.renderCrops();
  }

  private renderCrops(): void {
    if (!this.farmData) return;

    // Clear existing crop sprites
    this.cropContainer.removeChildren();

    // Render each crop
    this.farmData.crops.forEach(crop => {
      this.renderCrop(crop);
    });
  }

  private renderCrop(crop: CropData): void {
    const sprite = this.spriteManager.getCropSprite(crop.type, crop.growthStage);
    if (!sprite) return;

    // Position crop on grid (for now, use a simple layout)
    const gridPos = this.getCropGridPosition(crop.id);
    sprite.x = gridPos.x * this.config.tileSize + this.config.tileSize / 2;
    sprite.y = gridPos.y * this.config.tileSize + this.config.tileSize / 2;

    // Center the sprite
    sprite.anchor.set(0.5);

    // Scale for pixel art
    sprite.scale.set(1);

    // Add health indicator
    if (crop.health < 0.7) {
      const healthIndicator = this.createHealthIndicator(crop.health);
      healthIndicator.x = sprite.x + 12;
      healthIndicator.y = sprite.y - 12;
      this.cropContainer.addChild(healthIndicator);
    }

    this.cropContainer.addChild(sprite);
  }

  private getCropGridPosition(cropId: string): { x: number; y: number } {
    // Simple hash-based positioning for demo
    // In a real implementation, this would be stored in the crop data
    const hash = cropId.split('').reduce((a, b) => {
      a = ((a << 5) - a) + b.charCodeAt(0);
      return a & a;
    }, 0);
    
    const x = 5 + (Math.abs(hash) % 20);
    const y = 5 + (Math.abs(hash >> 8) % 20);
    
    return { x, y };
  }

  private createHealthIndicator(health: number): PIXI.Graphics {
    const indicator = new PIXI.Graphics();
    const color = health > 0.5 ? 0xFFFF00 : 0xFF0000; // Yellow or red
    
    indicator.circle(0, 0, 3);
    indicator.fill(color);
    indicator.stroke({ width: 1, color: 0x000000 });
    
    return indicator;
  }

  handleClick(x: number, y: number): void {
    // Convert screen coordinates to grid coordinates
    const gridX = Math.floor(x / this.config.tileSize);
    const gridY = Math.floor(y / this.config.tileSize);

    console.log(`Farm clicked at grid position: ${gridX}, ${gridY}`);
    
    // Check if click is on a crop area
    if (this.isCropArea(gridX, gridY)) {
      // Emit event for crop interaction
      this.onCropAreaClick(gridX, gridY);
    }
  }

  private onCropAreaClick(gridX: number, gridY: number): void {
    // This would typically emit an event to the game logic
    console.log(`Crop area clicked at: ${gridX}, ${gridY}`);
  }

  render(): void {
    // Any per-frame rendering updates would go here
    // For now, crops are static until farm data changes
  }

  getGridConfig(): FarmGridConfig {
    return { ...this.config };
  }

  setGridConfig(config: Partial<FarmGridConfig>): void {
    this.config = { ...this.config, ...config };
    // Rebuild grid if necessary
    this.farmGrid.removeChildren();
    this.initializeFarmGrid();
  }
}