/**
 * Tests for PixiJS Game Engine
 * Validates core rendering functionality and configuration
 */

import { PixiGameEngine } from '../PixiGameEngine';
import type { PixiGameEngineConfig } from '../PixiGameEngine';

// Mock PixiJS for testing
jest.mock('pixi.js', () => ({
  Application: jest.fn().mockImplementation(() => ({
    init: jest.fn().mockResolvedValue(undefined),
    stage: {
      addChild: jest.fn(),
      removeChild: jest.fn(),
    },
    renderer: {
      resize: jest.fn(),
    },
    destroy: jest.fn(),
  })),
  Container: jest.fn().mockImplementation(() => ({
    addChild: jest.fn(),
    removeChild: jest.fn(),
    removeChildren: jest.fn(),
    scale: { set: jest.fn() },
    position: { set: jest.fn() },
    eventMode: '',
    hitArea: null,
    on: jest.fn(),
  })),
  Graphics: jest.fn().mockImplementation(() => ({
    rect: jest.fn().mockReturnThis(),
    fill: jest.fn().mockReturnThis(),
    stroke: jest.fn().mockReturnThis(),
    circle: jest.fn().mockReturnThis(),
  })),
  Sprite: jest.fn().mockImplementation(() => ({
    anchor: { set: jest.fn() },
    scale: { set: jest.fn() },
    x: 0,
    y: 0,
  })),
  Texture: {
    from: jest.fn().mockReturnValue({}),
  },
  Rectangle: jest.fn(),
  SCALE_MODES: {
    NEAREST: 'nearest',
  },
  Assets: {
    load: jest.fn().mockResolvedValue({}),
  },
}));

describe('PixiGameEngine', () => {
  let engine: PixiGameEngine;
  let mockCanvas: HTMLCanvasElement;
  let config: PixiGameEngineConfig;

  beforeEach(() => {
    // Create mock canvas
    mockCanvas = document.createElement('canvas');
    
    // Default configuration
    config = {
      width: 800,
      height: 600,
      backgroundColor: 0x87CEEB,
      antialias: false,
      resolution: 1,
      enableCRTShader: false, // Disabled for tests
      enableAnimations: false, // Disabled for tests
    };

    engine = new PixiGameEngine(config);
  });

  afterEach(() => {
    if (engine) {
      engine.destroy();
    }
  });

  describe('initialization', () => {
    it('should create engine with correct configuration', () => {
      expect(engine).toBeDefined();
      expect(engine.getApp()).toBeDefined();
    });

    it('should initialize successfully with canvas', async () => {
      await expect(engine.initialize(mockCanvas)).resolves.not.toThrow();
    });

    it('should not initialize twice', async () => {
      await engine.initialize(mockCanvas);
      await expect(engine.initialize(mockCanvas)).resolves.not.toThrow();
    });
  });

  describe('farm rendering', () => {
    beforeEach(async () => {
      await engine.initialize(mockCanvas);
    });

    it('should update farm data without errors', () => {
      const mockFarmData = {
        money: 1000,
        day: 1,
        season: 'Kharif' as const,
        year: 1,
        landArea: 100,
        soilQuality: 0.8,
        crops: [
          {
            id: 'crop1',
            type: 'wheat',
            plantedDate: 1,
            growthStage: 'seedling' as const,
            health: 1.0,
            expectedYield: 100,
            area: 10,
          },
        ],
        storedCrops: [],
        livestock: [],
        equipment: [],
        storageCapacity: {
          farm: 1000,
          warehouse: 5000,
          cold_storage: 2000
        }
      };

      expect(() => engine.updateFarm(mockFarmData)).not.toThrow();
    });

    it('should handle empty farm data', () => {
      const emptyFarmData = {
        money: 0,
        day: 1,
        season: 'Kharif' as const,
        year: 1,
        landArea: 0,
        soilQuality: 0,
        crops: [],
        storedCrops: [],
        livestock: [],
        equipment: [],
        storageCapacity: {
          farm: 1000,
          warehouse: 5000,
          cold_storage: 2000
        }
      };

      expect(() => engine.updateFarm(emptyFarmData)).not.toThrow();
    });
  });

  describe('input handling', () => {
    beforeEach(async () => {
      await engine.initialize(mockCanvas);
    });

    it('should handle camera movement input', () => {
      expect(() => {
        engine.handleInput('camera_move', { deltaX: 10, deltaY: 20 });
      }).not.toThrow();
    });

    it('should handle camera zoom input', () => {
      expect(() => {
        engine.handleInput('camera_zoom', { 
          factor: 1.1, 
          centerX: 400, 
          centerY: 300 
        });
      }).not.toThrow();
    });

    it('should handle farm click input', () => {
      expect(() => {
        engine.handleInput('farm_click', { x: 100, y: 150 });
      }).not.toThrow();
    });

    it('should handle unknown input types gracefully', () => {
      expect(() => {
        engine.handleInput('unknown_input', { data: 'test' });
      }).not.toThrow();
    });
  });

  describe('rendering', () => {
    beforeEach(async () => {
      await engine.initialize(mockCanvas);
    });

    it('should render without errors', () => {
      expect(() => engine.render()).not.toThrow();
    });

    it('should handle render before initialization', () => {
      const uninitializedEngine = new PixiGameEngine(config);
      expect(() => uninitializedEngine.render()).not.toThrow();
    });
  });

  describe('resize handling', () => {
    beforeEach(async () => {
      await engine.initialize(mockCanvas);
    });

    it('should resize successfully', () => {
      expect(() => engine.resize(1024, 768)).not.toThrow();
    });

    it('should handle resize before initialization', () => {
      const uninitializedEngine = new PixiGameEngine(config);
      expect(() => uninitializedEngine.resize(800, 600)).not.toThrow();
    });
  });

  describe('cleanup', () => {
    it('should destroy engine cleanly', async () => {
      await engine.initialize(mockCanvas);
      expect(() => engine.destroy()).not.toThrow();
    });

    it('should handle destroy before initialization', () => {
      expect(() => engine.destroy()).not.toThrow();
    });
  });
});