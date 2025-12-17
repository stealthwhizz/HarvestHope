import React, { useRef, useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { PixiGameEngine } from '../rendering/PixiGameEngine';
import { AudioManager } from '../audio/AudioManager';
import { LoadingScreen } from './LoadingScreen';
import type { PixiGameEngineConfig } from '../rendering/PixiGameEngine';
import type { PreloadProgress } from '../rendering/AssetPreloader';
import type { RootState } from '../store';

export interface PixiGameCanvasProps {
  width?: number;
  height?: number;
  className?: string;
  enableCRTShader?: boolean;
  enableAnimations?: boolean;
  enableAudio?: boolean;
}

export const PixiGameCanvas: React.FC<PixiGameCanvasProps> = ({
  width = 800,
  height = 600,
  className = '',
  enableCRTShader = true,
  enableAnimations = true,
  enableAudio = true,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<PixiGameEngine | null>(null);
  const audioManagerRef = useRef<AudioManager | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [audioInitialized, setAudioInitialized] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [preloadProgress, setPreloadProgress] = useState<PreloadProgress | undefined>();
  const [performanceMetrics, setPerformanceMetrics] = useState<any>(null);

  // Get farm data from Redux store
  const farmData = useSelector((state: RootState) => state.farm);

  // PixiJS configuration for retro pixel art
  const engineConfig: PixiGameEngineConfig = {
    width,
    height,
    backgroundColor: 0x87CEEB, // Sky blue background
    antialias: false, // Disabled for pixel art
    resolution: 1, // Keep at 1 for pixel perfect rendering
    enableCRTShader,
    enableAnimations,
  };

  useEffect(() => {
    const initializeEngine = async () => {
      if (!canvasRef.current || engineRef.current) {
        return;
      }

      try {
        setIsLoading(true);
        
        // Initialize PixiJS engine
        const engine = new PixiGameEngine(engineConfig);
        await engine.initialize(canvasRef.current);
        
        // Preload critical assets with progress tracking
        await engine.preloadAssets((progress) => {
          setPreloadProgress(progress);
        });
        
        engineRef.current = engine;

        // Initialize audio manager
        if (enableAudio) {
          const audioManager = new AudioManager({
            masterVolume: 0.7,
            musicVolume: 0.4,
            sfxVolume: 0.6,
            enabled: true,
          });
          await audioManager.initialize();
          audioManagerRef.current = audioManager;
          setAudioInitialized(true);

          // Start background music
          audioManager.playMusic('farm_theme');
        }
        
        // Set up performance monitoring
        const metrics = engine.getPerformanceMetrics();
        setPerformanceMetrics(metrics);
        
        // Update performance metrics periodically
        const metricsInterval = setInterval(() => {
          if (engineRef.current) {
            const currentMetrics = engineRef.current.getPerformanceMetrics();
            setPerformanceMetrics(currentMetrics);
          }
        }, 1000);
        
        setIsInitialized(true);
        setIsLoading(false);
        setError(null);
        
        // Cleanup function
        return () => {
          clearInterval(metricsInterval);
        };

        // Set up wheel event listener for camera zoom
        const handleWheel = (event: WheelEvent) => {
          if (engineRef.current) {
            // The camera controller's handleWheel method will be called
            // through the engine's input handling system
            engineRef.current.handleInput('camera_zoom', {
              factor: event.deltaY > 0 ? 0.9 : 1.1,
              centerX: event.offsetX,
              centerY: event.offsetY,
            });
          }
        };

        canvasRef.current?.addEventListener('wheel', handleWheel, { passive: false });

        // Cleanup function
        return () => {
          if (canvasRef.current) {
            canvasRef.current.removeEventListener('wheel', handleWheel);
          }
        };
      } catch (err) {
        console.error('Failed to initialize PixiJS engine:', err);
        setError(err instanceof Error ? err.message : 'Unknown error occurred');
      }
    };

    initializeEngine();

    // Cleanup on unmount
    return () => {
      if (audioManagerRef.current) {
        audioManagerRef.current.stopMusic(false);
        audioManagerRef.current = null;
      }
      if (engineRef.current) {
        engineRef.current.destroy();
        engineRef.current = null;
      }
    };
  }, []);

  // Update farm data when it changes
  useEffect(() => {
    if (isInitialized && engineRef.current && farmData) {
      engineRef.current.updateFarm(farmData);
    }
  }, [farmData, isInitialized]);

  // Handle canvas resize
  useEffect(() => {
    const handleResize = () => {
      if (engineRef.current) {
        engineRef.current.resize(width, height);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [width, height]);

  // Render loop
  useEffect(() => {
    if (!isInitialized || !engineRef.current) {
      return;
    }

    let animationId: number;
    
    const renderLoop = () => {
      if (engineRef.current) {
        engineRef.current.render();
      }
      animationId = requestAnimationFrame(renderLoop);
    };

    animationId = requestAnimationFrame(renderLoop);

    return () => {
      if (animationId) {
        cancelAnimationFrame(animationId);
      }
    };
  }, [isInitialized]);

  const handleCanvasClick = (event: React.MouseEvent<HTMLCanvasElement>) => {
    if (!engineRef.current) return;

    const rect = event.currentTarget.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    // Play UI click sound
    if (audioManagerRef.current) {
      audioManagerRef.current.playSFX('ui_click');
    }

    engineRef.current.handleInput('farm_click', { x, y });
  };

  const handleCanvasMouseEnter = () => {
    if (audioManagerRef.current) {
      audioManagerRef.current.playSFX('ui_hover');
    }
  };

  if (error) {
    return (
      <div className={`flex items-center justify-center bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded ${className}`}>
        <div className="text-center">
          <h3 className="font-bold">PixiJS Engine Error</h3>
          <p>{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`relative ${className}`}>
      {/* Loading Screen */}
      <LoadingScreen
        isLoading={isLoading}
        progress={preloadProgress}
        onComplete={() => setIsLoading(false)}
      />
      
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        onClick={handleCanvasClick}
        onMouseEnter={handleCanvasMouseEnter}
        className="border border-gray-300 cursor-crosshair"
        style={{
          imageRendering: 'pixelated', // CSS property for pixel art
          filter: enableCRTShader ? 'none' : 'none', // CRT shader handles effects
          display: isLoading ? 'none' : 'block',
        }}
      />

      {/* Retro controls */}
      {isInitialized && !isLoading && (
        <div className="absolute top-2 right-2 bg-black bg-opacity-75 text-white text-xs p-2 rounded space-y-1">
          <button
            onClick={() => engineRef.current?.setCRTEnabled(!enableCRTShader)}
            className="block w-full text-left hover:text-yellow-300"
          >
            CRT: {enableCRTShader ? 'ON' : 'OFF'}
          </button>
          {audioInitialized && (
            <button
              onClick={() => {
                const audio = audioManagerRef.current;
                if (audio) {
                  const config = audio.getConfig();
                  audio.setEnabled(!config.enabled);
                }
              }}
              className="block w-full text-left hover:text-yellow-300"
            >
              Audio: {audioInitialized ? 'ON' : 'OFF'}
            </button>
          )}
          <button
            onClick={() => {
              const currentQuality = engineRef.current?.getCurrentQuality() || 'high';
              const qualities = ['low', 'medium', 'high'];
              const nextQuality = qualities[(qualities.indexOf(currentQuality) + 1) % qualities.length];
              engineRef.current?.setQuality(nextQuality as any);
            }}
            className="block w-full text-left hover:text-yellow-300"
          >
            Quality: {engineRef.current?.getCurrentQuality()?.toUpperCase() || 'HIGH'}
          </button>
        </div>
      )}

      {/* Performance Monitor (Development) */}
      {isInitialized && !isLoading && performanceMetrics && import.meta.env.DEV && (
        <div className="absolute top-2 left-2 bg-black bg-opacity-75 text-white text-xs p-2 rounded space-y-1">
          <div>FPS: {performanceMetrics.fps}</div>
          <div>Frame: {performanceMetrics.frameTime}ms</div>
          <div>Memory: {performanceMetrics.memoryUsage}MB</div>
          <div>Objects: {performanceMetrics.activeObjects}</div>
          <div>Draws: {performanceMetrics.drawCalls}</div>
          <div>Crops: {farmData?.crops?.length || 0}</div>
        </div>
      )}

      {/* Quality indicator */}
      {isInitialized && !isLoading && (
        <div className="absolute bottom-2 right-2 bg-black bg-opacity-50 text-white text-xs px-2 py-1 rounded">
          Quality: {engineRef.current?.getCurrentQuality()?.toUpperCase() || 'HIGH'}
        </div>
      )}
    </div>
  );
};