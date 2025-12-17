/**
 * FarmGrid Component - Visual 5x5 grid showing planted crops and empty soil
 */

import React, { useState } from 'react';
import { useDispatch } from 'react-redux';
import { plantCrop } from '../store/slices/farmSlice';

import type { CropData } from '../../../shared/types/game-state';

interface FarmGridProps {
  crops: CropData[];
}

const FarmGrid: React.FC<FarmGridProps> = ({ crops }) => {
  const dispatch = useDispatch();
  const [selectedCropType, setSelectedCropType] = useState<string>('rice');
  
  // Create 5x5 grid
  const gridSize = 5;
  const totalTiles = gridSize * gridSize;

  // Get crop emoji based on type
  const getCropEmoji = (cropType: string) => {
    switch (cropType.toLowerCase()) {
      case 'rice':
        return '🌾';
      case 'wheat':
        return '🌾';
      case 'cotton':
        return '☁️';
      case 'sugarcane':
        return '🎋';
      default:
        return '🌱';
    }
  };

  // Get crop color based on type
  const getCropColor = (cropType: string) => {
    switch (cropType.toLowerCase()) {
      case 'rice':
        return '#90EE90'; // light green
      case 'wheat':
        return '#FFD700'; // gold
      case 'cotton':
        return '#FFFFFF'; // white
      case 'sugarcane':
        return '#98FB98'; // pale green
      default:
        return '#90EE90';
    }
  };

  // Check if a tile has a crop (using crop ID to determine position)
  const getTileContent = (tileIndex: number) => {
    // For now, we'll use a simple mapping based on crop index
    // In a full implementation, you'd store position data with each crop
    return crops[tileIndex] || null;
  };

  // Handle tile click to plant crop
  const handleTileClick = (tileIndex: number) => {
    const x = tileIndex % gridSize;
    const y = Math.floor(tileIndex / gridSize);
    
    // Check if tile is already occupied
    const existingCrop = getTileContent(tileIndex);
    if (existingCrop) {
      return; // Can't plant on occupied tile
    }

    // Plant new crop
    dispatch(plantCrop({
      id: `crop_${Date.now()}_${x}_${y}`,
      type: selectedCropType,
      plantedDate: Date.now(),
      growthStage: 'seedling',
      health: 100,
      expectedYield: 50, // Default expected yield
      area: 0.2 // Each tile represents 0.2 acres
    }));
  };

  return (
    <div className="farm-grid-container">
      <div className="farm-grid-header retro-panel-inset">
        <h3 className="retro-font retro-text-green">🚜 YOUR FARM</h3>
      </div>
      
      <div className="farm-grid retro-border-inset">
        {Array.from({ length: totalTiles }, (_, index) => {
          const crop = getTileContent(index);
          const isEmpty = !crop;
          
          return (
            <div
              key={index}
              className={`farm-tile ${isEmpty ? 'empty-soil' : 'planted-crop'}`}
              onClick={() => handleTileClick(index)}
              style={{
                backgroundColor: isEmpty ? '#8B4513' : getCropColor(crop.type),
                cursor: isEmpty ? 'pointer' : 'default'
              }}
            >
              {isEmpty ? (
                <span className="soil-emoji">🟫</span>
              ) : (
                <span className="crop-emoji" title={`${crop.type} (${crop.growthStage})`}>
                  {getCropEmoji(crop.type)}
                </span>
              )}
            </div>
          );
        })}
      </div>

      {/* Crop Selection */}
      <div className="crop-selection retro-panel">
        <h4 className="retro-font retro-text-amber">SELECT CROP:</h4>
        <div className="crop-buttons">
          {['rice', 'wheat', 'cotton', 'sugarcane'].map(cropType => (
            <button
              key={cropType}
              className={`retro-button ${selectedCropType === cropType ? 'retro-button-green' : ''}`}
              onClick={() => setSelectedCropType(cropType)}
            >
              {getCropEmoji(cropType)} {cropType.toUpperCase()}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default React.memo(FarmGrid);