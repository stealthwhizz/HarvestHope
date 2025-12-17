/**
 * NPC Service Tests
 */

import npcService from '../npcService';
import type { NPCData, GameState } from '../../../../shared/types/game-state';

// Mock fetch for testing
global.fetch = jest.fn();

describe('NPCService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('generateNPC', () => {
    it('should generate an NPC successfully', async () => {
      const mockNPC: NPCData = {
        id: 'test-npc-1',
        name: 'Test Farmer',
        age: 45,
        location: 'Punjab',
        backstory: 'A hardworking farmer',
        currentCrisis: 'debt',
        relationshipLevel: 0,
        dialogueHistory: [],
      };

      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          npc: mockNPC,
          message: 'NPC generated successfully',
        }),
      });

      const gameState: Partial<GameState> = {
        farm: { money: 50000, day: 1, season: 'Kharif' } as any,
        season: { current: 'Kharif', day: 1 } as any,
      };

      const result = await npcService.generateNPC({ gameState });

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockNPC);
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/npc'),
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: expect.stringContaining('generate'),
        })
      );
    });

    it('should handle API errors gracefully', async () => {
      (fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

      const result = await npcService.generateNPC({ gameState: {} });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Network error');
    });
  });

  describe('generateDialogue', () => {
    it('should generate dialogue successfully', async () => {
      const mockDialogue = {
        dialogue: 'Hello, how are you?',
        emotion: 'friendly',
        relationshipChange: 2,
        offersHelp: false,
        needsHelp: true,
        educationalTip: 'Always diversify your crops',
      };

      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          dialogue: mockDialogue,
          message: 'Dialogue generated successfully',
        }),
      });

      const npcData: NPCData = {
        id: 'test-npc-1',
        name: 'Test Farmer',
        age: 45,
        location: 'Punjab',
        backstory: 'A hardworking farmer',
        currentCrisis: 'debt',
        relationshipLevel: 0,
        dialogueHistory: [],
      };

      const result = await npcService.generateDialogue({
        npcData,
        gameState: {},
        playerChoice: 'How can I help you?',
      });

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockDialogue);
    });
  });

  describe('utility functions', () => {
    const mockNPCs: NPCData[] = [
      {
        id: 'npc-1',
        name: 'Farmer 1',
        age: 45,
        location: 'Punjab',
        backstory: 'Test',
        currentCrisis: 'health',
        relationshipLevel: 60,
        dialogueHistory: [],
      },
      {
        id: 'npc-2',
        name: 'Farmer 2',
        age: 35,
        location: 'Bihar',
        backstory: 'Test',
        currentCrisis: 'debt',
        relationshipLevel: -30,
        dialogueHistory: [],
      },
      {
        id: 'npc-3',
        name: 'Farmer 3',
        age: 50,
        location: 'Kerala',
        backstory: 'Test',
        currentCrisis: 'pest',
        relationshipLevel: 10,
        dialogueHistory: [],
      },
    ];

    it('should identify NPCs needing attention', () => {
      const needingAttention = npcService.getNPCsNeedingAttention(mockNPCs);
      
      expect(needingAttention).toHaveLength(2); // health and debt crises
      expect(needingAttention[0].currentCrisis).toBe('health'); // Higher priority
      expect(needingAttention[1].currentCrisis).toBe('debt');
    });

    it('should categorize NPCs by relationship', () => {
      const categories = npcService.getNPCsByRelationship(mockNPCs);
      
      expect(categories.friends).toHaveLength(1);
      expect(categories.friends[0].relationshipLevel).toBe(60);
      
      expect(categories.neutral).toHaveLength(1);
      expect(categories.neutral[0].relationshipLevel).toBe(10);
      
      expect(categories.hostile).toHaveLength(1);
      expect(categories.hostile[0].relationshipLevel).toBe(-30);
    });

    it('should calculate relationship changes correctly', () => {
      const npc = mockNPCs[0]; // Farmer with health crisis
      
      const helpChange = npcService.calculateRelationshipChange(npc, 'help');
      expect(helpChange).toBeGreaterThan(10); // Bonus for health crisis
      
      const moneyChange = npcService.calculateRelationshipChange(npc, 'money');
      expect(moneyChange).toBe(15); // Base money help
      
      const ignoreChange = npcService.calculateRelationshipChange(npc, 'ignore');
      expect(ignoreChange).toBe(-3); // Negative for ignoring
    });

    it('should create dialogue entries correctly', () => {
      const entry = npcService.createDialogueEntry(
        'npc-1',
        'How are you?',
        'I am doing well, thank you!',
        5
      );

      expect(entry.npcId).toBe('npc-1');
      expect(entry.playerChoice).toBe('How are you?');
      expect(entry.npcResponse).toBe('I am doing well, thank you!');
      expect(entry.relationshipChange).toBe(5);
      expect(entry.id).toMatch(/^dialogue_/);
      expect(entry.timestamp).toBeDefined();
    });

    it('should provide educational content for different crises', () => {
      const debtContent = npcService.getEducationalContent('debt');
      expect(debtContent.title).toContain('Debt');
      expect(debtContent.actionItems).toContain('Apply for Kisan Credit Card at 7% interest');

      const droughtContent = npcService.getEducationalContent('drought');
      expect(droughtContent.title).toContain('Drought');
      expect(droughtContent.actionItems).toContain('Install drip irrigation systems');

      const unknownContent = npcService.getEducationalContent('unknown');
      expect(unknownContent.title).toContain('General');
    });
  });
});