/**
 * Event Dialog Component
 * Detailed modal for event interaction and consequence display
 */

import React, { useState } from 'react';
import type { GameEvent, EventChoice, ResolvedConsequences } from '../../../shared/types/game-state';

interface EventDialogProps {
  event: GameEvent | null;
  isOpen: boolean;
  onClose: () => void;
  onChoiceSelect: (choiceId: string) => Promise<void>;
  isResolving: boolean;
  playerMoney: number;
  consequences?: ResolvedConsequences | null;
}

export const EventDialog: React.FC<EventDialogProps> = ({
  event,
  isOpen,
  onClose,
  onChoiceSelect,
  isResolving,
  playerMoney,
  consequences,
}) => {
  const [showEducationalContent, setShowEducationalContent] = useState(false);
  const [showConsequences, setShowConsequences] = useState(false);

  if (!isOpen || !event) return null;

  const getSeverityColor = (severity?: string): string => {
    switch (severity) {
      case 'critical': return 'text-red-600 bg-red-100';
      case 'high': return 'text-orange-600 bg-orange-100';
      case 'medium': return 'text-yellow-600 bg-yellow-100';
      case 'low': return 'text-green-600 bg-green-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getCategoryIcon = (category?: string): string => {
    switch (category) {
      case 'weather_crisis': return '🌧️';
      case 'financial_crisis': return '💰';
      case 'market_opportunity': return '📈';
      case 'social_crisis': return '👥';
      case 'government_scheme': return '🏛️';
      default: return '⚠️';
    }
  };

  const isChoiceAffordable = (choice: EventChoice): boolean => {
    return choice.cost <= playerMoney;
  };

  const formatConsequenceValue = (key: string, value: any): string => {
    if (typeof value === 'number') {
      if (key.includes('money') || key.includes('cash') || key.includes('cost')) {
        return `₹${Math.abs(value).toLocaleString()}`;
      }
      if (key.includes('percentage') || key.includes('change') || key.includes('yield')) {
        return `${value > 0 ? '+' : ''}${value}%`;
      }
      return value.toString();
    }
    return String(value);
  };

  const getConsequenceColor = (key: string, value: any): string => {
    if (typeof value === 'number') {
      if (key.includes('damage') || key.includes('risk') || key.includes('loss') || key.includes('debt')) {
        return value > 0 ? 'text-red-600' : 'text-green-600';
      }
      if (key.includes('income') || key.includes('gain') || key.includes('benefit') || key.includes('protection')) {
        return value > 0 ? 'text-green-600' : 'text-red-600';
      }
    }
    return 'text-gray-700';
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg max-w-3xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <span className="text-3xl">{getCategoryIcon(event.category)}</span>
              <div>
                <h2 className="text-2xl font-bold text-gray-800">{event.title}</h2>
                {event.severity && (
                  <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${getSeverityColor(event.severity)}`}>
                    {event.severity.toUpperCase()} PRIORITY
                  </span>
                )}
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 text-2xl font-bold"
              disabled={isResolving}
            >
              ×
            </button>
          </div>

          {/* Event Description */}
          <div className="mb-6">
            <div className="bg-gray-50 rounded-lg p-4 mb-4">
              <p className="text-gray-800 leading-relaxed">{event.description}</p>
            </div>

            {/* Educational Content */}
            {event.educational_content && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                <button
                  onClick={() => setShowEducationalContent(!showEducationalContent)}
                  className="flex items-center gap-2 text-blue-700 font-medium mb-2 hover:text-blue-800"
                >
                  📚 Learn More About This Situation
                  <span className="text-sm">
                    {showEducationalContent ? '▼' : '▶'}
                  </span>
                </button>
                {showEducationalContent && (
                  <div className="text-blue-800 text-sm leading-relaxed">
                    {event.educational_content}
                  </div>
                )}
              </div>
            )}

            {/* Event Metadata */}
            <div className="flex justify-between items-center text-sm text-gray-500 mb-4">
              <span>Category: {event.category?.replace('_', ' ').toUpperCase()}</span>
              <span>Expires: {new Date(event.expires_at).toLocaleDateString()}</span>
            </div>
          </div>

          {/* Choices */}
          {!consequences && (
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">
                How do you want to respond?
              </h3>
              <div className="space-y-3">
                {event.choices.map((choice) => {
                  const isAffordable = isChoiceAffordable(choice);
                  const isDisabled = !isAffordable || isResolving;

                  return (
                    <button
                      key={choice.id}
                      onClick={() => !isDisabled && onChoiceSelect(choice.id)}
                      disabled={isDisabled}
                      className={`w-full text-left p-4 rounded-lg border-2 transition-all duration-200 ${
                        isDisabled
                          ? 'border-gray-300 bg-gray-100 text-gray-500 cursor-not-allowed'
                          : 'border-blue-300 bg-blue-50 hover:bg-blue-100 hover:border-blue-400 hover:shadow-md'
                      }`}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <span className="font-medium text-gray-800">{choice.text}</span>
                        {choice.cost > 0 && (
                          <span className={`text-sm font-bold ${
                            !isAffordable ? 'text-red-600' : 'text-gray-600'
                          }`}>
                            ₹{choice.cost.toLocaleString()}
                          </span>
                        )}
                      </div>
                      
                      {/* Choice consequences preview */}
                      {choice.consequences && Object.keys(choice.consequences).length > 0 && (
                        <div className="text-xs text-gray-600 mt-2">
                          <span className="font-medium">Potential effects: </span>
                          {Object.entries(choice.consequences).slice(0, 2).map(([key, value], index) => (
                            <span key={key}>
                              {index > 0 && ', '}
                              {key.replace('_', ' ')}: {formatConsequenceValue(key, value)}
                            </span>
                          ))}
                          {Object.keys(choice.consequences).length > 2 && '...'}
                        </div>
                      )}

                      {!isAffordable && choice.cost > 0 && (
                        <p className="text-xs text-red-600 mt-2">
                          Insufficient funds (need ₹{(choice.cost - playerMoney).toLocaleString()} more)
                        </p>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Consequences Display */}
          {consequences && (
            <div className="mb-6">
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
                <h3 className="text-lg font-semibold text-green-800 mb-2">
                  ✅ Decision Made: {consequences.choice_made}
                </h3>
                {consequences.cost > 0 && (
                  <p className="text-green-700 text-sm">
                    Cost: ₹{consequences.cost.toLocaleString()}
                  </p>
                )}
              </div>

              <button
                onClick={() => setShowConsequences(!showConsequences)}
                className="flex items-center gap-2 text-blue-700 font-medium mb-4 hover:text-blue-800"
              >
                📊 View Detailed Impact
                <span className="text-sm">
                  {showConsequences ? '▼' : '▶'}
                </span>
              </button>

              {showConsequences && (
                <div className="space-y-4">
                  {/* Immediate Effects */}
                  {Object.keys(consequences.immediate_effects).length > 0 && (
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                      <h4 className="font-semibold text-yellow-800 mb-2">Immediate Effects</h4>
                      <div className="space-y-1">
                        {Object.entries(consequences.immediate_effects).map(([key, value]) => (
                          <div key={key} className="flex justify-between text-sm">
                            <span className="text-yellow-700 capitalize">
                              {key.replace('_', ' ')}:
                            </span>
                            <span className={getConsequenceColor(key, value)}>
                              {formatConsequenceValue(key, value)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Long-term Effects */}
                  {Object.keys(consequences.long_term_effects).length > 0 && (
                    <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                      <h4 className="font-semibold text-purple-800 mb-2">Long-term Effects</h4>
                      <div className="space-y-1">
                        {Object.entries(consequences.long_term_effects).map(([key, value]) => (
                          <div key={key} className="flex justify-between text-sm">
                            <span className="text-purple-700 capitalize">
                              {key.replace('_', ' ')}:
                            </span>
                            <span className={getConsequenceColor(key, value)}>
                              {formatConsequenceValue(key, value)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Educational Impact */}
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <h4 className="font-semibold text-blue-800 mb-2">What You Learned</h4>
                    <p className="text-blue-700 text-sm leading-relaxed">
                      {consequences.educational_impact.lesson_learned}
                    </p>
                    <div className="mt-2 text-xs text-blue-600">
                      Topic: {consequences.educational_impact.topic.replace('_', ' ')}
                    </div>
                  </div>
                </div>
              )}

              <div className="mt-6 text-center">
                <button
                  onClick={onClose}
                  className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                >
                  Continue Playing
                </button>
              </div>
            </div>
          )}

          {/* Loading State */}
          {isResolving && (
            <div className="text-center py-8">
              <div className="inline-flex items-center gap-3 text-blue-600">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                <span className="font-medium">Processing your decision...</span>
              </div>
              <p className="text-sm text-gray-600 mt-2">
                Calculating consequences and updating your farm
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default EventDialog;