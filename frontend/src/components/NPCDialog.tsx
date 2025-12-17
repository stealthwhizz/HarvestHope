/**
 * NPC Dialog Component - Handles conversations with AI-generated farmer NPCs
 */

import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import type { NPCData, GameState } from '../../../shared/types/game-state';
import { updateNPC, updateRelationship, addDialogue } from '../store/slices/npcSlice';
import { selectGameState } from '../store/selectors/gameSelectors';
import npcService, { type DialogueResponse } from '../services/npcService';

interface NPCDialogProps {
  npc: NPCData;
  isOpen: boolean;
  onClose: () => void;
}

interface DialogueChoice {
  id: string;
  text: string;
  type: 'help' | 'advice' | 'money' | 'resources' | 'ignore' | 'question';
  cost?: number;
  requirement?: string;
}

const NPCDialog: React.FC<NPCDialogProps> = ({ npc, isOpen, onClose }) => {
  const dispatch = useDispatch();
  const gameState = useSelector(selectGameState) as GameState;
  const [currentDialogue, setCurrentDialogue] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [dialogueChoices, setDialogueChoices] = useState<DialogueChoice[]>([]);
  const [showEducationalContent, setShowEducationalContent] = useState(false);

  useEffect(() => {
    if (isOpen && npc) {
      initializeDialogue();
    }
  }, [isOpen, npc]);

  const initializeDialogue = async () => {
    setIsLoading(true);
    try {
      const response = await npcService.generateDialogue({
        npcData: npc,
        gameState,
      });

      if (response.success && response.data) {
        setCurrentDialogue(response.data.dialogue);
        generateDialogueChoices(response.data);
      } else {
        setCurrentDialogue(`Namaste! I am ${npc.name} from ${npc.location}. These are difficult times for farmers like us.`);
        generateDefaultChoices();
      }
    } catch (error) {
      console.error('Failed to initialize dialogue:', error);
      setCurrentDialogue(`Hello, I am ${npc.name}. How can we help each other?`);
      generateDefaultChoices();
    } finally {
      setIsLoading(false);
    }
  };

  const generateDialogueChoices = (dialogueData: DialogueResponse) => {
    const choices: DialogueChoice[] = [];

    // Always include basic interaction options
    choices.push({
      id: 'ask_about_crisis',
      text: `Tell me more about your ${npc.currentCrisis} situation`,
      type: 'question',
    });

    if (dialogueData.needsHelp) {
      // Add help options based on crisis type
      if (npc.currentCrisis === 'debt' && gameState.farm.money >= 10000) {
        choices.push({
          id: 'offer_money',
          text: 'I can lend you ₹10,000 to help with your debt',
          type: 'money',
          cost: 10000,
        });
      }

      if (npc.currentCrisis === 'equipment' && gameState.farm.money >= 5000) {
        choices.push({
          id: 'help_equipment',
          text: 'Let me help you repair your equipment',
          type: 'resources',
          cost: 5000,
        });
      }

      choices.push({
        id: 'offer_advice',
        text: 'Let me share some advice that might help',
        type: 'advice',
      });
    }

    if (dialogueData.offersHelp) {
      choices.push({
        id: 'accept_help',
        text: 'I would appreciate your help',
        type: 'help',
      });
    }

    // Add educational content option
    choices.push({
      id: 'learn_more',
      text: 'Can you teach me about farming challenges?',
      type: 'question',
    });

    // Add polite exit option
    choices.push({
      id: 'goodbye',
      text: 'Thank you for talking with me. Take care!',
      type: 'ignore',
    });

    setDialogueChoices(choices);
  };

  const generateDefaultChoices = () => {
    const choices: DialogueChoice[] = [
      {
        id: 'ask_about_crisis',
        text: `How are you dealing with ${npc.currentCrisis}?`,
        type: 'question',
      },
      {
        id: 'offer_help',
        text: 'Is there anything I can do to help?',
        type: 'help',
      },
      {
        id: 'goodbye',
        text: 'Nice meeting you. Best of luck!',
        type: 'ignore',
      },
    ];

    setDialogueChoices(choices);
  };

  const handleChoiceSelect = async (choice: DialogueChoice) => {
    if (choice.cost && gameState.farm.money < choice.cost) {
      alert(`You need ₹${choice.cost} to help with this.`);
      return;
    }

    setIsLoading(true);

    try {
      // Generate NPC response to player choice
      const response = await npcService.generateDialogue({
        npcData: npc,
        gameState,
        playerChoice: choice.text,
      });

      if (response.success && response.data) {
        // Update dialogue
        setCurrentDialogue(response.data.dialogue);

        // Create dialogue entry
        const dialogueEntry = npcService.createDialogueEntry(
          npc.id,
          choice.text,
          response.data.dialogue,
          response.data.relationshipChange
        );

        // Update NPC relationship and dialogue history
        dispatch(updateRelationship({
          id: npc.id,
          change: response.data.relationshipChange,
        }));

        dispatch(addDialogue({
          npcId: npc.id,
          dialogue: dialogueEntry,
        }));

        // Handle special actions
        if (choice.type === 'money' && choice.cost) {
          // Deduct money from player (this would typically be handled by a financial action)
          console.log(`Player helped ${npc.name} with ₹${choice.cost}`);
        }

        if (choice.id === 'learn_more') {
          setShowEducationalContent(true);
        }

        if (choice.id === 'goodbye') {
          setTimeout(() => onClose(), 1500);
        } else {
          // Generate new choices for continued conversation
          generateDialogueChoices(response.data);
        }
      }
    } catch (error) {
      console.error('Failed to process dialogue choice:', error);
      setCurrentDialogue('I appreciate your concern. These are indeed challenging times.');
    } finally {
      setIsLoading(false);
    }
  };

  const getRelationshipColor = (level: number): string => {
    if (level > 50) return 'text-green-600';
    if (level > 0) return 'text-blue-600';
    if (level > -20) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getCrisisIcon = (crisis: string): string => {
    const icons: Record<string, string> = {
      debt: '💰',
      drought: '🌵',
      flood: '🌊',
      pest: '🐛',
      health: '🏥',
      equipment: '🚜',
    };
    return icons[crisis] || '⚠️';
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="bg-green-600 text-white p-4 rounded-t-lg">
          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-xl font-bold">{npc.name}</h2>
              <p className="text-green-100">
                {npc.age} years old • {npc.location}
              </p>
              <div className="flex items-center mt-1">
                <span className="mr-2">{getCrisisIcon(npc.currentCrisis)}</span>
                <span className="text-sm capitalize">{npc.currentCrisis} crisis</span>
              </div>
            </div>
            <div className="text-right">
              <div className={`font-semibold ${getRelationshipColor(npc.relationshipLevel)}`}>
                Relationship: {npc.relationshipLevel}
              </div>
              <button
                onClick={onClose}
                className="text-white hover:text-gray-200 text-2xl leading-none"
              >
                ×
              </button>
            </div>
          </div>
        </div>

        {/* Dialogue Content */}
        <div className="p-6">
          {/* NPC Portrait and Info */}
          <div className="mb-4 p-4 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-600 mb-2">{npc.backstory}</p>
            <div className="text-xs text-gray-500">
              Farm Size: {npc.farmSize || 'Unknown'} • 
              Family: {npc.familySize || 'Unknown'} members
            </div>
          </div>

          {/* Current Dialogue */}
          <div className="mb-6">
            <div className="bg-blue-50 border-l-4 border-blue-400 p-4 rounded">
              {isLoading ? (
                <div className="flex items-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
                  <span className="text-gray-600">Thinking...</span>
                </div>
              ) : (
                <p className="text-gray-800">{currentDialogue}</p>
              )}
            </div>
          </div>

          {/* Educational Content */}
          {showEducationalContent && (
            <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <h3 className="font-semibold text-yellow-800 mb-2">
                Learning: {npcService.getEducationalContent(npc.currentCrisis).title}
              </h3>
              <p className="text-yellow-700 mb-3">
                {npcService.getEducationalContent(npc.currentCrisis).content}
              </p>
              <div className="text-sm">
                <strong>Action Items:</strong>
                <ul className="list-disc list-inside mt-1 text-yellow-600">
                  {npcService.getEducationalContent(npc.currentCrisis).actionItems.map((item, index) => (
                    <li key={index}>{item}</li>
                  ))}
                </ul>
              </div>
              <button
                onClick={() => setShowEducationalContent(false)}
                className="mt-2 text-xs text-yellow-600 hover:text-yellow-800"
              >
                Close
              </button>
            </div>
          )}

          {/* Dialogue Choices */}
          {!isLoading && dialogueChoices.length > 0 && (
            <div className="space-y-2">
              <h3 className="font-semibold text-gray-700 mb-3">Your Response:</h3>
              {dialogueChoices.map((choice) => (
                <button
                  key={choice.id}
                  onClick={() => handleChoiceSelect(choice)}
                  disabled={!!(choice.cost && gameState.farm.money < choice.cost)}
                  className={`w-full text-left p-3 rounded-lg border transition-colors ${
                    choice.cost && gameState.farm.money < choice.cost
                      ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed'
                      : 'bg-white hover:bg-gray-50 border-gray-300 hover:border-gray-400'
                  }`}
                >
                  <div className="flex justify-between items-center">
                    <span>{choice.text}</span>
                    {choice.cost && (
                      <span className={`text-sm ${
                        gameState.farm.money >= choice.cost ? 'text-green-600' : 'text-red-500'
                      }`}>
                        ₹{choice.cost.toLocaleString()}
                      </span>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default NPCDialog;