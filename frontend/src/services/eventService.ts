/**
 * Event Service
 * Handles event generation, choice resolution, and consequence tracking
 */

import type { GameEvent, EventResolution, ResolvedConsequences, GameState, SeasonType } from '../../../shared/types/game-state';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://api.harvest-hope.com';

export interface EventGenerationRequest {
  gameState: Partial<GameState>;
  eventType?: string;
  urgency?: 'low' | 'medium' | 'high';
}

export interface EventResolutionRequest {
  event: GameEvent;
  choiceId: string;
  gameState: Partial<GameState>;
}

export class EventService {
  private static instance: EventService;
  private eventCache: Map<string, GameEvent> = new Map();
  private resolutionHistory: EventResolution[] = [];

  static getInstance(): EventService {
    if (!EventService.instance) {
      EventService.instance = new EventService();
    }
    return EventService.instance;
  }

  /**
   * Generate a new random event based on current game state
   */
  async generateEvent(request: EventGenerationRequest): Promise<GameEvent> {
    try {
      const response = await fetch(`${API_BASE_URL}/events/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'generate',
          gameState: request.gameState,
          eventType: request.eventType,
          urgency: request.urgency,
        }),
      });

      if (!response.ok) {
        throw new Error(`Event generation failed: ${response.statusText}`);
      }

      const data = await response.json();
      const event = data.event as GameEvent;

      // Set appropriate severity for extreme events
      if (event.type.includes('severe') || event.type.includes('emergency') || event.type.includes('crisis')) {
        event.severity = 'critical';
      } else if (event.type.includes('outbreak') || event.type.includes('failure')) {
        event.severity = 'high';
      }

      // Cache the event
      this.eventCache.set(event.id, event);

      return event;
    } catch (error) {
      console.error('Error generating event:', error);
      
      // Return a fallback event if API fails
      return this.getFallbackEvent(request.gameState);
    }
  }

  /**
   * Resolve an event choice and get consequences
   */
  async resolveEvent(request: EventResolutionRequest): Promise<ResolvedConsequences> {
    try {
      const response = await fetch(`${API_BASE_URL}/events/resolve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'resolve',
          event: request.event,
          choiceId: request.choiceId,
          gameState: request.gameState,
        }),
      });

      if (!response.ok) {
        throw new Error(`Event resolution failed: ${response.statusText}`);
      }

      const data = await response.json();
      const consequences = data.consequences as ResolvedConsequences;

      // Store resolution in history
      const resolution: EventResolution = {
        eventId: request.event.id,
        choiceId: request.choiceId,
        timestamp: new Date().toISOString(),
        consequences,
      };
      
      this.resolutionHistory.push(resolution);

      // Remove from cache
      this.eventCache.delete(request.event.id);

      return consequences;
    } catch (error) {
      console.error('Error resolving event:', error);
      
      // Return fallback consequences
      return this.getFallbackConsequences(request.event, request.choiceId);
    }
  }

  /**
   * Get all active events from cache
   */
  getActiveEvents(): GameEvent[] {
    const now = new Date();
    const activeEvents: GameEvent[] = [];

    for (const [id, event] of this.eventCache.entries()) {
      const expiresAt = new Date(event.expires_at);
      if (expiresAt > now) {
        activeEvents.push(event);
      } else {
        // Remove expired events
        this.eventCache.delete(id);
      }
    }

    return activeEvents;
  }

  /**
   * Get event resolution history
   */
  getEventHistory(): EventResolution[] {
    return [...this.resolutionHistory];
  }

  /**
   * Check if a choice is available based on requirements
   */
  isChoiceAvailable(event: GameEvent, choiceId: string, gameState: Partial<GameState>): boolean {
    const choice = event.choices.find(c => c.id === choiceId);
    if (!choice || !choice.requirements) {
      return true;
    }

    return choice.requirements.every(req => {
      switch (req.type) {
        case 'money':
          const money = gameState.farm?.money || 0;
          return this.checkRequirement(money, req.value as number, req.operator);
        
        case 'crop':
          const crops = gameState.farm?.crops || [];
          return crops.length > 0; // Simplified check
        
        case 'equipment':
          const equipment = gameState.farm?.equipment || [];
          return equipment.some(eq => eq.type === req.value);
        
        default:
          return true;
      }
    });
  }

  /**
   * Apply event consequences to game state
   */
  applyConsequences(consequences: ResolvedConsequences, gameState: GameState): GameState {
    const newState = { ...gameState };

    // Apply immediate financial effects
    if (consequences.immediate_effects.money_change) {
      newState.farm.money += consequences.immediate_effects.money_change;
    }

    if (consequences.immediate_effects.debt_increase) {
      // Add to economics debt (simplified)
      newState.economics.bankAccount -= consequences.immediate_effects.debt_increase;
    }

    // Apply crop yield changes
    if (consequences.immediate_effects.yield_change) {
      newState.farm.crops.forEach(crop => {
        crop.expectedYield *= (1 + consequences.immediate_effects.yield_change! / 100);
      });
    }

    // Apply extreme weather crop damage
    if (consequences.immediate_effects.crop_damage) {
      const damagePercent = consequences.immediate_effects.crop_damage / 100;
      newState.farm.crops.forEach(crop => {
        crop.health = Math.max(0, crop.health - (damagePercent * 100));
        crop.expectedYield *= (1 - damagePercent);
      });
    }

    // Apply crop survival rates (for drought/flood events)
    if (consequences.immediate_effects.survival_rate) {
      const survivalRate = consequences.immediate_effects.survival_rate / 100;
      newState.farm.crops.forEach(crop => {
        crop.expectedYield *= survivalRate;
        crop.health = Math.max(20, crop.health * survivalRate);
      });
    }

    // Apply pest control effects
    if (consequences.immediate_effects.pest_reduction) {
      const pestReduction = consequences.immediate_effects.pest_reduction / 100;
      newState.farm.crops.forEach(crop => {
        // Improve crop health based on pest control effectiveness
        crop.health = Math.min(100, crop.health + (pestReduction * 30));
      });
    }

    // Apply equipment status changes
    if (consequences.immediate_effects.equipment_status) {
      const equipmentHealth = consequences.immediate_effects.equipment_status / 100;
      newState.farm.equipment.forEach(equipment => {
        equipment.condition = Math.min(100, equipment.condition * equipmentHealth);
      });
    }

    // Apply safety and stress effects (stored in stats for tracking)
    if (consequences.immediate_effects.safety_level || consequences.immediate_effects.stress_change) {
      // These would be tracked in a more detailed health/wellbeing system
      // For now, we'll add them to the educational progress as experience
    }

    // Apply long-term effects to farm infrastructure
    if (consequences.long_term_effects.water_improvement) {
      // This would improve future drought resistance
      // Could be stored as a farm upgrade or modifier
    }

    if (consequences.long_term_effects.disaster_preparedness) {
      // This would reduce future extreme weather damage
      // Could be stored as a farm resilience score
    }

    if (consequences.long_term_effects.environmental_damage) {
      // This would affect soil quality over time
      const environmentalImpact = consequences.long_term_effects.environmental_damage / 100;
      newState.farm.soilQuality = Math.max(0, newState.farm.soilQuality + environmentalImpact);
    }

    // Update educational progress
    const topic = consequences.educational_impact.topic;
    if (!newState.events.educationalProgress[topic]) {
      newState.events.educationalProgress[topic] = {
        eventsExperienced: 0,
        lessonsLearned: [],
        masteryLevel: 0,
      };
    }

    newState.events.educationalProgress[topic].eventsExperienced += 1;
    if (!newState.events.educationalProgress[topic].lessonsLearned.includes(consequences.educational_impact.lesson_learned)) {
      newState.events.educationalProgress[topic].lessonsLearned.push(consequences.educational_impact.lesson_learned);
    }

    // Calculate mastery level based on events experienced
    const progress = newState.events.educationalProgress[topic];
    progress.masteryLevel = Math.min(100, progress.eventsExperienced * 10 + progress.lessonsLearned.length * 5);

    // Bonus mastery for crisis events (more impactful learning)
    if (consequences.educational_impact.crisis_experience) {
      progress.masteryLevel = Math.min(100, progress.masteryLevel + 15);
    }

    return newState;
  }

  /**
   * Get educational insights based on event history
   */
  getEducationalInsights(): { topic: string; insights: string[]; masteryLevel: number }[] {
    const insights: { [topic: string]: { insights: Set<string>; masteryLevel: number } } = {};

    this.resolutionHistory.forEach(resolution => {
      const topic = resolution.consequences.educational_impact.topic;
      const lesson = resolution.consequences.educational_impact.lesson_learned;

      if (!insights[topic]) {
        insights[topic] = { insights: new Set(), masteryLevel: 0 };
      }

      insights[topic].insights.add(lesson);
      insights[topic].masteryLevel += 10;
    });

    return Object.entries(insights).map(([topic, data]) => ({
      topic,
      insights: Array.from(data.insights),
      masteryLevel: Math.min(100, data.masteryLevel),
    }));
  }

  /**
   * Clear event cache and history (for testing)
   */
  clearCache(): void {
    this.eventCache.clear();
    this.resolutionHistory = [];
  }

  // Private helper methods

  private checkRequirement(value: number, required: number, operator: string): boolean {
    switch (operator) {
      case 'gte': return value >= required;
      case 'lte': return value <= required;
      case 'eq': return value === required;
      default: return true;
    }
  }

  private getFallbackEvent(gameState: Partial<GameState>): GameEvent {
    const money = gameState.farm?.money || 50000;
    const season = gameState.season?.current || 'Kharif';
    const day = gameState.season?.day || 1;
    const droughtRisk = gameState.weather?.monsoonPrediction?.droughtRisk || 0;
    const floodRisk = gameState.weather?.monsoonPrediction?.floodRisk || 0;

    // Generate appropriate fallback based on conditions
    if (money < 15000) {
      return this.getEmergencyFallbackEvent(season);
    } else if (droughtRisk > 0.5) {
      return this.getDroughtFallbackEvent(season);
    } else if (floodRisk > 0.4) {
      return this.getFloodFallbackEvent(season);
    } else if (day > 30 && day < 90 && season === 'Kharif') {
      return this.getPestFallbackEvent(season);
    }

    return {
      id: `fallback_${Date.now()}`,
      type: 'weather_warning',
      title: 'Weather Advisory',
      description: `Weather conditions may affect your ${season} season crops. Consider taking preventive measures.`,
      educational_content: 'Weather monitoring is crucial for successful farming. Stay informed about local weather patterns.',
      choices: [
        {
          id: 'prepare',
          text: 'Take preventive measures (₹5,000)',
          cost: 5000,
          consequences: { crop_protection: 20, preparation_cost: 5000 },
        },
        {
          id: 'wait',
          text: 'Wait and see',
          cost: 0,
          consequences: { weather_risk: 30, cost_savings: 5000 },
        },
      ],
      timestamp: new Date().toISOString(),
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      severity: 'medium',
      category: 'weather_crisis',
    };
  }

  private getDroughtFallbackEvent(season: SeasonType): GameEvent {
    return {
      id: `drought_fallback_${Date.now()}`,
      type: 'drought_emergency',
      title: 'Drought Conditions Worsening',
      description: 'Water levels are critically low. Your crops are showing signs of severe water stress.',
      educational_content: 'Drought management requires immediate water conservation and crop protection measures.',
      choices: [
        {
          id: 'emergency_irrigation',
          text: 'Set up emergency irrigation (₹25,000)',
          cost: 25000,
          consequences: { crop_survival: 60, water_access: 40, debt: 25000 },
        },
        {
          id: 'reduce_area',
          text: 'Reduce cultivated area by half',
          cost: 0,
          consequences: { crop_yield: -50, water_stress: -30, income_loss: -40 },
        },
        {
          id: 'wait_for_rain',
          text: 'Wait and hope for rain',
          cost: 0,
          consequences: { crop_risk: 80, stress_level: 50, yield_uncertainty: 90 },
        },
      ],
      timestamp: new Date().toISOString(),
      expires_at: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
      severity: 'critical',
      category: 'extreme_weather',
    };
  }

  private getFloodFallbackEvent(season: SeasonType): GameEvent {
    return {
      id: `flood_fallback_${Date.now()}`,
      type: 'flood_emergency',
      title: 'Flood Warning - Immediate Action Required',
      description: 'Heavy rains have caused water levels to rise dangerously. Your farm is at risk of flooding.',
      educational_content: 'Flood preparedness includes drainage, evacuation plans, and crop protection measures.',
      choices: [
        {
          id: 'build_barriers',
          text: 'Build flood barriers (₹18,000)',
          cost: 18000,
          consequences: { flood_protection: 50, property_safety: 60, barrier_cost: 18000 },
        },
        {
          id: 'evacuate_assets',
          text: 'Evacuate livestock and equipment',
          cost: 8000,
          consequences: { asset_safety: 80, evacuation_cost: 8000, crop_exposure: 70 },
        },
        {
          id: 'stay_and_monitor',
          text: 'Stay and monitor the situation',
          cost: 0,
          consequences: { flood_risk: 90, property_damage: 60, personal_risk: 40 },
        },
      ],
      timestamp: new Date().toISOString(),
      expires_at: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
      severity: 'critical',
      category: 'extreme_weather',
    };
  }

  private getPestFallbackEvent(season: SeasonType): GameEvent {
    return {
      id: `pest_fallback_${Date.now()}`,
      type: 'pest_attack',
      title: 'Pest Infestation Detected',
      description: 'Your crops are under attack from pests. Early intervention is crucial to prevent major losses.',
      educational_content: 'Integrated Pest Management combines multiple approaches for effective and sustainable pest control.',
      choices: [
        {
          id: 'ipm_treatment',
          text: 'Apply IPM treatment (₹10,000)',
          cost: 10000,
          consequences: { pest_control: 70, environmental_safety: 30, treatment_cost: 10000 },
        },
        {
          id: 'chemical_spray',
          text: 'Emergency chemical spraying (₹15,000)',
          cost: 15000,
          consequences: { pest_control: 85, chemical_cost: 15000, environmental_impact: -25 },
        },
        {
          id: 'natural_methods',
          text: 'Try natural pest control methods',
          cost: 3000,
          consequences: { pest_control: 40, cost_savings: 12000, organic_approach: 30 },
        },
      ],
      timestamp: new Date().toISOString(),
      expires_at: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000).toISOString(),
      severity: 'high',
      category: 'pest_crisis',
    };
  }

  private getEmergencyFallbackEvent(season: SeasonType): GameEvent {
    return {
      id: `emergency_fallback_${Date.now()}`,
      type: 'financial_emergency',
      title: 'Critical Financial Situation',
      description: 'Your funds are running dangerously low. Immediate action is needed to continue farming operations.',
      educational_content: 'Financial planning and emergency funds are crucial for farming sustainability.',
      choices: [
        {
          id: 'emergency_loan',
          text: 'Take emergency loan (36% interest)',
          cost: 0,
          consequences: { immediate_cash: 20000, debt_trap_risk: 60, interest_burden: 40 },
        },
        {
          id: 'sell_assets',
          text: 'Sell farm equipment',
          cost: 0,
          consequences: { immediate_cash: 35000, asset_loss: 50, future_productivity: -30 },
        },
        {
          id: 'seek_help',
          text: 'Seek help from family/community',
          cost: 0,
          consequences: { financial_support: 15000, social_debt: 30, dignity_impact: 20 },
        },
      ],
      timestamp: new Date().toISOString(),
      expires_at: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
      severity: 'critical',
      category: 'emergency_crisis',
    };
  }

  private getFallbackConsequences(event: GameEvent, choiceId: string): ResolvedConsequences {
    const choice = event.choices.find(c => c.id === choiceId);
    
    return {
      immediate_effects: {
        money_change: choice ? -choice.cost : 0,
      },
      long_term_effects: {},
      educational_impact: {
        topic: event.type,
        lesson_learned: event.educational_content || 'Every decision has consequences in farming.',
        awareness_increased: true,
      },
      choice_made: choice?.text || 'Unknown choice',
      cost: choice?.cost || 0,
    };
  }
}

// Export singleton instance
export const eventService = EventService.getInstance();