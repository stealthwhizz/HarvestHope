/**
 * Crop type definitions and constants for Harvest Hope
 */

import type { SeasonType, GrowthStage } from '../../../shared/types/game-state';

export interface CropType {
  id: string;
  name: string;
  category: 'cereal' | 'pulse' | 'oilseed' | 'cash' | 'vegetable';
  seasons: SeasonType[];
  growthDuration: number; // days to reach harvestable
  baseYield: number; // kg per acre
  baseCost: number; // rupees per acre
  waterRequirement: 'low' | 'medium' | 'high';
  soilRequirement: 'poor' | 'medium' | 'good';
  pestResistance: number; // 0-1, higher is more resistant
  diseaseResistance: number; // 0-1, higher is more resistant
  marketPrice: number; // base price per kg
  msp?: number; // minimum support price per kg
}

export interface CropGrowthStageInfo {
  stage: GrowthStage;
  duration: number; // days in this stage
  waterNeed: number; // multiplier for water requirement
  pestVulnerability: number; // 0-1, higher is more vulnerable
  diseaseVulnerability: number; // 0-1, higher is more vulnerable
}

export interface PestDiseaseEvent {
  id: string;
  type: 'pest' | 'disease';
  name: string;
  severity: number; // 0-1
  cropId: string;
  startDay: number;
  duration: number;
  yieldImpact: number; // percentage reduction in yield
  treatmentCost: number; // cost to treat per acre
  canTreat: boolean;
}

// Crop type definitions
export const CROP_TYPES: Record<string, CropType> = {
  rice: {
    id: 'rice',
    name: 'Rice',
    category: 'cereal',
    seasons: ['Kharif'],
    growthDuration: 120,
    baseYield: 2500,
    baseCost: 15000,
    waterRequirement: 'high',
    soilRequirement: 'medium',
    pestResistance: 0.6,
    diseaseResistance: 0.5,
    marketPrice: 20,
    msp: 18.5,
  },
  wheat: {
    id: 'wheat',
    name: 'Wheat',
    category: 'cereal',
    seasons: ['Rabi'],
    growthDuration: 110,
    baseYield: 3000,
    baseCost: 12000,
    waterRequirement: 'medium',
    soilRequirement: 'good',
    pestResistance: 0.7,
    diseaseResistance: 0.6,
    marketPrice: 22,
    msp: 20.5,
  },
  cotton: {
    id: 'cotton',
    name: 'Cotton',
    category: 'cash',
    seasons: ['Kharif'],
    growthDuration: 150,
    baseYield: 500,
    baseCost: 25000,
    waterRequirement: 'medium',
    soilRequirement: 'good',
    pestResistance: 0.3,
    diseaseResistance: 0.4,
    marketPrice: 55,
    msp: 50,
  },
  sugarcane: {
    id: 'sugarcane',
    name: 'Sugarcane',
    category: 'cash',
    seasons: ['Kharif', 'Rabi'],
    growthDuration: 300,
    baseYield: 60000,
    baseCost: 40000,
    waterRequirement: 'high',
    soilRequirement: 'good',
    pestResistance: 0.5,
    diseaseResistance: 0.5,
    marketPrice: 3.5,
    msp: 3.1,
  },
  soybean: {
    id: 'soybean',
    name: 'Soybean',
    category: 'oilseed',
    seasons: ['Kharif'],
    growthDuration: 100,
    baseYield: 1200,
    baseCost: 10000,
    waterRequirement: 'medium',
    soilRequirement: 'medium',
    pestResistance: 0.6,
    diseaseResistance: 0.7,
    marketPrice: 45,
    msp: 40,
  },
  mustard: {
    id: 'mustard',
    name: 'Mustard',
    category: 'oilseed',
    seasons: ['Rabi'],
    growthDuration: 90,
    baseYield: 1000,
    baseCost: 8000,
    waterRequirement: 'low',
    soilRequirement: 'medium',
    pestResistance: 0.8,
    diseaseResistance: 0.7,
    marketPrice: 50,
    msp: 45,
  },
  tomato: {
    id: 'tomato',
    name: 'Tomato',
    category: 'vegetable',
    seasons: ['Rabi', 'Zaid'],
    growthDuration: 80,
    baseYield: 15000,
    baseCost: 20000,
    waterRequirement: 'high',
    soilRequirement: 'good',
    pestResistance: 0.4,
    diseaseResistance: 0.3,
    marketPrice: 12,
  },
  onion: {
    id: 'onion',
    name: 'Onion',
    category: 'vegetable',
    seasons: ['Rabi', 'Kharif'],
    growthDuration: 120,
    baseYield: 20000,
    baseCost: 18000,
    waterRequirement: 'medium',
    soilRequirement: 'medium',
    pestResistance: 0.6,
    diseaseResistance: 0.5,
    marketPrice: 15,
  },
};

// Growth stage definitions
export const GROWTH_STAGES: Record<GrowthStage, CropGrowthStageInfo> = {
  seedling: {
    stage: 'seedling',
    duration: 0.15, // 15% of total growth duration
    waterNeed: 1.2,
    pestVulnerability: 0.8,
    diseaseVulnerability: 0.9,
  },
  vegetative: {
    stage: 'vegetative',
    duration: 0.35, // 35% of total growth duration
    waterNeed: 1.5,
    pestVulnerability: 0.6,
    diseaseVulnerability: 0.7,
  },
  flowering: {
    stage: 'flowering',
    duration: 0.25, // 25% of total growth duration
    waterNeed: 1.8,
    pestVulnerability: 0.4,
    diseaseVulnerability: 0.5,
  },
  mature: {
    stage: 'mature',
    duration: 0.20, // 20% of total growth duration
    waterNeed: 1.0,
    pestVulnerability: 0.3,
    diseaseVulnerability: 0.4,
  },
  harvestable: {
    stage: 'harvestable',
    duration: 0.05, // 5% of total growth duration (harvest window)
    waterNeed: 0.5,
    pestVulnerability: 0.2,
    diseaseVulnerability: 0.3,
  },
};

// Common pests and diseases
export const PEST_DISEASE_TYPES = {
  pests: [
    { name: 'Bollworm', affectedCrops: ['cotton'], severity: 0.7, treatmentCost: 2000 },
    { name: 'Brown Planthopper', affectedCrops: ['rice'], severity: 0.6, treatmentCost: 1500 },
    { name: 'Aphids', affectedCrops: ['wheat', 'mustard', 'soybean'], severity: 0.4, treatmentCost: 800 },
    { name: 'Fruit Borer', affectedCrops: ['tomato'], severity: 0.8, treatmentCost: 2500 },
    { name: 'Thrips', affectedCrops: ['onion'], severity: 0.5, treatmentCost: 1200 },
  ],
  diseases: [
    { name: 'Blast', affectedCrops: ['rice'], severity: 0.8, treatmentCost: 3000 },
    { name: 'Rust', affectedCrops: ['wheat'], severity: 0.6, treatmentCost: 2000 },
    { name: 'Wilt', affectedCrops: ['cotton', 'tomato'], severity: 0.9, treatmentCost: 4000 },
    { name: 'Blight', affectedCrops: ['tomato'], severity: 0.7, treatmentCost: 2500 },
    { name: 'Root Rot', affectedCrops: ['sugarcane'], severity: 0.5, treatmentCost: 1800 },
  ],
};