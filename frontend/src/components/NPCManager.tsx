/**
 * NPC Manager Component - Displays and manages all NPCs in the game
 */

import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import type { NPCData, GameState } from '../../../shared/types/game-state';
import { selectNPCs, selectGameState } from '../store/selectors/gameSelectors';
import { addNPC, setNPCs } from '../store/slices/npcSlice';
import npcService from '../services/npcService';
import NPCDialog from './NPCDialog';

interface NPCManagerProps {
  className?: string;
}

const NPCManager: React.FC<NPCManagerProps> = ({ className = '' }) => {
  const dispatch = useDispatch();
  const npcs = useSelector(selectNPCs);
  const gameState = useSelector(selectGameState) as GameState;
  const [selectedNPC, setSelectedNPC] = useState<NPCData | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [filter, setFilter] = useState<'all' | 'crisis' | 'friends' | 'neutral' | 'hostile'>('all');

  useEffect(() => {
    // Generate initial NPCs if none exist
    if (npcs.length === 0) {
      generateInitialNPCs();
    }
  }, [npcs.length]);

  const generateInitialNPCs = async () => {
    setIsGenerating(true);
    try {
      const response = await npcService.generateMultipleNPCs(gameState, 3);
      if (response.success && response.data) {
        dispatch(setNPCs(response.data));
      }
    } catch (error) {
      console.error('Failed to generate initial NPCs:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  const generateNewNPC = async () => {
    setIsGenerating(true);
    try {
      const response = await npcService.generateNPC({ gameState });
      if (response.success && response.data) {
        dispatch(addNPC(response.data));
      }
    } catch (error) {
      console.error('Failed to generate new NPC:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  const openDialog = (npc: NPCData) => {
    setSelectedNPC(npc);
    setIsDialogOpen(true);
  };

  const closeDialog = () => {
    setIsDialogOpen(false);
    setSelectedNPC(null);
  };

  const getFilteredNPCs = (): NPCData[] => {
    switch (filter) {
      case 'crisis':
        return npcService.getNPCsNeedingAttention(npcs);
      case 'friends':
        return npcService.getNPCsByRelationship(npcs).friends;
      case 'neutral':
        return npcService.getNPCsByRelationship(npcs).neutral;
      case 'hostile':
        return npcService.getNPCsByRelationship(npcs).hostile;
      default:
        return npcs;
    }
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

  const getRelationshipColor = (level: number): string => {
    if (level > 50) return 'bg-green-100 text-green-800';
    if (level > 0) return 'bg-blue-100 text-blue-800';
    if (level > -20) return 'bg-yellow-100 text-yellow-800';
    return 'bg-red-100 text-red-800';
  };

  const getRelationshipLabel = (level: number): string => {
    if (level > 50) return 'Friend';
    if (level > 0) return 'Friendly';
    if (level > -20) return 'Neutral';
    return 'Hostile';
  };

  const getCrisisUrgency = (crisis: string): 'high' | 'medium' | 'low' => {
    const urgencyMap: Record<string, 'high' | 'medium' | 'low'> = {
      health: 'high',
      debt: 'high',
      equipment: 'medium',
      drought: 'medium',
      flood: 'medium',
      pest: 'low',
    };
    return urgencyMap[crisis] || 'low';
  };

  const filteredNPCs = getFilteredNPCs();

  return (
    <div className={`bg-white rounded-lg shadow-lg ${className}`}>
      {/* Header */}
      <div className="bg-green-600 text-white p-4 rounded-t-lg">
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-bold">Farmer Community</h2>
          <button
            onClick={generateNewNPC}
            disabled={isGenerating || npcs.length >= 10}
            className="bg-green-500 hover:bg-green-400 disabled:bg-green-700 px-3 py-1 rounded text-sm"
          >
            {isGenerating ? 'Generating...' : 'Meet New Farmer'}
          </button>
        </div>
        
        {/* Filter Tabs */}
        <div className="flex space-x-2 mt-3">
          {[
            { key: 'all', label: 'All', count: npcs.length },
            { key: 'crisis', label: 'Need Help', count: npcService.getNPCsNeedingAttention(npcs).length },
            { key: 'friends', label: 'Friends', count: npcService.getNPCsByRelationship(npcs).friends.length },
            { key: 'neutral', label: 'Neutral', count: npcService.getNPCsByRelationship(npcs).neutral.length },
            { key: 'hostile', label: 'Hostile', count: npcService.getNPCsByRelationship(npcs).hostile.length },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setFilter(tab.key as any)}
              className={`px-3 py-1 rounded text-sm transition-colors ${
                filter === tab.key
                  ? 'bg-white text-green-600'
                  : 'bg-green-500 hover:bg-green-400 text-white'
              }`}
            >
              {tab.label} ({tab.count})
            </button>
          ))}
        </div>
      </div>

      {/* NPC List */}
      <div className="p-4">
        {isGenerating && npcs.length === 0 ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Generating farmer community...</p>
          </div>
        ) : filteredNPCs.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <p>No farmers match the current filter.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredNPCs.map((npc) => (
              <div
                key={npc.id}
                className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => openDialog(npc)}
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center mb-2">
                      <h3 className="font-semibold text-lg mr-3">{npc.name}</h3>
                      <span className="text-2xl mr-2">{getCrisisIcon(npc.currentCrisis)}</span>
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-medium ${getRelationshipColor(npc.relationshipLevel)}`}
                      >
                        {getRelationshipLabel(npc.relationshipLevel)}
                      </span>
                    </div>
                    
                    <p className="text-gray-600 text-sm mb-2">
                      {npc.age} years old • {npc.location}
                    </p>
                    
                    <p className="text-gray-700 text-sm mb-3 line-clamp-2">
                      {npc.backstory}
                    </p>
                    
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4 text-xs text-gray-500">
                        <span>Farm: {npc.farmSize || 'Unknown'}</span>
                        <span>Family: {npc.familySize || 'Unknown'}</span>
                        <span>Crops: {npc.primaryCrops?.join(', ') || 'Various'}</span>
                      </div>
                      
                      {getCrisisUrgency(npc.currentCrisis) === 'high' && (
                        <span className="bg-red-100 text-red-800 px-2 py-1 rounded-full text-xs font-medium">
                          Urgent Help Needed
                        </span>
                      )}
                    </div>
                  </div>
                  
                  <div className="text-right ml-4">
                    <div className="text-sm font-medium text-gray-700">
                      Relationship
                    </div>
                    <div className={`text-lg font-bold ${
                      npc.relationshipLevel > 0 ? 'text-green-600' : 
                      npc.relationshipLevel < -20 ? 'text-red-600' : 'text-yellow-600'
                    }`}>
                      {npc.relationshipLevel > 0 ? '+' : ''}{npc.relationshipLevel}
                    </div>
                  </div>
                </div>
                
                {/* Recent Dialogue Preview */}
                {npc.dialogueHistory.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-gray-100">
                    <p className="text-xs text-gray-500 mb-1">Last conversation:</p>
                    <p className="text-sm text-gray-600 italic line-clamp-1">
                      "{npc.dialogueHistory[npc.dialogueHistory.length - 1].npcResponse}"
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* NPC Dialog Modal */}
      {selectedNPC && (
        <NPCDialog
          npc={selectedNPC}
          isOpen={isDialogOpen}
          onClose={closeDialog}
        />
      )}
    </div>
  );
};

export default NPCManager;