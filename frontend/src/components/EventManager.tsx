/**
 * Event Manager Component
 * Displays active events and handles player choices
 */

import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import type { RootState, AppDispatch } from '../store';
import { 
  generateEvent, 
  resolveEvent, 
  selectActiveEvents, 
  selectEducationalProgress,
  expireOldEvents 
} from '../store/slices/eventSlice';
import type { GameEvent, EventChoice } from '../../../shared/types/game-state';
import { eventService } from '../services/eventService';

interface EventManagerProps {
  className?: string;
  autoGenerate?: boolean;
  maxActiveEvents?: number;
}

export const EventManager: React.FC<EventManagerProps> = ({
  className = '',
  autoGenerate = true,
  maxActiveEvents = 3,
}) => {
  const dispatch = useDispatch<AppDispatch>();
  const activeEvents = useSelector(selectActiveEvents);
  const educationalProgress = useSelector(selectEducationalProgress);
  const gameState = useSelector((state: RootState) => state);
  
  const [selectedEvent, setSelectedEvent] = useState<GameEvent | null>(null);
  const [isResolving, setIsResolving] = useState(false);
  const [showEducationalContent, setShowEducationalContent] = useState(false);

  // Auto-generate events periodically
  useEffect(() => {
    if (!autoGenerate) return;

    const generateEventPeriodically = () => {
      // Only generate if we have fewer than max active events
      if (activeEvents.length < maxActiveEvents) {
        // Random chance to generate event (20% per check)
        if (Math.random() < 0.2) {
          dispatch(generateEvent(gameState));
        }
      }
    };

    // Check every 30 seconds
    const interval = setInterval(generateEventPeriodically, 30000);
    
    // Also generate one immediately if no events exist
    if (activeEvents.length === 0) {
      dispatch(generateEvent(gameState));
    }

    return () => clearInterval(interval);
  }, [dispatch, gameState, activeEvents.length, maxActiveEvents, autoGenerate]);

  // Clean up expired events
  useEffect(() => {
    const cleanupInterval = setInterval(() => {
      dispatch(expireOldEvents());
    }, 60000); // Check every minute

    return () => clearInterval(cleanupInterval);
  }, [dispatch]);

  const handleEventClick = (event: GameEvent) => {
    setSelectedEvent(event);
    setShowEducationalContent(false);
  };

  const handleChoiceSelect = async (choiceId: string) => {
    if (!selectedEvent) return;

    setIsResolving(true);
    try {
      await dispatch(resolveEvent({
        event: selectedEvent,
        choiceId,
        gameState,
      })).unwrap();
      
      setSelectedEvent(null);
    } catch (error) {
      console.error('Failed to resolve event:', error);
    } finally {
      setIsResolving(false);
    }
  };

  const handleManualGenerate = () => {
    dispatch(generateEvent(gameState));
  };

  const isChoiceAvailable = (choice: EventChoice): boolean => {
    if (!selectedEvent) return false;
    return eventService.isChoiceAvailable(selectedEvent, choice.id, gameState);
  };

  const getChoiceDisabledReason = (choice: EventChoice): string | null => {
    if (choice.cost > (gameState.farm.money || 0)) {
      return `Insufficient funds (₹${choice.cost.toLocaleString()} required)`;
    }
    return null;
  };

  const getSeverityColor = (severity?: string): string => {
    switch (severity) {
      case 'critical': return 'border-red-500 bg-red-50';
      case 'high': return 'border-orange-500 bg-orange-50';
      case 'medium': return 'border-yellow-500 bg-yellow-50';
      case 'low': return 'border-green-500 bg-green-50';
      default: return 'border-gray-500 bg-gray-50';
    }
  };

  const getCategoryIcon = (category?: string): string => {
    switch (category) {
      case 'weather_crisis': return '🌧️';
      case 'extreme_weather': return '🌪️';
      case 'pest_crisis': return '🐛';
      case 'emergency_crisis': return '🚨';
      case 'financial_crisis': return '💰';
      case 'market_opportunity': return '📈';
      case 'social_crisis': return '👥';
      case 'government_scheme': return '🏛️';
      default: return '⚠️';
    }
  };

  return (
    <div className={`event-manager ${className}`}>
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold">Active Events</h3>
        <div className="flex gap-2">
          <button
            onClick={handleManualGenerate}
            className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 text-sm"
            disabled={activeEvents.length >= maxActiveEvents}
          >
            Generate Event
          </button>
          <span className="text-sm text-gray-600">
            {activeEvents.length}/{maxActiveEvents}
          </span>
        </div>
      </div>

      {/* Active Events List */}
      <div className="space-y-3 mb-6">
        {activeEvents.length === 0 ? (
          <div className="text-center text-gray-500 py-8">
            <p>No active events</p>
            <p className="text-sm">Events will appear based on your farming activities</p>
          </div>
        ) : (
          activeEvents.map((event) => (
            <div
              key={event.id}
              className={`border-2 rounded-lg p-4 cursor-pointer hover:shadow-md transition-shadow ${getSeverityColor(event.severity)}`}
              onClick={() => handleEventClick(event)}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xl">{getCategoryIcon(event.category)}</span>
                    <h4 className="font-semibold">{event.title}</h4>
                    {event.severity && (
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        event.severity === 'critical' ? 'bg-red-200 text-red-800' :
                        event.severity === 'high' ? 'bg-orange-200 text-orange-800' :
                        event.severity === 'medium' ? 'bg-yellow-200 text-yellow-800' :
                        'bg-green-200 text-green-800'
                      }`}>
                        {event.severity.toUpperCase()}
                      </span>
                    )}
                    {(event.category === 'extreme_weather' || event.category === 'emergency_crisis') && (
                      <span className="px-2 py-1 rounded text-xs font-medium bg-red-600 text-white animate-pulse">
                        URGENT
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-700 mb-2">{event.description}</p>
                  {(event.category === 'extreme_weather' || event.category === 'emergency_crisis') && (
                    <div className="bg-red-100 border border-red-300 rounded p-2 mb-2">
                      <p className="text-xs text-red-800 font-medium">
                        ⚠️ This is a crisis event requiring immediate attention. Delayed action may result in severe consequences.
                      </p>
                    </div>
                  )}
                  <div className="flex justify-between items-center text-xs text-gray-500">
                    <span>{event.choices.length} choices available</span>
                    <span className={
                      (event.category === 'extreme_weather' || event.category === 'emergency_crisis') 
                        ? 'text-red-600 font-medium' 
                        : ''
                    }>
                      Expires: {new Date(event.expires_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Event Detail Modal */}
      {selectedEvent && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{getCategoryIcon(selectedEvent.category)}</span>
                  <h2 className="text-xl font-bold">{selectedEvent.title}</h2>
                </div>
                <button
                  onClick={() => setSelectedEvent(null)}
                  className="text-gray-500 hover:text-gray-700 text-xl"
                >
                  ×
                </button>
              </div>

              <div className="mb-6">
                <p className="text-gray-700 mb-4">{selectedEvent.description}</p>
                
                {selectedEvent.educational_content && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                    <button
                      onClick={() => setShowEducationalContent(!showEducationalContent)}
                      className="flex items-center gap-2 text-blue-700 font-medium mb-2"
                    >
                      📚 Educational Content
                      <span className="text-sm">
                        {showEducationalContent ? '▼' : '▶'}
                      </span>
                    </button>
                    {showEducationalContent && (
                      <p className="text-blue-800 text-sm">{selectedEvent.educational_content}</p>
                    )}
                  </div>
                )}
              </div>

              <div className="space-y-3">
                <h3 className="font-semibold mb-3">Choose your response:</h3>
                {selectedEvent.choices.map((choice) => {
                  const isAvailable = isChoiceAvailable(choice);
                  const disabledReason = getChoiceDisabledReason(choice);
                  const isDisabled = !isAvailable || !!disabledReason;

                  return (
                    <button
                      key={choice.id}
                      onClick={() => !isDisabled && handleChoiceSelect(choice.id)}
                      disabled={isDisabled || isResolving}
                      className={`w-full text-left p-4 rounded-lg border-2 transition-colors ${
                        isDisabled
                          ? 'border-gray-300 bg-gray-100 text-gray-500 cursor-not-allowed'
                          : 'border-blue-300 bg-blue-50 hover:bg-blue-100 hover:border-blue-400'
                      }`}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <span className="font-medium">{choice.text}</span>
                        {choice.cost > 0 && (
                          <span className={`text-sm font-medium ${
                            choice.cost > (gameState.farm.money || 0) ? 'text-red-600' : 'text-gray-600'
                          }`}>
                            ₹{choice.cost.toLocaleString()}
                          </span>
                        )}
                      </div>
                      {disabledReason && (
                        <p className="text-xs text-red-600">{disabledReason}</p>
                      )}
                    </button>
                  );
                })}
              </div>

              {isResolving && (
                <div className="mt-4 text-center">
                  <div className="inline-flex items-center gap-2 text-blue-600">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                    Processing your choice...
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Educational Progress Summary */}
      {Object.keys(educationalProgress).length > 0 && (
        <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg">
          <h4 className="font-semibold text-green-800 mb-2">Learning Progress</h4>
          <div className="grid grid-cols-2 gap-2 text-sm">
            {Object.entries(educationalProgress).map(([topic, progress]) => (
              <div key={topic} className="flex justify-between">
                <span className="text-green-700 capitalize">{topic.replace('_', ' ')}</span>
                <span className="text-green-600 font-medium">{progress.masteryLevel}%</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default EventManager;