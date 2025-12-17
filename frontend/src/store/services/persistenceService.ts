/**
 * Service for handling game state persistence to DynamoDB with multi-device sync
 */

import type { GameState } from '../../../../shared/types/game-state';

// Environment-safe API URL configuration
const getApiBaseUrl = (): string => {
  // In test environment, use default URL
  if (typeof import.meta !== 'undefined' && import.meta.env.MODE === 'test') {
    return 'http://localhost:3000';
  }
  
  // In browser environment with Vite
  if (typeof window !== 'undefined' && (window as any).VITE_API_BASE_URL) {
    return (window as any).VITE_API_BASE_URL;
  }
  
  // Default fallback
  return 'https://api.harvest-hope.com';
};

const API_BASE_URL = getApiBaseUrl();

// Generate unique device ID for multi-device sync
const getDeviceId = (): string => {
  let deviceId = localStorage.getItem('harvest-hope-device-id');
  if (!deviceId) {
    deviceId = `device_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    localStorage.setItem('harvest-hope-device-id', deviceId);
  }
  return deviceId;
};

export interface SaveSlot {
  saveSlot: string;
  lastSaved: string;
  farmName: string;
  season: string;
  day: number;
  money: number;
  checksum: string;
  deviceId: string;
  version: string;
}

export interface SaveGameResponse {
  success: boolean;
  message: string;
  timestamp?: string;
  checksum?: string;
  saveSlot?: string;
  error?: string;
}

export interface LoadGameResponse {
  success: boolean;
  gameState?: GameState;
  message: string;
  lastSaved?: string;
  deviceId?: string;
  checksum?: string;
  saveSlot?: string;
  error?: string;
  backups?: BackupSlot[];
}

export interface BackupSlot {
  saveSlot: string;
  lastSaved: string;
  backupReason: string;
  deviceId: string;
}

export interface SaveSlotsResponse {
  success: boolean;
  saveSlots: SaveSlot[];
  message?: string;
}

/**
 * Save game state to DynamoDB via API Gateway with save slot support
 */
export async function saveGameState(gameState: GameState, saveSlot: string = 'slot1'): Promise<SaveGameResponse> {
  const deviceId = getDeviceId();
  
  try {
    const response = await fetch(`${API_BASE_URL}/gamestate/${gameState.player.id}?saveSlot=${saveSlot}&deviceId=${deviceId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        gameState,
        timestamp: new Date().toISOString(),
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result: SaveGameResponse = await response.json();
    
    // Clear local backup if cloud save successful
    if (result.success) {
      localStorage.removeItem(`harvest-hope-save-${gameState.player.id}-${saveSlot}`);
    }
    
    return result;
  } catch (error) {
    console.error('Error saving game state:', error);
    
    // Fallback to localStorage if API fails
    try {
      const localSave = {
        gameState,
        timestamp: new Date().toISOString(),
        saveSlot,
        deviceId,
        needsSync: true
      };
      
      localStorage.setItem(`harvest-hope-save-${gameState.player.id}-${saveSlot}`, JSON.stringify(localSave));
      
      return {
        success: true,
        message: 'Saved to local storage (offline mode)',
        timestamp: localSave.timestamp,
        saveSlot
      };
    } catch (localError) {
      console.error('Failed to save to localStorage:', localError);
      return {
        success: false,
        message: 'Failed to save game state both online and offline',
        error: 'SAVE_FAILED'
      };
    }
  }
}

/**
 * Load game state from DynamoDB via API Gateway with save slot support
 */
export async function loadGameState(playerId: string, saveSlot: string = 'slot1'): Promise<LoadGameResponse> {
  try {
    const response = await fetch(`${API_BASE_URL}/gamestate/${playerId}?saveSlot=${saveSlot}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (response.status === 404) {
      return {
        success: false,
        message: 'No saved game found',
        error: 'NOT_FOUND'
      };
    }

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result: LoadGameResponse = await response.json();
    return result;
  } catch (error) {
    console.error('Error loading game state:', error);
    
    // Fallback to localStorage if API fails
    try {
      const localSave = localStorage.getItem(`harvest-hope-save-${playerId}-${saveSlot}`);
      if (localSave) {
        const parsed = JSON.parse(localSave);
        return {
          success: true,
          gameState: parsed.gameState,
          message: 'Loaded from local storage (offline mode)',
          lastSaved: parsed.timestamp,
          saveSlot: parsed.saveSlot
        };
      } else {
        return {
          success: false,
          message: 'No saved game found locally',
          error: 'NOT_FOUND'
        };
      }
    } catch (localError) {
      console.error('Failed to load from localStorage:', localError);
      return {
        success: false,
        message: 'Failed to load game state',
        error: 'LOAD_FAILED'
      };
    }
  }
}

/**
 * Get all save slots for a player
 */
export async function getSaveSlots(playerId: string): Promise<SaveSlotsResponse> {
  try {
    const response = await fetch(`${API_BASE_URL}/gamestate/${playerId}?action=list`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result: SaveSlotsResponse = await response.json();
    
    // Merge with local saves if any
    const localSaves = getLocalSaves(playerId);
    const mergedSlots = [...result.saveSlots];
    
    for (const localSave of localSaves) {
      const existingSlot = mergedSlots.find(slot => slot.saveSlot === localSave.saveSlot);
      if (!existingSlot) {
        mergedSlots.push(localSave);
      } else if ((localSave as any).needsSync) {
        // Mark as needing sync
        existingSlot.deviceId = `${existingSlot.deviceId} (needs sync)`;
      }
    }
    
    return {
      success: true,
      saveSlots: mergedSlots.sort((a, b) => a.saveSlot.localeCompare(b.saveSlot))
    };
  } catch (error) {
    console.error('Error getting save slots:', error);
    
    // Fallback to local saves only
    const localSaves = getLocalSaves(playerId);
    return {
      success: true,
      saveSlots: localSaves,
      message: 'Showing local saves only (offline mode)'
    };
  }
}

/**
 * Delete saved game state
 */
export async function deleteGameState(playerId: string, saveSlot: string = 'slot1'): Promise<{ success: boolean; message: string }> {
  try {
    const response = await fetch(`${API_BASE_URL}/gamestate/${playerId}?saveSlot=${saveSlot}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    // Also remove from localStorage
    localStorage.removeItem(`harvest-hope-save-${playerId}-${saveSlot}`);

    return {
      success: true,
      message: 'Save slot deleted successfully',
    };
  } catch (error) {
    console.error('Error deleting save slot:', error);
    
    // Try to remove from localStorage anyway
    localStorage.removeItem(`harvest-hope-save-${playerId}-${saveSlot}`);
    
    return {
      success: false,
      message: 'Failed to delete save slot from server, but removed locally',
    };
  }
}

/**
 * Restore from backup slot
 */
export async function restoreFromBackup(playerId: string, backupSlot: string, targetSlot: string): Promise<LoadGameResponse> {
  try {
    // Load the backup
    const backupResponse = await loadGameState(playerId, backupSlot);
    if (!backupResponse.success || !backupResponse.gameState) {
      return {
        success: false,
        message: 'Failed to load backup data',
        error: 'BACKUP_LOAD_FAILED'
      };
    }
    
    // Save to target slot
    const saveResponse = await saveGameState(backupResponse.gameState, targetSlot);
    if (!saveResponse.success) {
      return {
        success: false,
        message: 'Failed to restore backup to target slot',
        error: 'RESTORE_FAILED'
      };
    }
    
    return {
      success: true,
      gameState: backupResponse.gameState,
      message: 'Successfully restored from backup',
      saveSlot: targetSlot
    };
  } catch (error) {
    console.error('Error restoring from backup:', error);
    return {
      success: false,
      message: 'Failed to restore from backup',
      error: 'RESTORE_ERROR'
    };
  }
}

/**
 * Check if there are any local saves that need to be synced
 */
export function getLocalSaves(playerId?: string): SaveSlot[] {
  const saves: SaveSlot[] = [];
  const prefix = playerId ? `harvest-hope-save-${playerId}-` : 'harvest-hope-save-';
  
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith(prefix)) {
      try {
        const data = JSON.parse(localStorage.getItem(key) || '{}');
        if (data.gameState) {
          const saveSlot = key.replace(prefix, '');
          saves.push({
            saveSlot,
            lastSaved: data.timestamp || '',
            farmName: data.gameState.farm?.name || `Farm ${saveSlot}`,
            season: data.gameState.season?.current || 'Kharif',
            day: data.gameState.farm?.day || 1,
            money: data.gameState.farm?.money || 0,
            checksum: '',
            deviceId: data.deviceId || getDeviceId(),
            version: '1.0.0',
            needsSync: data.needsSync || false
          } as SaveSlot & { needsSync?: boolean });
        }
      } catch (error) {
        console.error(`Error parsing local save ${key}:`, error);
      }
    }
  }
  return saves;
}

/**
 * Sync local saves to server when connection is restored
 */
export async function syncLocalSaves(playerId?: string): Promise<{ synced: number; failed: number; errors: string[] }> {
  const localSaves = getLocalSaves(playerId);
  let synced = 0;
  let failed = 0;
  const errors: string[] = [];

  for (const saveSlot of localSaves) {
    if (!(saveSlot as any).needsSync) continue;
    
    try {
      const key = playerId ? `harvest-hope-save-${playerId}-${saveSlot.saveSlot}` : 
                            `harvest-hope-save-${saveSlot.saveSlot}`;
      const localData = localStorage.getItem(key);
      
      if (localData) {
        const parsed = JSON.parse(localData);
        const result = await saveGameState(parsed.gameState, saveSlot.saveSlot);
        
        if (result.success) {
          synced++;
          // Remove local save after successful sync
          localStorage.removeItem(key);
        } else {
          failed++;
          errors.push(`Failed to sync ${saveSlot.saveSlot}: ${result.message}`);
        }
      }
    } catch (error) {
      console.error(`Failed to sync save slot ${saveSlot.saveSlot}:`, error);
      failed++;
      errors.push(`Error syncing ${saveSlot.saveSlot}: ${error}`);
    }
  }

  return { synced, failed, errors };
}

/**
 * Check network connectivity and sync status
 */
export async function checkSyncStatus(): Promise<{ online: boolean; needsSync: number }> {
  try {
    // Simple connectivity check
    const response = await fetch(`${API_BASE_URL}/health`, { 
      method: 'HEAD',
      cache: 'no-cache'
    });
    
    const online = response.ok;
    const localSaves = getLocalSaves();
    const needsSync = localSaves.filter(save => (save as any).needsSync).length;
    
    return { online, needsSync };
  } catch (error) {
    const localSaves = getLocalSaves();
    const needsSync = localSaves.filter(save => (save as any).needsSync).length;
    
    return { online: false, needsSync };
  }
}

/**
 * Create a manual backup of a save slot
 */
export async function createBackup(playerId: string, saveSlot: string, reason: string = 'manual'): Promise<SaveGameResponse> {
  try {
    const loadResponse = await loadGameState(playerId, saveSlot);
    if (!loadResponse.success || !loadResponse.gameState) {
      return {
        success: false,
        message: 'Failed to load game state for backup',
        error: 'BACKUP_LOAD_FAILED'
      };
    }
    
    const backupSlot = `${saveSlot}_backup_${Date.now()}`;
    const backupResponse = await saveGameState(loadResponse.gameState, backupSlot);
    
    if (backupResponse.success) {
      return {
        success: true,
        message: `Backup created successfully as ${backupSlot}`,
        saveSlot: backupSlot
      };
    } else {
      return backupResponse;
    }
  } catch (error) {
    console.error('Error creating backup:', error);
    return {
      success: false,
      message: 'Failed to create backup',
      error: 'BACKUP_ERROR'
    };
  }
}