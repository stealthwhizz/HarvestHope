/**
 * Government Scheme Notification Component
 * Shows contextual scheme recommendations based on current game state and events
 */

import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import type { RootState } from '../store';
import { GovernmentSchemeRecommendations, type SchemeRecommendation } from '../utils/governmentSchemeRecommendations';
import { GovernmentSchemeEducation } from './GovernmentSchemeEducation';

interface GovernmentSchemeNotificationProps {
  onDismiss?: () => void;
  autoShow?: boolean;
}

export const GovernmentSchemeNotification: React.FC<GovernmentSchemeNotificationProps> = ({
  onDismiss,
  autoShow = true
}) => {
  const gameState = useSelector((state: RootState) => ({
    player: state.player,
    farm: state.farm,
    economics: state.economics,
    season: state.season,
    weather: state.weather,
    npcs: state.npcs,
    events: state.events,
    stats: state.stats,
    progress: state.progress
  }));

  const [recommendations, setRecommendations] = useState<SchemeRecommendation[]>([]);
  const [showNotification, setShowNotification] = useState(false);
  const [showFullEducation, setShowFullEducation] = useState(false);
  const [selectedContext, setSelectedContext] = useState<'financial_crisis' | 'crop_loss' | 'low_income' | 'debt_burden' | 'general'>('general');

  // Analyze game state for recommendations
  useEffect(() => {
    const newRecommendations = GovernmentSchemeRecommendations.analyzeAndRecommend(gameState);
    setRecommendations(newRecommendations);
    
    // Auto-show notification for high priority recommendations
    if (autoShow && newRecommendations.some(r => r.priority === 'high' && r.urgency >= 8)) {
      setShowNotification(true);
    }
  }, [gameState, autoShow]);

  const handleShowEducation = (context: typeof selectedContext) => {
    setSelectedContext(context);
    setShowFullEducation(true);
    setShowNotification(false);
  };

  const handleDismiss = () => {
    setShowNotification(false);
    onDismiss?.();
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'border-red-400 bg-red-50';
      case 'medium': return 'border-yellow-400 bg-yellow-50';
      case 'low': return 'border-blue-400 bg-blue-50';
      default: return 'border-gray-400 bg-gray-50';
    }
  };

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'high': return '🚨';
      case 'medium': return '⚠️';
      case 'low': return 'ℹ️';
      default: return '📋';
    }
  };

  if (showFullEducation) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg max-w-6xl max-h-[90vh] overflow-y-auto">
          <div className="p-4 border-b flex justify-between items-center">
            <h2 className="text-xl font-bold">Government Scheme Information</h2>
            <button
              onClick={() => setShowFullEducation(false)}
              className="text-gray-500 hover:text-gray-700 text-2xl"
            >
              ×
            </button>
          </div>
          <GovernmentSchemeEducation context={selectedContext} />
        </div>
      </div>
    );
  }

  if (!showNotification || recommendations.length === 0) {
    return null;
  }

  return (
    <div className="fixed top-4 right-4 max-w-md bg-white border border-gray-200 rounded-lg shadow-lg z-40">
      <div className="p-4">
        <div className="flex justify-between items-start mb-3">
          <h3 className="text-lg font-semibold text-gray-900">
            📋 Government Scheme Recommendations
          </h3>
          <button
            onClick={handleDismiss}
            className="text-gray-400 hover:text-gray-600"
          >
            ×
          </button>
        </div>

        <div className="space-y-3">
          {recommendations.slice(0, 2).map((recommendation, index) => (
            <div
              key={index}
              className={`p-3 border-l-4 rounded-r ${getPriorityColor(recommendation.priority)}`}
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center">
                  <span className="mr-2">{getPriorityIcon(recommendation.priority)}</span>
                  <span className="font-medium text-sm capitalize">
                    {recommendation.priority} Priority
                  </span>
                </div>
                <span className="text-xs text-gray-500">
                  Urgency: {recommendation.urgency}/10
                </span>
              </div>
              
              <p className="text-sm text-gray-700 mb-2">
                {recommendation.reason}
              </p>
              
              <div className="text-xs text-gray-600 mb-3">
                <strong>Recommended schemes:</strong> {recommendation.recommendedSchemes.join(', ')}
              </div>
              
              <button
                onClick={() => handleShowEducation(recommendation.context)}
                className="w-full bg-blue-600 text-white text-sm py-2 px-3 rounded hover:bg-blue-700 transition-colors"
              >
                Learn More & Apply
              </button>
            </div>
          ))}
        </div>

        {recommendations.length > 2 && (
          <div className="mt-3 text-center">
            <button
              onClick={() => handleShowEducation('general')}
              className="text-blue-600 text-sm hover:text-blue-800"
            >
              View all {recommendations.length} recommendations
            </button>
          </div>
        )}

        <div className="mt-3 pt-3 border-t border-gray-200">
          <div className="flex justify-between text-xs text-gray-500">
            <span>Based on your current situation</span>
            <button
              onClick={handleDismiss}
              className="text-blue-600 hover:text-blue-800"
            >
              Dismiss
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// Emergency Scheme Alert Component
export const EmergencySchemeAlert: React.FC = () => {
  const gameState = useSelector((state: RootState) => ({
    player: state.player,
    farm: state.farm,
    economics: state.economics,
    season: state.season,
    weather: state.weather,
    npcs: state.npcs,
    events: state.events,
    stats: state.stats,
    progress: state.progress
  }));

  const [emergencyStatus, setEmergencyStatus] = useState<{
    isEligible: boolean;
    emergencySchemes: string[];
    reason: string;
  } | null>(null);

  const [showAlert, setShowAlert] = useState(false);

  useEffect(() => {
    const status = GovernmentSchemeRecommendations.checkEmergencyEligibility(gameState);
    setEmergencyStatus(status);
    setShowAlert(status.isEligible);
  }, [gameState]);

  if (!showAlert || !emergencyStatus?.isEligible) {
    return null;
  }

  return (
    <div className="fixed top-20 left-1/2 transform -translate-x-1/2 max-w-lg bg-red-50 border-2 border-red-400 rounded-lg shadow-lg z-50">
      <div className="p-4">
        <div className="flex items-center mb-3">
          <span className="text-2xl mr-3">🚨</span>
          <h3 className="text-lg font-bold text-red-800">
            Emergency Support Available
          </h3>
        </div>
        
        <p className="text-red-700 mb-3">
          {emergencyStatus.reason}
        </p>
        
        <div className="bg-white p-3 rounded border border-red-200 mb-3">
          <p className="text-sm text-gray-700 mb-2">
            <strong>Emergency schemes available:</strong>
          </p>
          <ul className="text-sm text-gray-600">
            {emergencyStatus.emergencySchemes.map((scheme, index) => (
              <li key={index}>• {scheme}</li>
            ))}
          </ul>
        </div>
        
        <div className="flex gap-2">
          <button
            onClick={() => setShowAlert(false)}
            className="flex-1 bg-red-600 text-white py-2 px-4 rounded hover:bg-red-700 transition-colors"
          >
            Get Emergency Help
          </button>
          <button
            onClick={() => setShowAlert(false)}
            className="px-4 py-2 text-red-600 hover:text-red-800"
          >
            Later
          </button>
        </div>
      </div>
    </div>
  );
};

// Personalized Recommendation Widget
export const PersonalizedSchemeWidget: React.FC = () => {
  const gameState = useSelector((state: RootState) => ({
    player: state.player,
    farm: state.farm,
    economics: state.economics,
    season: state.season,
    weather: state.weather,
    npcs: state.npcs,
    events: state.events,
    stats: state.stats,
    progress: state.progress
  }));

  const [personalizedRec, setPersonalizedRec] = useState<{
    primaryRecommendation: string;
    secondaryRecommendations: string[];
    reasoning: string;
  } | null>(null);

  useEffect(() => {
    const rec = GovernmentSchemeRecommendations.getPersonalizedRecommendations(gameState);
    setPersonalizedRec(rec);
  }, [gameState]);

  if (!personalizedRec) {
    return null;
  }

  return (
    <div className="bg-gradient-to-r from-blue-50 to-green-50 border border-blue-200 rounded-lg p-4 mb-4">
      <div className="flex items-center mb-3">
        <span className="text-xl mr-2">🎯</span>
        <h4 className="font-semibold text-gray-800">Personalized for You</h4>
      </div>
      
      <div className="mb-3">
        <p className="text-sm font-medium text-blue-800 mb-1">
          Primary Recommendation:
        </p>
        <p className="text-lg font-bold text-blue-900">
          {personalizedRec.primaryRecommendation}
        </p>
      </div>
      
      {personalizedRec.secondaryRecommendations.length > 0 && (
        <div className="mb-3">
          <p className="text-sm font-medium text-green-700 mb-1">
            Also Consider:
          </p>
          <p className="text-sm text-green-800">
            {personalizedRec.secondaryRecommendations.join(', ')}
          </p>
        </div>
      )}
      
      <p className="text-xs text-gray-600 italic">
        {personalizedRec.reasoning}
      </p>
    </div>
  );
};