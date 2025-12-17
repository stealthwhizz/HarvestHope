/**
 * Shared TypeScript interfaces for Harvest Hope game state
 * Used by both frontend and backend services
 */

export interface PlayerProfile {
  id: string;
  name: string;
  createdAt: string;
  lastPlayed: string;
}

export interface FarmData {
  money: number;
  day: number;
  season: SeasonType;
  year: number;
  landArea: number;
  soilQuality: number;
  crops: CropData[];
  storedCrops: StoredCropData[];
  livestock: LivestockData[];
  equipment: EquipmentData[];
  storageCapacity: {
    farm: number; // kg
    warehouse: number; // kg
    cold_storage: number; // kg
  };
}

export interface EconomicsData {
  bankAccount: number;
  loans: LoanData[];
  income: TransactionData[];
  expenses: TransactionData[];
  creditScore: number;
  governmentBenefits: GovernmentBenefitData[];
}

export interface SeasonData {
  current: SeasonType;
  day: number;
  daysRemaining: number;
  nextSeason: SeasonType;
}

export interface ScheduledEvent {
  id: string;
  type: 'crop_growth' | 'weather_change' | 'market_update' | 'npc_event' | 'government_scheme';
  scheduledDay: number;
  scheduledSeason: SeasonType;
  data: any;
  recurring?: boolean;
  completed: boolean;
}

export interface SeasonTransitionData {
  isTransitioning: boolean;
  previousSeason: SeasonType;
  transitionEffects: {
    cropImpacts: string[];
    weatherChanges: string[];
    marketShifts: string[];
  };
}

export interface WeatherData {
  current: DailyWeather;
  forecast: DailyWeather[];
  monsoonPrediction: MonsoonPrediction;
  extremeEvents: WeatherEvent[];
}

export interface NPCData {
  id: string;
  name: string;
  age: number;
  location: string;
  backstory: string;
  currentCrisis: CrisisType;
  relationshipLevel: number;
  dialogueHistory: DialogueEntry[];
  farmSize?: string;
  familySize?: number;
  primaryCrops?: string[];
  educationLevel?: string;
  personality?: string;
  crisisDetails?: string;
  dialogueStyle?: string;
  createdAt?: string;
  lastInteraction?: string;
}

export interface StatisticsData {
  totalPlayTime: number;
  seasonsCompleted: number;
  totalIncome: number;
  totalExpenses: number;
  cropsHarvested: number;
  loansRepaid: number;
  npcRelationships: number;
}

export interface ProgressData {
  achievements: Achievement[];
  unlockedFeatures: string[];
  educationalContent: EducationalProgress[];
}

// Supporting interfaces
export type SeasonType = 'Kharif' | 'Rabi' | 'Zaid' | 'Off-season';
export type CrisisType = 'drought' | 'flood' | 'pest' | 'debt' | 'health' | 'equipment';

export interface CropData {
  id: string;
  type: string;
  plantedDate: number;
  growthStage: GrowthStage;
  health: number;
  expectedYield: number;
  area: number;
}

export interface StoredCropData {
  id: string;
  cropType: string;
  quantity: number; // in kg
  qualityGrade: 'premium' | 'grade_a' | 'grade_b' | 'grade_c' | 'below_standard';
  harvestDate: number;
  storageLocation: 'farm' | 'warehouse' | 'cold_storage';
  storageCost: number; // per day
  deteriorationRate: number; // quality loss per day
  marketValue: number; // current estimated value
}

export type GrowthStage = 'seedling' | 'vegetative' | 'flowering' | 'mature' | 'harvestable';

export interface LivestockData {
  id: string;
  type: string;
  count: number;
  health: number;
  productivity: number;
}

export interface EquipmentData {
  id: string;
  type: string;
  condition: number;
  maintenanceCost: number;
}

export interface LoanData {
  id: string;
  type: 'bank' | 'moneylender' | 'government';
  principal: number;
  interestRate: number;
  emiAmount: number;
  remainingAmount: number;
  dueDate: string;
  penalties: number;
}

export interface TransactionData {
  id: string;
  type: string;
  amount: number;
  date: string;
  description: string;
  category: string;
}

export interface GovernmentBenefitData {
  schemeId: string;
  schemeName: string;
  amount: number;
  receivedDate: string;
  eligibilityStatus: string;
}

export interface DailyWeather {
  date: string;
  temperature: { min: number; max: number };
  humidity: number;
  rainfall: number;
  windSpeed: number;
  conditions: string;
}

export interface MonsoonPrediction {
  strength: 'weak' | 'moderate' | 'strong';
  arrivalDate: string;
  totalRainfall: number;
  droughtRisk: number;
  floodRisk: number;
  confidence: number;
}

export interface WeatherEvent {
  id: string;
  type: 'drought' | 'flood' | 'cyclone' | 'hailstorm';
  severity: number;
  startDate: string;
  duration: number;
  impact: string;
}

export interface DialogueEntry {
  id: string;
  npcId: string;
  playerChoice: string;
  npcResponse: string;
  timestamp: string;
  relationshipChange: number;
}

export interface Achievement {
  id: string;
  name: string;
  description: string;
  unlockedDate: string;
  category: string;
}

export interface EducationalProgress {
  topicId: string;
  topicName: string;
  completed: boolean;
  completedDate?: string;
  score?: number;
}

// Event system interfaces
export interface GameEvent {
  id: string;
  type: string;
  title: string;
  description: string;
  educational_content?: string;
  choices: EventChoice[];
  timestamp: string;
  expires_at: string;
  severity?: 'low' | 'medium' | 'high' | 'critical';
  category?: 'weather_crisis' | 'extreme_weather' | 'pest_crisis' | 'emergency_crisis' | 'financial_crisis' | 'market_opportunity' | 'social_crisis' | 'government_scheme';
}

export interface EventChoice {
  id: string;
  text: string;
  cost: number;
  consequences: EventConsequences;
  requirements?: EventRequirement[];
}

export interface EventConsequences {
  [key: string]: number | string | boolean;
  // Common consequence types:
  // Financial: immediate_cash, debt, cost
  // Agricultural: crop_yield, crop_damage_risk, water_access
  // Social: community_respect, stress_level, relationship_change
  // Long-term: future_protection, skill_improvement, reputation
}

export interface EventRequirement {
  type: 'money' | 'crop' | 'equipment' | 'relationship';
  value: number | string;
  operator: 'gte' | 'lte' | 'eq' | 'has';
}

export interface EventResolution {
  eventId: string;
  choiceId: string;
  timestamp: string;
  consequences: ResolvedConsequences;
}

export interface ResolvedConsequences {
  immediate_effects: {
    money_change?: number;
    debt_increase?: number;
    yield_change?: number;
    crop_damage?: number;
    survival_rate?: number;
    pest_reduction?: number;
    equipment_status?: number;
    safety_level?: number;
    stress_change?: number;
    health_improvement?: number;
    flood_protection?: number;
    property_saved?: number;
    [key: string]: any;
  };
  long_term_effects: {
    damage_risk?: number;
    social_standing?: number;
    skill_improvement?: number;
    water_improvement?: number;
    disaster_preparedness?: number;
    environmental_damage?: number;
    community_bonds?: number;
    financial_vulnerability?: number;
    [key: string]: any;
  };
  educational_impact: {
    topic: string;
    lesson_learned: string;
    awareness_increased: boolean;
    crisis_experience?: boolean;
  };
  choice_made: string;
  cost: number;
}

// Main game state interface
export interface GameState {
  player: PlayerProfile;
  farm: FarmData;
  economics: EconomicsData;
  season: SeasonData;
  weather: WeatherData;
  npcs: NPCData[];
  events: EventData;
  stats: StatisticsData;
  progress: ProgressData;
}

export interface EventData {
  activeEvents: GameEvent[];
  eventHistory: EventResolution[];
  pendingConsequences: ResolvedConsequences[];
  educationalProgress: {
    [topic: string]: {
      eventsExperienced: number;
      lessonsLearned: string[];
      masteryLevel: number;
    };
  };
}