import * as PIXI from 'pixi.js';
import type { GrowthStage } from '../../../shared/types/game-state';

export interface SpriteAssets {
  crops: Record<string, Record<GrowthStage, string>>;
  characters: Record<string, string>;
  ui: Record<string, string>;
  effects: Record<string, string>;
}

export class SpriteManager {
  private textures: Map<string, PIXI.Texture> = new Map();
  private spriteSheets: Map<string, PIXI.Spritesheet> = new Map();
  private isInitialized: boolean = false;

  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    try {
      // Load placeholder textures for now
      await this.loadPlaceholderTextures();
      this.isInitialized = true;
    } catch (error) {
      console.error('Failed to initialize SpriteManager:', error);
      // Create fallback textures
      this.createFallbackTextures();
      this.isInitialized = true;
    }
  }

  private async loadPlaceholderTextures(): Promise<void> {
    // For now, create programmatic textures
    // In a real implementation, these would be loaded from sprite sheets
    this.createCropTextures();
    this.createCharacterTextures();
    this.createUITextures();
  }

  private createCropTextures(): void {
    const cropTypes = ['wheat', 'rice', 'cotton', 'sugarcane', 'tomato'];
    const growthStages: GrowthStage[] = ['seedling', 'vegetative', 'flowering', 'mature', 'harvestable'];

    cropTypes.forEach(cropType => {
      growthStages.forEach((stage, index) => {
        const texture = this.createCropTexture(cropType, stage, index);
        const key = `crop_${cropType}_${stage}`;
        this.textures.set(key, texture);
      });
    });
  }

  private createCropTexture(cropType: string, stage: GrowthStage, stageIndex: number): PIXI.Texture {
    const canvas = document.createElement('canvas');
    canvas.width = 32;
    canvas.height = 32;
    const ctx = canvas.getContext('2d')!;

    // Create pixel art style crop sprites with better detail
    ctx.imageSmoothingEnabled = false;
    
    // Enhanced color palettes for different crops
    const cropPalettes: Record<string, { base: string; accent: string; stem: string; flower?: string }> = {
      wheat: { base: '#DAA520', accent: '#B8860B', stem: '#228B22', flower: '#F0E68C' },
      rice: { base: '#90EE90', accent: '#7CFC00', stem: '#006400', flower: '#FFFACD' },
      cotton: { base: '#F5F5DC', accent: '#FFFFFF', stem: '#228B22', flower: '#FFB6C1' },
      sugarcane: { base: '#98FB98', accent: '#7CFC00', stem: '#006400' },
      tomato: { base: '#FF6347', accent: '#DC143C', stem: '#228B22', flower: '#FFFF00' },
    };

    const palette = cropPalettes[cropType] || cropPalettes.rice;
    
    // Draw detailed pixel art crops based on growth stage
    switch (stage) {
      case 'seedling':
        this.drawSeedling(ctx, palette);
        break;
      case 'vegetative':
        this.drawVegetative(ctx, palette, stageIndex);
        break;
      case 'flowering':
        this.drawFlowering(ctx, palette, cropType);
        break;
      case 'mature':
        this.drawMature(ctx, palette, cropType);
        break;
      case 'harvestable':
        this.drawHarvestable(ctx, palette, cropType);
        break;
    }

    // Set texture scale mode for pixel art
    const texture = PIXI.Texture.from(canvas);
    texture.source.scaleMode = 'nearest';
    return texture;
  }

  private drawSeedling(ctx: CanvasRenderingContext2D, palette: any): void {
    // Soil base
    ctx.fillStyle = '#8B4513';
    ctx.fillRect(8, 24, 16, 8);
    
    // Small green sprout
    ctx.fillStyle = palette.stem;
    ctx.fillRect(14, 20, 4, 8);
    ctx.fillRect(12, 18, 2, 4);
    ctx.fillRect(18, 18, 2, 4);
    
    // Tiny leaves
    ctx.fillStyle = palette.base;
    ctx.fillRect(13, 19, 1, 2);
    ctx.fillRect(18, 19, 1, 2);
  }

  private drawVegetative(ctx: CanvasRenderingContext2D, palette: any, stageIndex: number): void {
    // Soil base
    ctx.fillStyle = '#8B4513';
    ctx.fillRect(6, 26, 20, 6);
    
    // Main stem
    ctx.fillStyle = palette.stem;
    ctx.fillRect(14, 12, 4, 16);
    
    // Growing leaves
    const leafSize = 2 + stageIndex;
    ctx.fillStyle = palette.base;
    ctx.fillRect(10, 14, leafSize, 6);
    ctx.fillRect(18, 14, leafSize, 6);
    ctx.fillRect(12, 10, leafSize, 4);
    ctx.fillRect(16, 10, leafSize, 4);
    
    // Accent details
    ctx.fillStyle = palette.accent;
    ctx.fillRect(11, 15, 1, 2);
    ctx.fillRect(19, 15, 1, 2);
  }

  private drawFlowering(ctx: CanvasRenderingContext2D, palette: any, cropType: string): void {
    // Soil base
    ctx.fillStyle = '#8B4513';
    ctx.fillRect(4, 26, 24, 6);
    
    // Main stem
    ctx.fillStyle = palette.stem;
    ctx.fillRect(14, 8, 4, 20);
    
    // Full leaves
    ctx.fillStyle = palette.base;
    ctx.fillRect(8, 12, 6, 8);
    ctx.fillRect(18, 12, 6, 8);
    ctx.fillRect(10, 8, 4, 6);
    ctx.fillRect(18, 8, 4, 6);
    
    // Flowers based on crop type
    if (palette.flower) {
      ctx.fillStyle = palette.flower;
      if (cropType === 'tomato') {
        // Yellow tomato flowers
        ctx.fillRect(12, 6, 2, 2);
        ctx.fillRect(18, 6, 2, 2);
        ctx.fillRect(15, 4, 2, 2);
      } else if (cropType === 'cotton') {
        // Pink cotton flowers
        ctx.fillRect(11, 5, 3, 3);
        ctx.fillRect(18, 5, 3, 3);
      } else {
        // Generic small flowers
        ctx.fillRect(13, 6, 2, 2);
        ctx.fillRect(17, 6, 2, 2);
      }
    }
  }

  private drawMature(ctx: CanvasRenderingContext2D, palette: any, cropType: string): void {
    // Soil base
    ctx.fillStyle = '#8B4513';
    ctx.fillRect(2, 26, 28, 6);
    
    // Main stem
    ctx.fillStyle = palette.stem;
    ctx.fillRect(14, 6, 4, 22);
    
    // Full mature plant
    ctx.fillStyle = palette.base;
    ctx.fillRect(6, 10, 8, 12);
    ctx.fillRect(18, 10, 8, 12);
    ctx.fillRect(8, 6, 6, 8);
    ctx.fillRect(18, 6, 6, 8);
    
    // Crop-specific mature features
    switch (cropType) {
      case 'wheat':
        // Wheat heads
        ctx.fillStyle = palette.accent;
        ctx.fillRect(10, 4, 3, 6);
        ctx.fillRect(19, 4, 3, 6);
        ctx.fillRect(14, 2, 4, 6);
        break;
      case 'rice':
        // Rice grains
        ctx.fillStyle = '#FFFACD';
        ctx.fillRect(9, 4, 2, 4);
        ctx.fillRect(21, 4, 2, 4);
        ctx.fillRect(15, 2, 2, 4);
        break;
      case 'tomato':
        // Green tomatoes
        ctx.fillStyle = '#32CD32';
        ctx.fillRect(11, 8, 4, 4);
        ctx.fillRect(17, 10, 4, 4);
        break;
    }
  }

  private drawHarvestable(ctx: CanvasRenderingContext2D, palette: any, cropType: string): void {
    // Draw mature plant first
    this.drawMature(ctx, palette, cropType);
    
    // Add harvest-ready indicators
    switch (cropType) {
      case 'wheat':
        // Golden wheat heads
        ctx.fillStyle = '#FFD700';
        ctx.fillRect(10, 4, 3, 6);
        ctx.fillRect(19, 4, 3, 6);
        ctx.fillRect(14, 2, 4, 6);
        break;
      case 'rice':
        // White rice grains
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(9, 4, 2, 4);
        ctx.fillRect(21, 4, 2, 4);
        ctx.fillRect(15, 2, 2, 4);
        break;
      case 'tomato':
        // Red ripe tomatoes
        ctx.fillStyle = '#FF6347';
        ctx.fillRect(11, 8, 4, 4);
        ctx.fillRect(17, 10, 4, 4);
        // Add shine
        ctx.fillStyle = '#FFA07A';
        ctx.fillRect(12, 9, 1, 1);
        ctx.fillRect(18, 11, 1, 1);
        break;
      case 'cotton':
        // White cotton bolls
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(10, 6, 4, 4);
        ctx.fillRect(18, 8, 4, 4);
        ctx.fillRect(14, 4, 4, 4);
        break;
      case 'sugarcane':
        // Tall sugarcane stalks
        ctx.fillStyle = palette.accent;
        ctx.fillRect(12, 2, 8, 4);
        break;
    }
    
    // Sparkle effect for harvestable crops
    ctx.fillStyle = '#FFFF00';
    ctx.fillRect(4, 8, 1, 1);
    ctx.fillRect(27, 12, 1, 1);
    ctx.fillRect(6, 4, 1, 1);
    ctx.fillRect(25, 6, 1, 1);
  }

  private createCharacterTextures(): void {
    const characters = ['farmer', 'merchant', 'official'];
    
    characters.forEach(character => {
      const texture = this.createCharacterTexture(character);
      this.textures.set(`character_${character}`, texture);
    });
  }

  private createCharacterTexture(character: string): PIXI.Texture {
    const canvas = document.createElement('canvas');
    canvas.width = 32;
    canvas.height = 32;
    const ctx = canvas.getContext('2d')!;

    ctx.imageSmoothingEnabled = false;

    // Enhanced character palettes
    const characterData: Record<string, {
      skin: string;
      clothes: string;
      accent: string;
      hair: string;
      accessory?: string;
    }> = {
      farmer: {
        skin: '#FDBCB4',
        clothes: '#8B4513',
        accent: '#654321',
        hair: '#4A4A4A',
        accessory: '#DAA520', // Straw hat
      },
      merchant: {
        skin: '#FDBCB4',
        clothes: '#4169E1',
        accent: '#1E3A8A',
        hair: '#2D2D2D',
        accessory: '#FFD700', // Gold buttons
      },
      official: {
        skin: '#FDBCB4',
        clothes: '#2F4F4F',
        accent: '#1C3333',
        hair: '#1A1A1A',
        accessory: '#C0C0C0', // Badge
      },
    };

    const charData = characterData[character] || characterData.farmer;

    // Draw detailed pixel art character
    this.drawCharacterBase(ctx, charData, character);

    const texture = PIXI.Texture.from(canvas);
    texture.source.scaleMode = 'nearest';
    return texture;
  }

  private drawCharacterBase(
    ctx: CanvasRenderingContext2D,
    charData: any,
    characterType: string
  ): void {
    // Hair/Hat
    ctx.fillStyle = charData.hair;
    if (characterType === 'farmer') {
      // Straw hat
      ctx.fillStyle = charData.accessory;
      ctx.fillRect(10, 6, 12, 4);
      ctx.fillRect(8, 8, 16, 2);
    } else {
      // Regular hair
      ctx.fillRect(11, 6, 10, 4);
    }

    // Head
    ctx.fillStyle = charData.skin;
    ctx.fillRect(12, 8, 8, 8);

    // Face details
    ctx.fillStyle = '#000000';
    ctx.fillRect(13, 10, 1, 1); // Left eye
    ctx.fillRect(17, 10, 1, 1); // Right eye
    ctx.fillRect(15, 12, 2, 1); // Mouth

    // Nose
    ctx.fillStyle = '#E6A8A0';
    ctx.fillRect(15, 11, 1, 1);

    // Body
    ctx.fillStyle = charData.clothes;
    ctx.fillRect(10, 16, 12, 10);

    // Body accent/details
    ctx.fillStyle = charData.accent;
    ctx.fillRect(10, 16, 12, 2); // Collar
    ctx.fillRect(14, 18, 4, 6); // Center stripe

    // Arms
    ctx.fillStyle = charData.clothes;
    ctx.fillRect(8, 18, 3, 6);
    ctx.fillRect(21, 18, 3, 6);

    // Hands
    ctx.fillStyle = charData.skin;
    ctx.fillRect(8, 24, 3, 2);
    ctx.fillRect(21, 24, 3, 2);

    // Legs
    ctx.fillStyle = charData.accent;
    ctx.fillRect(11, 26, 4, 6);
    ctx.fillRect(17, 26, 4, 6);

    // Feet
    ctx.fillStyle = '#654321';
    ctx.fillRect(10, 30, 5, 2);
    ctx.fillRect(17, 30, 5, 2);

    // Character-specific accessories
    switch (characterType) {
      case 'merchant':
        // Gold buttons
        ctx.fillStyle = charData.accessory;
        ctx.fillRect(15, 19, 1, 1);
        ctx.fillRect(15, 21, 1, 1);
        ctx.fillRect(15, 23, 1, 1);
        break;
      case 'official':
        // Badge
        ctx.fillStyle = charData.accessory;
        ctx.fillRect(12, 18, 2, 2);
        ctx.fillStyle = '#FFD700';
        ctx.fillRect(12, 18, 1, 1);
        break;
      case 'farmer':
        // Tool in hand
        ctx.fillStyle = '#8B4513';
        ctx.fillRect(6, 20, 2, 8);
        ctx.fillStyle = '#C0C0C0';
        ctx.fillRect(6, 20, 2, 2);
        break;
    }
  }

  private createUITextures(): void {
    const uiElements = ['button', 'panel', 'icon_money', 'icon_weather'];
    
    uiElements.forEach(element => {
      const texture = this.createUITexture(element);
      this.textures.set(`ui_${element}`, texture);
    });
  }

  private createUITexture(element: string): PIXI.Texture {
    const canvas = document.createElement('canvas');
    canvas.width = 32;
    canvas.height = 32;
    const ctx = canvas.getContext('2d')!;

    ctx.imageSmoothingEnabled = false;

    switch (element) {
      case 'button':
        ctx.fillStyle = '#4169E1';
        ctx.fillRect(0, 0, 32, 32);
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 2;
        ctx.strokeRect(0, 0, 32, 32);
        break;
      case 'panel':
        ctx.fillStyle = '#F5F5DC';
        ctx.fillRect(0, 0, 32, 32);
        ctx.strokeStyle = '#8B4513';
        ctx.lineWidth = 2;
        ctx.strokeRect(0, 0, 32, 32);
        break;
      case 'icon_money':
        ctx.fillStyle = '#FFD700';
        ctx.fillRect(8, 8, 16, 16);
        ctx.fillStyle = '#000000';
        ctx.fillRect(12, 12, 8, 8);
        break;
      case 'icon_weather':
        ctx.fillStyle = '#87CEEB';
        ctx.fillRect(4, 4, 24, 24);
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(8, 8, 16, 16);
        break;
    }

    return PIXI.Texture.from(canvas);
  }

  private createFallbackTextures(): void {
    // Create simple colored rectangles as fallback
    const canvas = document.createElement('canvas');
    canvas.width = 24;
    canvas.height = 24;
    const ctx = canvas.getContext('2d')!;
    
    ctx.fillStyle = '#90EE90';
    ctx.fillRect(0, 0, 24, 24);
    
    const fallbackTexture = PIXI.Texture.from(canvas);
    this.textures.set('fallback', fallbackTexture);
  }

  getCropSprite(cropType: string, growthStage: GrowthStage): PIXI.Sprite | null {
    const key = `crop_${cropType}_${growthStage}`;
    const texture = this.textures.get(key) || this.textures.get('fallback');
    
    if (!texture) {
      console.warn(`No texture found for crop: ${cropType} at stage: ${growthStage}`);
      return null;
    }

    return new PIXI.Sprite(texture);
  }

  getCharacterSprite(characterType: string): PIXI.Sprite | null {
    const key = `character_${characterType}`;
    const texture = this.textures.get(key) || this.textures.get('fallback');
    
    if (!texture) {
      console.warn(`No texture found for character: ${characterType}`);
      return null;
    }

    return new PIXI.Sprite(texture);
  }

  getUISprite(elementType: string): PIXI.Sprite | null {
    const key = `ui_${elementType}`;
    const texture = this.textures.get(key) || this.textures.get('fallback');
    
    if (!texture) {
      console.warn(`No texture found for UI element: ${elementType}`);
      return null;
    }

    return new PIXI.Sprite(texture);
  }

  getTexture(key: string): PIXI.Texture | null {
    return this.textures.get(key) || null;
  }

  async loadSpriteSheet(name: string, url: string): Promise<PIXI.Spritesheet | null> {
    try {
      const spritesheet = await PIXI.Assets.load(url);
      this.spriteSheets.set(name, spritesheet);
      return spritesheet;
    } catch (error) {
      console.error(`Failed to load spritesheet ${name}:`, error);
      return null;
    }
  }

  getSpriteSheet(name: string): PIXI.Spritesheet | null {
    return this.spriteSheets.get(name) || null;
  }

  isReady(): boolean {
    return this.isInitialized;
  }
}