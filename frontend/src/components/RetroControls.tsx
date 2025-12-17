import React, { useState, useEffect } from 'react';
import { AudioManager } from '../audio/AudioManager';
import type { AudioConfig } from '../audio/AudioManager';

export interface RetroControlsProps {
  audioManager?: AudioManager | null;
  onCRTToggle?: (enabled: boolean) => void;
  onCRTConfigChange?: (config: any) => void;
  className?: string;
}

export const RetroControls: React.FC<RetroControlsProps> = ({
  audioManager,
  onCRTToggle,
  onCRTConfigChange,
  className = '',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [audioConfig, setAudioConfig] = useState<AudioConfig>({
    masterVolume: 0.7,
    musicVolume: 0.5,
    sfxVolume: 0.8,
    enabled: true,
  });
  const [crtConfig, setCrtConfig] = useState({
    enabled: true,
    scanlineIntensity: 0.2,
    curvature: 0.05,
    vignetteIntensity: 0.15,
    noiseIntensity: 0.03,
    brightness: 1.1,
    contrast: 1.15,
  });

  // Update audio config when audioManager changes
  useEffect(() => {
    if (audioManager) {
      setAudioConfig(audioManager.getConfig());
    }
  }, [audioManager]);

  const handleAudioVolumeChange = (type: 'master' | 'music' | 'sfx', value: number) => {
    if (!audioManager) return;

    const newConfig = { ...audioConfig };
    newConfig[`${type}Volume`] = value;
    setAudioConfig(newConfig);

    switch (type) {
      case 'master':
        audioManager.setMasterVolume(value);
        break;
      case 'music':
        audioManager.setMusicVolume(value);
        break;
      case 'sfx':
        audioManager.setSFXVolume(value);
        break;
    }
  };

  const handleAudioToggle = () => {
    if (!audioManager) return;

    const newEnabled = !audioConfig.enabled;
    audioManager.setEnabled(newEnabled);
    setAudioConfig({ ...audioConfig, enabled: newEnabled });
  };

  const handleCRTToggle = () => {
    const newEnabled = !crtConfig.enabled;
    setCrtConfig({ ...crtConfig, enabled: newEnabled });
    onCRTToggle?.(newEnabled);
  };

  const handleCRTConfigChange = (key: string, value: number) => {
    const newConfig = { ...crtConfig, [key]: value };
    setCrtConfig(newConfig);
    onCRTConfigChange?.(newConfig);
  };

  const playTestSound = (soundId: string) => {
    if (audioManager) {
      audioManager.playSFX(soundId);
    }
  };

  const changeMusic = (musicId: string) => {
    if (audioManager) {
      audioManager.playMusic(musicId);
    }
  };

  return (
    <div className={`relative ${className}`}>
      {/* Toggle Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="bg-gray-800 text-white px-3 py-2 rounded text-sm font-mono hover:bg-gray-700 transition-colors"
        style={{
          fontFamily: 'monospace',
          textShadow: '1px 1px 0px #000',
        }}
      >
        RETRO [{isOpen ? '-' : '+'}]
      </button>

      {/* Controls Panel */}
      {isOpen && (
        <div className="absolute top-full right-0 mt-2 bg-gray-900 text-white p-4 rounded-lg shadow-lg z-50 min-w-80">
          <div className="space-y-4 font-mono text-sm">
            
            {/* CRT Shader Controls */}
            <div className="border-b border-gray-700 pb-3">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-green-400 font-bold">CRT DISPLAY</h3>
                <button
                  onClick={handleCRTToggle}
                  className={`px-2 py-1 rounded text-xs ${
                    crtConfig.enabled 
                      ? 'bg-green-600 text-white' 
                      : 'bg-gray-600 text-gray-300'
                  }`}
                >
                  {crtConfig.enabled ? 'ON' : 'OFF'}
                </button>
              </div>
              
              {crtConfig.enabled && (
                <div className="space-y-2">
                  <div>
                    <label className="block text-xs text-gray-300 mb-1">
                      Scanlines: {(crtConfig.scanlineIntensity * 100).toFixed(0)}%
                    </label>
                    <input
                      type="range"
                      min="0"
                      max="0.5"
                      step="0.01"
                      value={crtConfig.scanlineIntensity}
                      onChange={(e) => handleCRTConfigChange('scanlineIntensity', parseFloat(e.target.value))}
                      className="w-full"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-xs text-gray-300 mb-1">
                      Curvature: {(crtConfig.curvature * 100).toFixed(0)}%
                    </label>
                    <input
                      type="range"
                      min="0"
                      max="0.2"
                      step="0.01"
                      value={crtConfig.curvature}
                      onChange={(e) => handleCRTConfigChange('curvature', parseFloat(e.target.value))}
                      className="w-full"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-xs text-gray-300 mb-1">
                      Vignette: {(crtConfig.vignetteIntensity * 100).toFixed(0)}%
                    </label>
                    <input
                      type="range"
                      min="0"
                      max="0.5"
                      step="0.01"
                      value={crtConfig.vignetteIntensity}
                      onChange={(e) => handleCRTConfigChange('vignetteIntensity', parseFloat(e.target.value))}
                      className="w-full"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-xs text-gray-300 mb-1">
                      Noise: {(crtConfig.noiseIntensity * 100).toFixed(0)}%
                    </label>
                    <input
                      type="range"
                      min="0"
                      max="0.1"
                      step="0.001"
                      value={crtConfig.noiseIntensity}
                      onChange={(e) => handleCRTConfigChange('noiseIntensity', parseFloat(e.target.value))}
                      className="w-full"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Audio Controls */}
            {audioManager && (
              <div className="border-b border-gray-700 pb-3">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-yellow-400 font-bold">CHIPTUNE AUDIO</h3>
                  <button
                    onClick={handleAudioToggle}
                    className={`px-2 py-1 rounded text-xs ${
                      audioConfig.enabled 
                        ? 'bg-yellow-600 text-white' 
                        : 'bg-gray-600 text-gray-300'
                    }`}
                  >
                    {audioConfig.enabled ? 'ON' : 'OFF'}
                  </button>
                </div>
                
                {audioConfig.enabled && (
                  <div className="space-y-2">
                    <div>
                      <label className="block text-xs text-gray-300 mb-1">
                        Master: {(audioConfig.masterVolume * 100).toFixed(0)}%
                      </label>
                      <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.01"
                        value={audioConfig.masterVolume}
                        onChange={(e) => handleAudioVolumeChange('master', parseFloat(e.target.value))}
                        className="w-full"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-xs text-gray-300 mb-1">
                        Music: {(audioConfig.musicVolume * 100).toFixed(0)}%
                      </label>
                      <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.01"
                        value={audioConfig.musicVolume}
                        onChange={(e) => handleAudioVolumeChange('music', parseFloat(e.target.value))}
                        className="w-full"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-xs text-gray-300 mb-1">
                        SFX: {(audioConfig.sfxVolume * 100).toFixed(0)}%
                      </label>
                      <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.01"
                        value={audioConfig.sfxVolume}
                        onChange={(e) => handleAudioVolumeChange('sfx', parseFloat(e.target.value))}
                        className="w-full"
                      />
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Music Selection */}
            {audioManager && audioConfig.enabled && (
              <div className="border-b border-gray-700 pb-3">
                <h4 className="text-cyan-400 font-bold mb-2">MUSIC TRACKS</h4>
                <div className="grid grid-cols-1 gap-1">
                  <button
                    onClick={() => changeMusic('farm_theme')}
                    className="bg-gray-700 hover:bg-gray-600 px-2 py-1 rounded text-xs text-left"
                  >
                    🎵 Farm Theme
                  </button>
                  <button
                    onClick={() => changeMusic('market_theme')}
                    className="bg-gray-700 hover:bg-gray-600 px-2 py-1 rounded text-xs text-left"
                  >
                    🎵 Market Theme
                  </button>
                  <button
                    onClick={() => changeMusic('crisis_theme')}
                    className="bg-gray-700 hover:bg-gray-600 px-2 py-1 rounded text-xs text-left"
                  >
                    🎵 Crisis Theme
                  </button>
                </div>
              </div>
            )}

            {/* Sound Effects Test */}
            {audioManager && audioConfig.enabled && (
              <div>
                <h4 className="text-pink-400 font-bold mb-2">SFX TEST</h4>
                <div className="grid grid-cols-2 gap-1">
                  <button
                    onClick={() => playTestSound('plant_seed')}
                    className="bg-gray-700 hover:bg-gray-600 px-2 py-1 rounded text-xs"
                  >
                    🌱 Plant
                  </button>
                  <button
                    onClick={() => playTestSound('harvest_crop')}
                    className="bg-gray-700 hover:bg-gray-600 px-2 py-1 rounded text-xs"
                  >
                    🌾 Harvest
                  </button>
                  <button
                    onClick={() => playTestSound('water_crops')}
                    className="bg-gray-700 hover:bg-gray-600 px-2 py-1 rounded text-xs"
                  >
                    💧 Water
                  </button>
                  <button
                    onClick={() => playTestSound('sell_crop')}
                    className="bg-gray-700 hover:bg-gray-600 px-2 py-1 rounded text-xs"
                  >
                    💰 Sell
                  </button>
                  <button
                    onClick={() => playTestSound('loan_taken')}
                    className="bg-gray-700 hover:bg-gray-600 px-2 py-1 rounded text-xs"
                  >
                    🏦 Loan
                  </button>
                  <button
                    onClick={() => playTestSound('weather_alert')}
                    className="bg-gray-700 hover:bg-gray-600 px-2 py-1 rounded text-xs"
                  >
                    ⚠️ Alert
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};