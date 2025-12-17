/**
 * Time Management Service
 * Handles game time progression, season transitions, and event scheduling
 */

import { store } from '../store';
import { advanceDay, scheduleEvent, completeSeasonTransition, addTransitionEffect } from '../store/slices/seasonSlice';
import { advanceDay as advanceFarmDay, setSeason as setFarmSeason, setYear, updateCropHealth, updateCropYield, updateCropGrowthStage } from '../store/slices/farmSlice';
import { cropManager } from './cropManager';
import type { SeasonType, ScheduledEvent } from '../../../shared/types/game-state';

export class TimeManager {
  private gameLoopInterval: any = null;
  private isRunning = false;
  private gameSpeed = 1000; // milliseconds per game day (default 1 second = 1 day)

  constructor() {
    this.setupEventListeners();
  }

  /**
   * Start the game time progression
   */
  startGameLoop(speed: number = 1000): void {
    if (this.isRunning) {
      this.stopGameLoop();
    }

    this.gameSpeed = speed;
    this.isRunning = true;

    this.gameLoopInterval = setInterval(async () => {
      await this.advanceGameTime();
    }, this.gameSpeed);
  }

  /**
   * Stop the game time progression
   */
  stopGameLoop(): void {
    if (this.gameLoopInterval) {
      clearInterval(this.gameLoopInterval);
      this.gameLoopInterval = null;
    }
    this.isRunning = false;
  }

  /**
   * Manually advance game time by one day
   */
  async advanceGameTime(): Promise<void> {
    const state = store.getState();
    const currentSeason = state.season.current;
    const currentYear = state.farm.year;

    // Advance season day
    store.dispatch(advanceDay());

    // Advance farm day (keep in sync)
    store.dispatch(advanceFarmDay());

    // Check if season transitioned
    const newState = store.getState();
    if (newState.season.current !== currentSeason) {
      this.handleSeasonTransition(currentSeason, newState.season.current, currentYear);
    }

    // Update crop growth and health
    await this.updateCrops();

    // Process any events that were triggered
    this.processScheduledEvents();
  }

  /**
   * Handle season transition effects
   */
  private handleSeasonTransition(previousSeason: SeasonType, newSeason: SeasonType, currentYear: number): void {
    // Update farm season
    store.dispatch(setFarmSeason(newSeason));

    // If we've completed a full cycle (Off-season -> Kharif), advance year
    if (previousSeason === 'Off-season' && newSeason === 'Kharif') {
      store.dispatch(setYear(currentYear + 1));
    }

    // Add transition effects based on season change
    this.addSeasonTransitionEffects(previousSeason, newSeason);

    // Schedule automatic events for the new season
    this.scheduleSeasonEvents(newSeason);

    // Complete transition after effects are processed
    setTimeout(() => {
      store.dispatch(completeSeasonTransition());
    }, 100);
  }

  /**
   * Add appropriate transition effects based on season change
   */
  private addSeasonTransitionEffects(from: SeasonType, to: SeasonType): void {
    const transitionEffects = this.getSeasonTransitionEffects(from, to);

    transitionEffects.cropImpacts.forEach(effect => {
      store.dispatch(addTransitionEffect({ category: 'cropImpacts', effect }));
    });

    transitionEffects.weatherChanges.forEach(effect => {
      store.dispatch(addTransitionEffect({ category: 'weatherChanges', effect }));
    });

    transitionEffects.marketShifts.forEach(effect => {
      store.dispatch(addTransitionEffect({ category: 'marketShifts', effect }));
    });
  }

  /**
   * Get transition effects for season changes
   */
  private getSeasonTransitionEffects(from: SeasonType, to: SeasonType): {
    cropImpacts: string[];
    weatherChanges: string[];
    marketShifts: string[];
  } {
    const effects = {
      cropImpacts: [] as string[],
      weatherChanges: [] as string[],
      marketShifts: [] as string[],
    };

    // Define transition effects based on season changes
    const transitionMap: Record<string, typeof effects> = {
      'Off-season->Kharif': {
        cropImpacts: ['Kharif crops can now be planted', 'Monsoon-dependent crops become viable'],
        weatherChanges: ['Monsoon season begins', 'Increased rainfall expected', 'Higher humidity levels'],
        marketShifts: ['Kharif crop prices may rise due to planting demand', 'Fertilizer demand increases'],
      },
      'Kharif->Rabi': {
        cropImpacts: ['Harvest Kharif crops before they spoil', 'Rabi crops can now be planted'],
        weatherChanges: ['Monsoon season ends', 'Cooler temperatures begin', 'Reduced rainfall'],
        marketShifts: ['Kharif crop supply increases, prices may drop', 'Winter crop demand rises'],
      },
      'Rabi->Zaid': {
        cropImpacts: ['Harvest Rabi crops', 'Limited Zaid crops available', 'Irrigation becomes critical'],
        weatherChanges: ['Summer heat begins', 'Very low rainfall', 'High temperatures'],
        marketShifts: ['Rabi crop supply peaks', 'Summer crop prices premium due to scarcity'],
      },
      'Zaid->Off-season': {
        cropImpacts: ['Harvest remaining Zaid crops', 'Prepare land for next cycle', 'Equipment maintenance time'],
        weatherChanges: ['Extreme heat continues', 'Pre-monsoon conditions', 'Dust storms possible'],
        marketShifts: ['Summer crop supply limited', 'Planning for next Kharif season'],
      },
    };

    const key = `${from}->${to}`;
    return transitionMap[key] || effects;
  }

  /**
   * Schedule automatic events for a new season
   */
  private scheduleSeasonEvents(season: SeasonType): void {
    const seasonEvents = this.getSeasonEvents(season);
    
    seasonEvents.forEach(event => {
      store.dispatch(scheduleEvent(event));
    });
  }

  /**
   * Get default events for each season
   */
  private getSeasonEvents(season: SeasonType): Omit<ScheduledEvent, 'completed'>[] {
    const events: Record<SeasonType, Omit<ScheduledEvent, 'completed'>[]> = {
      'Kharif': [
        {
          id: `kharif-planting-reminder-${Date.now()}`,
          type: 'crop_growth',
          scheduledDay: 10,
          scheduledSeason: 'Kharif',
          data: { message: 'Optimal time for Kharif crop planting', crops: ['Rice', 'Cotton', 'Sugarcane'] },
          recurring: false,
        },
        {
          id: `monsoon-update-${Date.now()}`,
          type: 'weather_change',
          scheduledDay: 30,
          scheduledSeason: 'Kharif',
          data: { message: 'Monsoon strength assessment', type: 'monsoon_update' },
          recurring: false,
        },
        {
          id: `kharif-market-update-${Date.now()}`,
          type: 'market_update',
          scheduledDay: 60,
          scheduledSeason: 'Kharif',
          data: { message: 'Mid-season market price update', crops: ['Rice', 'Cotton'] },
          recurring: false,
        },
      ],
      'Rabi': [
        {
          id: `rabi-planting-reminder-${Date.now()}`,
          type: 'crop_growth',
          scheduledDay: 15,
          scheduledSeason: 'Rabi',
          data: { message: 'Optimal time for Rabi crop planting', crops: ['Wheat', 'Barley', 'Peas'] },
          recurring: false,
        },
        {
          id: `winter-weather-${Date.now()}`,
          type: 'weather_change',
          scheduledDay: 45,
          scheduledSeason: 'Rabi',
          data: { message: 'Winter weather pattern established', type: 'winter_conditions' },
          recurring: false,
        },
      ],
      'Zaid': [
        {
          id: `zaid-irrigation-reminder-${Date.now()}`,
          type: 'crop_growth',
          scheduledDay: 5,
          scheduledSeason: 'Zaid',
          data: { message: 'Irrigation critical for Zaid crops', crops: ['Watermelon', 'Cucumber'] },
          recurring: false,
        },
        {
          id: `summer-heat-warning-${Date.now()}`,
          type: 'weather_change',
          scheduledDay: 30,
          scheduledSeason: 'Zaid',
          data: { message: 'Peak summer heat warning', type: 'heat_wave' },
          recurring: false,
        },
      ],
      'Off-season': [
        {
          id: `planning-reminder-${Date.now()}`,
          type: 'crop_growth',
          scheduledDay: 30,
          scheduledSeason: 'Off-season',
          data: { message: 'Plan for next Kharif season', type: 'planning_phase' },
          recurring: false,
        },
        {
          id: `equipment-maintenance-${Date.now()}`,
          type: 'crop_growth',
          scheduledDay: 60,
          scheduledSeason: 'Off-season',
          data: { message: 'Equipment maintenance recommended', type: 'maintenance' },
          recurring: false,
        },
        {
          id: `government-scheme-update-${Date.now()}`,
          type: 'government_scheme',
          scheduledDay: 90,
          scheduledSeason: 'Off-season',
          data: { message: 'New government schemes available', type: 'scheme_update' },
          recurring: false,
        },
      ],
    };

    return events[season] || [];
  }

  /**
   * Update all crops for daily progression
   */
  private async updateCrops(): Promise<void> {
    const state = store.getState();
    const currentDay = state.farm.day;
    const currentWeather = state.weather.current;
    const soilQuality = state.farm.soilQuality;

    // Update each crop
    for (const crop of state.farm.crops) {
      const growthUpdate = await cropManager.updateCropGrowth(
        crop,
        currentDay,
        currentWeather,
        soilQuality
      );

      // Dispatch updates to store
      store.dispatch(updateCropGrowthStage({ id: crop.id, stage: growthUpdate.newStage }));
      store.dispatch(updateCropHealth({ id: crop.id, healthChange: growthUpdate.healthChange }));
      store.dispatch(updateCropYield({ id: crop.id, yieldChange: growthUpdate.yieldChange }));

      // Generate pest/disease events
      const pestEvent = cropManager.generatePestDiseaseEvent(crop, currentDay);
      if (pestEvent) {
        // In a full implementation, this would dispatch an action to add the event to the store
        console.log(`Pest/Disease event generated for crop ${crop.id}: ${pestEvent.name}`);
      }
    }

    // Clean up expired pest/disease events
    cropManager.cleanupExpiredEvents(currentDay);
  }

  /**
   * Process scheduled events that have been triggered
   */
  private processScheduledEvents(): void {
    const state = store.getState();
    const currentSeason = state.season.current;
    const currentDay = state.season.day;

    // Find events that should be processed
    const eventsToProcess = state.season.scheduledEvents?.filter(
      event => event.scheduledDay === currentDay && 
               event.scheduledSeason === currentSeason && 
               event.completed
    ) || [];

    // Process each event (in a real implementation, this would trigger appropriate actions)
    eventsToProcess.forEach(event => {
      this.processEvent(event);
    });
  }

  /**
   * Process a specific event
   */
  private processEvent(event: ScheduledEvent): void {
    // This would be expanded to handle different event types
    console.log(`Processing event: ${event.type} - ${event.data.message}`);
    
    // Dispatch appropriate actions based on event type
    switch (event.type) {
      case 'crop_growth':
        // Handle crop-related events
        break;
      case 'weather_change':
        // Handle weather-related events
        break;
      case 'market_update':
        // Handle market-related events
        break;
      case 'npc_event':
        // Handle NPC-related events
        break;
      case 'government_scheme':
        // Handle government scheme events
        break;
    }
  }

  /**
   * Set up event listeners for season changes
   */
  private setupEventListeners(): void {
    // This would set up listeners for Redux state changes
    // For now, we'll handle this through the game loop
  }

  /**
   * Get current game speed
   */
  getGameSpeed(): number {
    return this.gameSpeed;
  }

  /**
   * Set game speed (milliseconds per day)
   */
  setGameSpeed(speed: number): void {
    this.gameSpeed = Math.max(100, speed); // Minimum 100ms per day
    
    if (this.isRunning) {
      this.stopGameLoop();
      this.startGameLoop(this.gameSpeed);
    }
  }

  /**
   * Check if game loop is running
   */
  isGameRunning(): boolean {
    return this.isRunning;
  }

  /**
   * Schedule a custom event
   */
  scheduleCustomEvent(event: Omit<ScheduledEvent, 'completed'>): void {
    store.dispatch(scheduleEvent(event));
  }

  /**
   * Get season information
   */
  getSeasonInfo(season?: SeasonType) {
    const targetSeason = season || store.getState().season.current;
    
    const seasonInfo = {
      'Kharif': {
        name: 'Kharif',
        description: 'Monsoon season (June-October)',
        duration: 120,
        crops: ['Rice', 'Cotton', 'Sugarcane', 'Maize'],
        characteristics: ['Heavy rainfall', 'High humidity', 'Warm temperatures'],
        challenges: ['Flood risk', 'Pest outbreaks', 'Waterlogging'],
      },
      'Rabi': {
        name: 'Rabi',
        description: 'Winter season (November-March)',
        duration: 120,
        crops: ['Wheat', 'Barley', 'Peas', 'Gram'],
        characteristics: ['Cool temperatures', 'Low rainfall', 'Clear skies'],
        challenges: ['Irrigation needs', 'Frost risk', 'Market timing'],
      },
      'Zaid': {
        name: 'Zaid',
        description: 'Summer season (April-June)',
        duration: 120,
        crops: ['Watermelon', 'Cucumber', 'Fodder crops'],
        characteristics: ['Hot temperatures', 'Irrigation dependent', 'Limited crops'],
        challenges: ['Water scarcity', 'Heat stress', 'High input costs'],
      },
      'Off-season': {
        name: 'Off-season',
        description: 'Preparation and planning period',
        duration: 120,
        crops: ['Soil preparation', 'Equipment maintenance'],
        characteristics: ['Planning phase', 'Market analysis', 'Preparation activities'],
        challenges: ['Income gap', 'Planning decisions', 'Resource allocation'],
      },
    };

    return seasonInfo[targetSeason];
  }
}

// Export singleton instance
export const timeManager = new TimeManager();