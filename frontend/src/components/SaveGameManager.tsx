/**
 * Save Game Manager Component
 * Handles multiple save slots, cloud sync, and backup management
 */

import React, { useState, useEffect } from 'react';
import { 
  getSaveSlots, 
  loadGameState, 
  saveGameState, 
  deleteGameState, 
  createBackup, 
  restoreFromBackup,
  syncLocalSaves,
  checkSyncStatus,
  type SaveSlot,
  type BackupSlot 
} from '../store/services/persistenceService';
import type { GameState } from '../../../shared/types/game-state';

interface SaveGameManagerProps {
  playerId: string;
  currentGameState?: GameState;
  onLoadGame: (gameState: GameState, saveSlot: string) => void;
  onClose: () => void;
  isOpen: boolean;
}

interface SyncStatus {
  online: boolean;
  needsSync: number;
  syncing: boolean;
}

export const SaveGameManager: React.FC<SaveGameManagerProps> = ({
  playerId,
  currentGameState,
  onLoadGame,
  onClose,
  isOpen
}) => {
  const [saveSlots, setSaveSlots] = useState<SaveSlot[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [selectedSlot, setSelectedSlot] = useState<string>('');
  const [showBackups, setShowBackups] = useState<string>('');
  const [backupSlots, setBackupSlots] = useState<BackupSlot[]>([]);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>({ online: true, needsSync: 0, syncing: false });
  const [newSlotName, setNewSlotName] = useState<string>('');
  const [showNewSlot, setShowNewSlot] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadSaveSlots();
      checkSync();
    }
  }, [isOpen, playerId]);

  const loadSaveSlots = async () => {
    setLoading(true);
    setError('');
    
    try {
      const response = await getSaveSlots(playerId);
      if (response.success) {
        setSaveSlots(response.saveSlots);
      } else {
        setError(response.message || 'Failed to load save slots');
      }
    } catch (err) {
      setError('Failed to load save slots');
      console.error('Error loading save slots:', err);
    } finally {
      setLoading(false);
    }
  };

  const checkSync = async () => {
    try {
      const status = await checkSyncStatus();
      setSyncStatus(prev => ({ ...prev, ...status }));
    } catch (err) {
      console.error('Error checking sync status:', err);
    }
  };

  const handleSaveGame = async (saveSlot: string, farmName?: string) => {
    if (!currentGameState) return;

    setLoading(true);
    setError('');

    try {
      // Update farm name if provided
      const gameStateToSave = farmName ? {
        ...currentGameState,
        farm: { ...currentGameState.farm, name: farmName }
      } : currentGameState;

      const response = await saveGameState(gameStateToSave, saveSlot);
      if (response.success) {
        await loadSaveSlots();
        setShowNewSlot(false);
        setNewSlotName('');
      } else {
        setError(response.message || 'Failed to save game');
      }
    } catch (err) {
      setError('Failed to save game');
      console.error('Error saving game:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleLoadGame = async (saveSlot: string) => {
    setLoading(true);
    setError('');

    try {
      const response = await loadGameState(playerId, saveSlot);
      if (response.success && response.gameState) {
        onLoadGame(response.gameState, saveSlot);
        onClose();
      } else if (response.error === 'CORRUPTION_DETECTED' && response.backups) {
        setBackupSlots(response.backups);
        setShowBackups(saveSlot);
        setError('Save data corrupted. Please select a backup to restore.');
      } else {
        setError(response.message || 'Failed to load game');
      }
    } catch (err) {
      setError('Failed to load game');
      console.error('Error loading game:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteSlot = async (saveSlot: string) => {
    if (!confirm(`Are you sure you want to delete save slot "${saveSlot}"? This action cannot be undone.`)) {
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await deleteGameState(playerId, saveSlot);
      if (response.success) {
        await loadSaveSlots();
      } else {
        setError(response.message || 'Failed to delete save slot');
      }
    } catch (err) {
      setError('Failed to delete save slot');
      console.error('Error deleting save slot:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateBackup = async (saveSlot: string) => {
    setLoading(true);
    setError('');

    try {
      const response = await createBackup(playerId, saveSlot, 'manual');
      if (response.success) {
        await loadSaveSlots();
        alert(`Backup created successfully: ${response.saveSlot}`);
      } else {
        setError(response.message || 'Failed to create backup');
      }
    } catch (err) {
      setError('Failed to create backup');
      console.error('Error creating backup:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleRestoreBackup = async (backupSlot: string, targetSlot: string) => {
    setLoading(true);
    setError('');

    try {
      const response = await restoreFromBackup(playerId, backupSlot, targetSlot);
      if (response.success && response.gameState) {
        await loadSaveSlots();
        setShowBackups('');
        setBackupSlots([]);
        alert('Backup restored successfully!');
      } else {
        setError(response.message || 'Failed to restore backup');
      }
    } catch (err) {
      setError('Failed to restore backup');
      console.error('Error restoring backup:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSync = async () => {
    setSyncStatus(prev => ({ ...prev, syncing: true }));
    setError('');

    try {
      const result = await syncLocalSaves(playerId);
      if (result.synced > 0) {
        await loadSaveSlots();
        alert(`Successfully synced ${result.synced} save(s) to cloud.`);
      }
      if (result.failed > 0) {
        setError(`Failed to sync ${result.failed} save(s). ${result.errors.join(', ')}`);
      }
      await checkSync();
    } catch (err) {
      setError('Failed to sync saves');
      console.error('Error syncing saves:', err);
    } finally {
      setSyncStatus(prev => ({ ...prev, syncing: false }));
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return 'Never';
    try {
      return new Date(dateString).toLocaleString();
    } catch {
      return 'Invalid date';
    }
  };

  const getNextAvailableSlot = () => {
    const usedSlots = new Set(saveSlots.map(slot => slot.saveSlot));
    for (let i = 1; i <= 10; i++) {
      const slotName = `slot${i}`;
      if (!usedSlots.has(slotName)) {
        return slotName;
      }
    }
    return `slot${Date.now()}`;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gray-900 text-green-400 p-6 rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto border-2 border-green-500">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold">Save Game Manager</h2>
          <div className="flex items-center gap-4">
            {/* Sync Status */}
            <div className="flex items-center gap-2">
              <div className={`w-3 h-3 rounded-full ${syncStatus.online ? 'bg-green-500' : 'bg-red-500'}`}></div>
              <span className="text-sm">
                {syncStatus.online ? 'Online' : 'Offline'}
                {syncStatus.needsSync > 0 && ` (${syncStatus.needsSync} need sync)`}
              </span>
              {syncStatus.needsSync > 0 && (
                <button
                  onClick={handleSync}
                  disabled={syncStatus.syncing || loading}
                  className="px-3 py-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 rounded text-sm"
                >
                  {syncStatus.syncing ? 'Syncing...' : 'Sync Now'}
                </button>
              )}
            </div>
            <button
              onClick={onClose}
              className="text-red-400 hover:text-red-300 text-xl"
            >
              ×
            </button>
          </div>
        </div>

        {error && (
          <div className="bg-red-900 border border-red-500 text-red-200 p-3 rounded mb-4">
            {error}
          </div>
        )}

        {/* New Save Slot */}
        <div className="mb-6">
          {!showNewSlot ? (
            <button
              onClick={() => setShowNewSlot(true)}
              disabled={loading}
              className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 rounded"
            >
              Create New Save Slot
            </button>
          ) : (
            <div className="bg-gray-800 p-4 rounded border border-gray-600">
              <h3 className="text-lg font-semibold mb-3">Create New Save Slot</h3>
              <div className="flex gap-3 items-end">
                <div>
                  <label className="block text-sm mb-1">Farm Name:</label>
                  <input
                    type="text"
                    value={newSlotName}
                    onChange={(e) => setNewSlotName(e.target.value)}
                    placeholder="Enter farm name..."
                    className="px-3 py-2 bg-gray-700 border border-gray-500 rounded text-white"
                  />
                </div>
                <button
                  onClick={() => handleSaveGame(getNextAvailableSlot(), newSlotName || undefined)}
                  disabled={loading || !currentGameState}
                  className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 rounded"
                >
                  Save
                </button>
                <button
                  onClick={() => {
                    setShowNewSlot(false);
                    setNewSlotName('');
                  }}
                  className="px-4 py-2 bg-gray-600 hover:bg-gray-700 rounded"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Save Slots List */}
        <div className="space-y-3">
          <h3 className="text-xl font-semibold">Save Slots</h3>
          
          {loading && saveSlots.length === 0 ? (
            <div className="text-center py-8">Loading save slots...</div>
          ) : saveSlots.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              No save slots found. Create your first save slot above.
            </div>
          ) : (
            saveSlots.map((slot) => (
              <div key={slot.saveSlot} className="bg-gray-800 p-4 rounded border border-gray-600">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <h4 className="text-lg font-semibold text-green-300">{slot.farmName}</h4>
                    <div className="text-sm text-gray-300 mt-1">
                      <div>Slot: {slot.saveSlot}</div>
                      <div>Season: {slot.season}, Day {slot.day}</div>
                      <div>Money: ₹{slot.money.toLocaleString()}</div>
                      <div>Last Saved: {formatDate(slot.lastSaved)}</div>
                      {slot.deviceId && (
                        <div className="text-xs text-gray-400">Device: {slot.deviceId}</div>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex gap-2 ml-4">
                    <button
                      onClick={() => handleLoadGame(slot.saveSlot)}
                      disabled={loading}
                      className="px-3 py-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 rounded text-sm"
                    >
                      Load
                    </button>
                    
                    {currentGameState && (
                      <button
                        onClick={() => handleSaveGame(slot.saveSlot)}
                        disabled={loading}
                        className="px-3 py-1 bg-yellow-600 hover:bg-yellow-700 disabled:bg-gray-600 rounded text-sm"
                      >
                        Overwrite
                      </button>
                    )}
                    
                    <button
                      onClick={() => handleCreateBackup(slot.saveSlot)}
                      disabled={loading}
                      className="px-3 py-1 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 rounded text-sm"
                    >
                      Backup
                    </button>
                    
                    <button
                      onClick={() => handleDeleteSlot(slot.saveSlot)}
                      disabled={loading}
                      className="px-3 py-1 bg-red-600 hover:bg-red-700 disabled:bg-gray-600 rounded text-sm"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Backup Recovery Modal */}
        {showBackups && backupSlots.length > 0 && (
          <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-60">
            <div className="bg-gray-900 p-6 rounded-lg max-w-2xl w-full border-2 border-yellow-500">
              <h3 className="text-xl font-bold text-yellow-400 mb-4">
                Corrupted Save Detected - Select Backup to Restore
              </h3>
              
              <div className="space-y-3 mb-6">
                {backupSlots.map((backup) => (
                  <div key={backup.saveSlot} className="bg-gray-800 p-3 rounded border border-gray-600">
                    <div className="flex justify-between items-center">
                      <div>
                        <div className="font-semibold">{backup.saveSlot}</div>
                        <div className="text-sm text-gray-300">
                          Last Saved: {formatDate(backup.lastSaved)}
                        </div>
                        <div className="text-sm text-gray-400">
                          Reason: {backup.backupReason}
                        </div>
                      </div>
                      <button
                        onClick={() => handleRestoreBackup(backup.saveSlot, showBackups)}
                        disabled={loading}
                        className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 rounded"
                      >
                        Restore
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => {
                    setShowBackups('');
                    setBackupSlots([]);
                  }}
                  className="px-4 py-2 bg-gray-600 hover:bg-gray-700 rounded"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SaveGameManager;