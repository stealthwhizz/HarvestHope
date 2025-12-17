/**
 * NPC Service - Handles AI-generated farmer characters and dialogue
 */

import type { NPCData, GameState, DialogueEntry } from '../../../shared/types/game-state';

const API_BASE_URL = 'https://api.harvest-hope.com';

export interface NPCGenerationRequest {
  gameState: Partial<GameState>;
  contextParams?: {
    preferredCrisis?: string;
    preferredLocation?: string;
    relationshipBias?: number;
  };
}

export interface DialogueRequest {
  npcData: NPCData;
  gameState: Partial<GameState>;
  playerChoice?: string;
}

export interface DialogueResponse {
  dialogue: string;
  emotion: string;
  relationshipChange: number;
  offersHelp: boolean;
  needsHelp: boolean;
  educationalTip?: string;
}

export interface NPCServiceResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

class NPCService {
  private async makeRequest<T>(endpoint: string, data: any): Promise<NPCServiceResponse<T>> {
    try {
      const response = await fetch(`${API_BASE_URL}/npc`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: endpoint,
          ...data,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'NPC service request failed');
      }

      return {
        success: true,
        data: result[endpoint === 'generate' ? 'npc' : endpoint === 'batch_generate' ? 'npcs' : 'dialogue'],
        message: result.message,
      };
    } catch (error) {
      console.error(`NPC service error (${endpoint}):`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  }

  /**
   * Generate a single NPC character
   */
  async generateNPC(request: NPCGenerationRequest): Promise<NPCServiceResponse<NPCData>> {
    return this.makeRequest<NPCData>('generate', request);
  }

  /**
   * Generate multiple NPCs for initial game setup
   */
  async generateMultipleNPCs(
    gameState: Partial<GameState>, 
    count: number = 3
  ): Promise<NPCServiceResponse<NPCData[]>> {
    return this.makeRequest<NPCData[]>('batch_generate', {
      gameState,
      count: Math.min(count, 5), // Limit to 5 NPCs
    });
  }

  /**
   * Generate contextual dialogue for an NPC
   */
  async generateDialogue(request: DialogueRequest): Promise<NPCServiceResponse<DialogueResponse>> {
    return this.makeRequest<DialogueResponse>('dialogue', request);
  }

  /**
   * Create a dialogue entry for storage
   */
  createDialogueEntry(
    npcId: string,
    playerChoice: string,
    npcResponse: string,
    relationshipChange: number = 0
  ): DialogueEntry {
    return {
      id: `dialogue_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      npcId,
      playerChoice,
      npcResponse,
      timestamp: new Date().toISOString(),
      relationshipChange,
    };
  }

  /**
   * Get NPCs that need attention based on their crisis level
   */
  getNPCsNeedingAttention(npcs: NPCData[]): NPCData[] {
    const crisisPriority = {
      health: 5,
      debt: 4,
      equipment: 3,
      drought: 3,
      flood: 3,
      pest: 2,
    };

    return npcs
      .filter(npc => npc.currentCrisis && crisisPriority[npc.currentCrisis] >= 3)
      .sort((a, b) => {
        const priorityA = crisisPriority[a.currentCrisis] || 0;
        const priorityB = crisisPriority[b.currentCrisis] || 0;
        return priorityB - priorityA;
      });
  }

  /**
   * Get NPCs by relationship level
   */
  getNPCsByRelationship(npcs: NPCData[]): {
    friends: NPCData[];
    neutral: NPCData[];
    hostile: NPCData[];
  } {
    return {
      friends: npcs.filter(npc => npc.relationshipLevel > 50),
      neutral: npcs.filter(npc => npc.relationshipLevel >= -20 && npc.relationshipLevel <= 50),
      hostile: npcs.filter(npc => npc.relationshipLevel < -20),
    };
  }

  /**
   * Calculate relationship change based on player action
   */
  calculateRelationshipChange(
    npc: NPCData,
    actionType: 'help' | 'ignore' | 'advice' | 'money' | 'resources',
    actionValue?: number
  ): number {
    const baseChanges = {
      help: 10,
      advice: 5,
      money: 15,
      resources: 12,
      ignore: -3,
    };

    let change = baseChanges[actionType] || 0;

    // Adjust based on NPC's current crisis
    if (npc.currentCrisis === 'debt' && actionType === 'money') {
      change += 5;
    } else if (npc.currentCrisis === 'equipment' && actionType === 'resources') {
      change += 5;
    } else if (npc.currentCrisis === 'health' && actionType === 'help') {
      change += 8;
    }

    // Adjust based on current relationship level
    if (npc.relationshipLevel < -50) {
      change *= 0.5; // Harder to improve very negative relationships
    } else if (npc.relationshipLevel > 80) {
      change *= 0.3; // Diminishing returns for very positive relationships
    }

    return Math.round(change);
  }

  /**
   * Get educational content based on NPC's crisis
   */
  getEducationalContent(crisis: string): {
    title: string;
    content: string;
    actionItems: string[];
  } {
    const educationalContent: Record<string, {
      title: string;
      content: string;
      actionItems: string[];
    }> = {
      debt: {
        title: 'Managing Farm Debt',
        content: 'High-interest loans from moneylenders can trap farmers in debt cycles. Government schemes like KCC (Kisan Credit Card) offer lower interest rates.',
        actionItems: [
          'Apply for Kisan Credit Card at 7% interest',
          'Explore PM-KISAN direct benefit transfer',
          'Consider crop insurance to protect against losses',
          'Maintain detailed financial records',
        ],
      },
      drought: {
        title: 'Drought Management',
        content: 'Drought affects crop yields and increases irrigation costs. Water conservation and drought-resistant crops can help.',
        actionItems: [
          'Install drip irrigation systems',
          'Plant drought-resistant crop varieties',
          'Harvest rainwater during monsoon',
          'Apply for drought relief schemes',
        ],
      },
      flood: {
        title: 'Flood Recovery',
        content: 'Floods can destroy crops and damage soil. Quick action and proper drainage can minimize long-term impact.',
        actionItems: [
          'Improve field drainage systems',
          'Plant flood-tolerant crop varieties',
          'Apply for crop insurance claims',
          'Restore soil health with organic matter',
        ],
      },
      pest: {
        title: 'Integrated Pest Management',
        content: 'Pest outbreaks can destroy entire crops. Integrated pest management combines biological and chemical controls.',
        actionItems: [
          'Use pest-resistant crop varieties',
          'Encourage beneficial insects',
          'Apply pesticides judiciously',
          'Monitor crops regularly for early detection',
        ],
      },
      health: {
        title: 'Farmer Health and Safety',
        content: 'Farmer health issues can affect farm productivity. Access to healthcare and safety measures are crucial.',
        actionItems: [
          'Use protective equipment when handling chemicals',
          'Access government health schemes',
          'Maintain emergency medical funds',
          'Practice safe farming techniques',
        ],
      },
      equipment: {
        title: 'Farm Equipment Management',
        content: 'Equipment failures can disrupt farming operations. Regular maintenance and access to rental services help.',
        actionItems: [
          'Schedule regular equipment maintenance',
          'Join farmer cooperatives for shared equipment',
          'Explore government subsidies for new equipment',
          'Learn basic repair skills',
        ],
      },
    };

    return educationalContent[crisis] || {
      title: 'General Farming Tips',
      content: 'Successful farming requires planning, knowledge, and adaptation to changing conditions.',
      actionItems: [
        'Keep detailed farm records',
        'Stay updated on weather forecasts',
        'Diversify crops to reduce risk',
        'Connect with other farmers for knowledge sharing',
      ],
    };
  }
}

export const npcService = new NPCService();
export default npcService;