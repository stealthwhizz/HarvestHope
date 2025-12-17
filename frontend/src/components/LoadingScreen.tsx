import React, { useEffect, useState } from 'react';
import type { PreloadProgress } from '../rendering/AssetPreloader';

export interface LoadingScreenProps {
  isLoading: boolean;
  progress?: PreloadProgress;
  title?: string;
  subtitle?: string;
  tips?: string[];
  onComplete?: () => void;
}

export const LoadingScreen: React.FC<LoadingScreenProps> = ({
  isLoading,
  progress,
  title = 'Harvest Hope: The Last Farm',
  subtitle = 'Loading your farming experience...',
  tips = [
    'Tip: Monitor weather patterns to optimize crop yields',
    'Tip: Government schemes like PM-KISAN can provide financial support',
    'Tip: Diversify crops to reduce risk from market fluctuations',
    'Tip: Proper storage can help you wait for better market prices',
    'Tip: Build relationships with NPCs to learn from their experiences',
  ],
  onComplete,
}) => {
  const [currentTip, setCurrentTip] = useState(0);
  const [dots, setDots] = useState('');

  // Rotate tips every 3 seconds
  useEffect(() => {
    if (!isLoading) return;

    const tipInterval = setInterval(() => {
      setCurrentTip((prev) => (prev + 1) % tips.length);
    }, 3000);

    return () => clearInterval(tipInterval);
  }, [isLoading, tips.length]);

  // Animate loading dots
  useEffect(() => {
    if (!isLoading) return;

    const dotInterval = setInterval(() => {
      setDots((prev) => {
        if (prev.length >= 3) return '';
        return prev + '.';
      });
    }, 500);

    return () => clearInterval(dotInterval);
  }, [isLoading]);

  // Call onComplete when loading finishes
  useEffect(() => {
    if (!isLoading && onComplete) {
      const timer = setTimeout(onComplete, 500);
      return () => clearTimeout(timer);
    }
  }, [isLoading, onComplete]);

  if (!isLoading) {
    return null;
  }

  const progressPercentage = progress?.percentage || 0;
  const currentStage = progress?.stage || 'textures';
  const currentAsset = progress?.currentAsset || 'Loading...';

  return (
    <div className="fixed inset-0 bg-gradient-to-b from-green-900 via-green-800 to-green-900 flex items-center justify-center z-50">
      {/* Background pattern */}
      <div className="absolute inset-0 opacity-10">
        <div className="w-full h-full bg-repeat" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }} />
      </div>

      <div className="relative z-10 text-center max-w-md mx-auto px-6">
        {/* Logo/Title */}
        <div className="mb-8">
          <div className="w-24 h-24 mx-auto mb-4 bg-yellow-400 rounded-full flex items-center justify-center shadow-lg">
            <div className="text-4xl">🌾</div>
          </div>
          <h1 className="text-4xl font-bold text-white mb-2 pixel-font">
            {title}
          </h1>
          <p className="text-green-200 text-lg">
            {subtitle}
          </p>
        </div>

        {/* Progress Bar */}
        <div className="mb-6">
          <div className="bg-green-700 rounded-full h-4 mb-2 overflow-hidden shadow-inner">
            <div
              className="bg-gradient-to-r from-yellow-400 to-green-400 h-full rounded-full transition-all duration-300 ease-out shadow-sm"
              style={{ width: `${progressPercentage}%` }}
            />
          </div>
          <div className="flex justify-between text-sm text-green-200">
            <span>{progressPercentage}%</span>
            <span>{progress?.loaded || 0} / {progress?.total || 0}</span>
          </div>
        </div>

        {/* Current Stage */}
        <div className="mb-6">
          <div className="text-white font-semibold mb-1">
            {getStageDisplayName(currentStage)}{dots}
          </div>
          <div className="text-green-300 text-sm truncate">
            {currentAsset}
          </div>
        </div>

        {/* Stage Indicators */}
        <div className="flex justify-center space-x-4 mb-8">
          {['textures', 'spritesheets', 'audio', 'complete'].map((stage) => (
            <div
              key={stage}
              className={`flex flex-col items-center ${
                getStageIndex(currentStage) >= getStageIndex(stage)
                  ? 'text-yellow-400'
                  : 'text-green-600'
              }`}
            >
              <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center mb-1 ${
                getStageIndex(currentStage) >= getStageIndex(stage)
                  ? 'border-yellow-400 bg-yellow-400 text-green-900'
                  : 'border-green-600'
              }`}>
                {getStageIndex(currentStage) > getStageIndex(stage) ? '✓' : getStageIcon(stage)}
              </div>
              <span className="text-xs">{getStageDisplayName(stage)}</span>
            </div>
          ))}
        </div>

        {/* Loading Tips */}
        <div className="bg-green-800 bg-opacity-50 rounded-lg p-4 border border-green-600">
          <div className="text-yellow-400 font-semibold mb-2">💡 Did you know?</div>
          <div className="text-green-100 text-sm leading-relaxed">
            {tips[currentTip]}
          </div>
        </div>

        {/* Retro Loading Animation */}
        <div className="mt-6 flex justify-center">
          <div className="flex space-x-1">
            {[0, 1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse"
                style={{
                  animationDelay: `${i * 0.2}s`,
                  animationDuration: '1s',
                }}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Pixel art style CSS */}
      <style>{`
        .pixel-font {
          font-family: 'Courier New', monospace;
          text-shadow: 2px 2px 0px rgba(0, 0, 0, 0.5);
        }
        
        @keyframes pulse {
          0%, 100% { opacity: 0.4; }
          50% { opacity: 1; }
        }
        
        .animate-pulse {
          animation: pulse 1s infinite;
        }
      `}</style>
    </div>
  );
};

function getStageDisplayName(stage: string): string {
  switch (stage) {
    case 'textures': return 'Textures';
    case 'spritesheets': return 'Sprites';
    case 'audio': return 'Audio';
    case 'complete': return 'Complete';
    default: return 'Loading';
  }
}

function getStageIcon(stage: string): string {
  switch (stage) {
    case 'textures': return '🖼️';
    case 'spritesheets': return '🎨';
    case 'audio': return '🔊';
    case 'complete': return '✅';
    default: return '⏳';
  }
}

function getStageIndex(stage: string): number {
  switch (stage) {
    case 'textures': return 0;
    case 'spritesheets': return 1;
    case 'audio': return 2;
    case 'complete': return 3;
    default: return -1;
  }
}

// Progress indicator for specific operations
export interface ProgressIndicatorProps {
  progress: number;
  label?: string;
  size?: 'small' | 'medium' | 'large';
  color?: 'green' | 'blue' | 'yellow' | 'red';
  showPercentage?: boolean;
}

export const ProgressIndicator: React.FC<ProgressIndicatorProps> = ({
  progress,
  label,
  size = 'medium',
  color = 'green',
  showPercentage = true,
}) => {
  const sizeClasses = {
    small: 'h-2',
    medium: 'h-4',
    large: 'h-6',
  };

  const colorClasses = {
    green: 'from-green-400 to-green-600',
    blue: 'from-blue-400 to-blue-600',
    yellow: 'from-yellow-400 to-yellow-600',
    red: 'from-red-400 to-red-600',
  };

  return (
    <div className="w-full">
      {label && (
        <div className="flex justify-between text-sm text-gray-600 mb-1">
          <span>{label}</span>
          {showPercentage && <span>{Math.round(progress)}%</span>}
        </div>
      )}
      <div className={`bg-gray-200 rounded-full ${sizeClasses[size]} overflow-hidden`}>
        <div
          className={`bg-gradient-to-r ${colorClasses[color]} h-full rounded-full transition-all duration-300 ease-out`}
          style={{ width: `${Math.max(0, Math.min(100, progress))}%` }}
        />
      </div>
    </div>
  );
};

// Mini loading spinner for inline use
export const LoadingSpinner: React.FC<{
  size?: 'small' | 'medium' | 'large';
  color?: string;
}> = ({ size = 'medium', color = 'text-green-600' }) => {
  const sizeClasses = {
    small: 'w-4 h-4',
    medium: 'w-6 h-6',
    large: 'w-8 h-8',
  };

  return (
    <div className={`${sizeClasses[size]} ${color} animate-spin`}>
      <svg className="w-full h-full" fill="none" viewBox="0 0 24 24">
        <circle
          className="opacity-25"
          cx="12"
          cy="12"
          r="10"
          stroke="currentColor"
          strokeWidth="4"
        />
        <path
          className="opacity-75"
          fill="currentColor"
          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
        />
      </svg>
    </div>
  );
};