/**
 * Government Scheme Recommendation Utility
 * Provides contextual recommendations based on game state and events
 */

import type { GameState } from '../../../shared/types/game-state';
import { GovernmentSchemeService } from '../services/governmentSchemeService';

export interface SchemeRecommendation {
  context: 'financial_crisis' | 'crop_loss' | 'low_income' | 'debt_burden' | 'general';
  priority: 'high' | 'medium' | 'low';
  reason: string;
  recommendedSchemes: string[];
  urgency: number; // 1-10 scale
}

export class GovernmentSchemeRecommendations {
  /**
   * Analyze game state and provide contextual scheme recommendations
   */
  static analyzeAndRecommend(gameState: GameState): SchemeRecommendation[] {
    const recommendations: SchemeRecommendation[] = [];
    const { farm, economics, events } = gameState;

    // Check for financial crisis
    if (this.isFinancialCrisis(farm, economics)) {
      recommendations.push({
        context: 'financial_crisis',
        priority: 'high',
        reason: 'Low cash flow and high debt burden detected',
        recommendedSchemes: ['pm-kisan', 'kisan-credit-card'],
        urgency: 9
      });
    }

    // Check for crop loss events
    const cropLossEvents = events.activeEvents.filter(e => 
      e.category === 'weather_crisis' || e.type.includes('crop_damage')
    );
    if (cropLossEvents.length > 0) {
      recommendations.push({
        context: 'crop_loss',
        priority: 'high',
        reason: 'Active crop damage events detected',
        recommendedSchemes: ['pmfby'],
        urgency: 8
      });
    }

    // Check for low income
    if (this.isLowIncome(economics)) {
      recommendations.push({
        context: 'low_income',
        priority: 'medium',
        reason: 'Annual income below poverty threshold',
        recommendedSchemes: ['pm-kisan'],
        urgency: 6
      });
    }

    // Check for debt burden
    if (this.isHighDebtBurden(economics)) {
      recommendations.push({
        context: 'debt_burden',
        priority: 'high',
        reason: 'High interest debt from informal sources detected',
        recommendedSchemes: ['kisan-credit-card'],
        urgency: 7
      });
    }

    // Check for seasonal recommendations
    const seasonalRecommendation = this.getSeasonalRecommendations(farm);
    if (seasonalRecommendation) {
      recommendations.push(seasonalRecommendation);
    }

    // Sort by urgency (highest first)
    return recommendations.sort((a, b) => b.urgency - a.urgency);
  }

  /**
   * Check if farmer is in financial crisis
   */
  private static isFinancialCrisis(farm: any, economics: any): boolean {
    const totalDebt = economics.loans.reduce((sum: number, loan: any) => sum + loan.remainingAmount, 0);
    const monthlyIncome = this.calculateMonthlyIncome(economics);
    const debtToIncomeRatio = monthlyIncome > 0 ? totalDebt / (monthlyIncome * 12) : Infinity;
    
    return farm.money < 10000 || debtToIncomeRatio > 3 || economics.creditScore < 600;
  }

  /**
   * Check if farmer has low income
   */
  private static isLowIncome(economics: any): boolean {
    const annualIncome = economics.income.reduce((sum: number, income: any) => sum + income.amount, 0);
    return annualIncome < 50000; // Below poverty line for rural areas
  }

  /**
   * Check if farmer has high debt burden
   */
  private static isHighDebtBurden(economics: any): boolean {
    const highInterestLoans = economics.loans.filter((loan: any) => 
      loan.type === 'moneylender' && loan.interestRate > 20
    );
    return highInterestLoans.length > 0;
  }

  /**
   * Get seasonal scheme recommendations
   */
  private static getSeasonalRecommendations(farm: any): SchemeRecommendation | null {
    const currentSeason = farm.season;
    
    if (currentSeason === 'Kharif' && farm.day < 30) {
      return {
        context: 'general',
        priority: 'medium',
        reason: 'Kharif season starting - good time for crop insurance',
        recommendedSchemes: ['pmfby'],
        urgency: 5
      };
    }

    if (currentSeason === 'Rabi' && farm.day < 30) {
      return {
        context: 'general',
        priority: 'medium',
        reason: 'Rabi season starting - consider credit facilities',
        recommendedSchemes: ['kisan-credit-card'],
        urgency: 5
      };
    }

    return null;
  }

  /**
   * Calculate monthly income from transaction history
   */
  private static calculateMonthlyIncome(economics: any): number {
    const recentIncome = economics.income.filter((income: any) => {
      const incomeDate = new Date(income.date);
      const threeMonthsAgo = new Date();
      threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
      return incomeDate >= threeMonthsAgo;
    });

    const totalRecentIncome = recentIncome.reduce((sum: number, income: any) => sum + income.amount, 0);
    return totalRecentIncome / 3; // Average monthly income
  }

  /**
   * Get scheme recommendations for specific events
   */
  static getEventBasedRecommendations(eventType: string, eventSeverity: string): SchemeRecommendation | null {
    switch (eventType) {
      case 'drought':
        return {
          context: 'crop_loss',
          priority: eventSeverity === 'high' ? 'high' : 'medium',
          reason: 'Drought conditions affecting crops',
          recommendedSchemes: ['pmfby', 'pm-kisan'],
          urgency: eventSeverity === 'high' ? 9 : 6
        };

      case 'flood':
        return {
          context: 'crop_loss',
          priority: 'high',
          reason: 'Flood damage to crops and infrastructure',
          recommendedSchemes: ['pmfby'],
          urgency: 8
        };

      case 'pest_outbreak':
        return {
          context: 'crop_loss',
          priority: 'medium',
          reason: 'Pest damage affecting crop yields',
          recommendedSchemes: ['pmfby'],
          urgency: 6
        };

      case 'market_crash':
        return {
          context: 'low_income',
          priority: 'high',
          reason: 'Market prices below expectations',
          recommendedSchemes: ['pm-kisan'],
          urgency: 7
        };

      case 'equipment_failure':
        return {
          context: 'financial_crisis',
          priority: 'medium',
          reason: 'Equipment repair costs straining finances',
          recommendedSchemes: ['kisan-credit-card'],
          urgency: 6
        };

      default:
        return null;
    }
  }

  /**
   * Check if farmer is eligible for emergency schemes
   */
  static checkEmergencyEligibility(gameState: GameState): {
    isEligible: boolean;
    emergencySchemes: string[];
    reason: string;
  } {
    const { farm, economics, events } = gameState;
    
    // Check for multiple crisis conditions
    const crisisCount = [
      this.isFinancialCrisis(farm, economics),
      events.activeEvents.some(e => e.severity === 'high'),
      economics.creditScore < 500,
      farm.money < 5000
    ].filter(Boolean).length;

    if (crisisCount >= 2) {
      return {
        isEligible: true,
        emergencySchemes: ['pm-kisan', 'kisan-credit-card'],
        reason: 'Multiple crisis conditions detected - emergency support recommended'
      };
    }

    return {
      isEligible: false,
      emergencySchemes: [],
      reason: 'No emergency conditions detected'
    };
  }

  /**
   * Get personalized scheme recommendations based on farmer profile
   */
  static getPersonalizedRecommendations(gameState: GameState): {
    primaryRecommendation: string;
    secondaryRecommendations: string[];
    reasoning: string;
  } {
    const { farm, economics } = gameState;
    const applicableSchemes = GovernmentSchemeService.getApplicableSchemes(farm, economics);

    if (applicableSchemes.length === 0) {
      return {
        primaryRecommendation: 'No schemes currently applicable',
        secondaryRecommendations: [],
        reasoning: 'Based on your current situation, no government schemes are immediately applicable. Focus on improving your farming operations and financial stability.'
      };
    }

    const primary = applicableSchemes[0];
    const secondary = applicableSchemes.slice(1, 3).map(s => s.name);

    return {
      primaryRecommendation: primary.name,
      secondaryRecommendations: secondary,
      reasoning: `Based on your ${farm.landArea} hectare farm and current financial situation, ${primary.name} offers the best immediate benefit. Consider also exploring ${secondary.join(' and ')} for comprehensive support.`
    };
  }
}