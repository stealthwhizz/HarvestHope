/**
 * Crop Management Component
 * Provides UI for planting, monitoring, and managing crops
 */

import React, { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import type { RootState } from '../store';
import { plantCrop, updateMoney, updateCropHealth, updateCropYield, updateCropGrowthStage, harvestCrop } from '../store/slices/farmSlice';
import { cropManager } from '../services/cropManager';
import { CROP_TYPES } from '../types/crops';
import type { CropData } from '../../../shared/types/game-state';
import type { PestDiseaseEvent } from '../types/crops';

interface CropManagementProps {
  className?: string;
}

export const CropManagement: React.FC<CropManagementProps> = ({ className = '' }) => {
  const dispatch = useDispatch();
  const { farm, season, weather } = useSelector((state: RootState) => ({
    farm: state.farm,
    season: state.season,
    weather: state.weather,
  }));

  const [selectedCropType, setSelectedCropType] = useState<string>('');
  const [plantingArea, setPlantingArea] = useState<number>(0.5);
  const [showPlantingModal, setShowPlantingModal] = useState(false);
  const [activePestEvents, setActivePestEvents] = useState<Map<string, PestDiseaseEvent[]>>(new Map());

  // Get available crops for current season
  const availableCrops = cropManager.getAvailableCrops(season.current);

  // Update crop growth and health daily
  useEffect(() => {
    const updateCrops = async () => {
      for (const crop of farm.crops) {
        const growthUpdate = await cropManager.updateCropGrowth(
          crop,
          farm.day,
          weather.current,
          farm.soilQuality
        );

        // Update crop in store
        dispatch(updateCropGrowthStage({ id: crop.id, stage: growthUpdate.newStage }));
        dispatch(updateCropHealth({ id: crop.id, healthChange: growthUpdate.healthChange }));
        dispatch(updateCropYield({ id: crop.id, yieldChange: growthUpdate.yieldChange }));

        // Check for pest/disease events
        const pestEvent = cropManager.generatePestDiseaseEvent(crop, farm.day);
        if (pestEvent) {
          setActivePestEvents(prev => {
            const newMap = new Map(prev);
            const events = newMap.get(crop.id) || [];
            events.push(pestEvent);
            newMap.set(crop.id, events);
            return newMap;
          });
        }
      }

      // Clean up expired events
      cropManager.cleanupExpiredEvents(farm.day);
    };

    updateCrops();
  }, [farm.day, weather.current, farm.soilQuality, dispatch, farm.crops]);

  const handlePlantCrop = () => {
    if (!selectedCropType || plantingArea <= 0) return;

    const result = cropManager.plantCrop({
      cropType: selectedCropType,
      area: plantingArea,
      currentDay: farm.day,
      currentSeason: season.current,
      soilQuality: farm.soilQuality,
      availableMoney: farm.money,
    });

    if (result.success && result.crop && result.cost) {
      dispatch(plantCrop(result.crop));
      dispatch(updateMoney(-result.cost));
      setShowPlantingModal(false);
      setSelectedCropType('');
      setPlantingArea(0.5);
    } else {
      alert(result.error || 'Failed to plant crop');
    }
  };

  const handleHarvestCrop = (crop: CropData) => {
    if (!cropManager.isReadyForHarvest(crop, farm.day)) {
      alert('Crop is not ready for harvest yet');
      return;
    }

    // Calculate final yield and revenue
    const yieldResult = cropManager.calculateFinalYield(
      crop,
      weather.forecast.slice(-30), // Last 30 days of weather
      farm.soilQuality
    );

    const cropType = CROP_TYPES[crop.type];
    const revenue = yieldResult.finalYield * cropType.marketPrice;

    dispatch(harvestCrop(crop.id));
    dispatch(updateMoney(revenue));

    alert(`Harvested ${yieldResult.finalYield.toFixed(0)} kg of ${cropType.name} for ₹${revenue.toFixed(0)}`);
  };

  const handleTreatPestDisease = (event: PestDiseaseEvent, cropId: string) => {
    const result = cropManager.treatPestDisease(event.id, cropId);
    
    if (result.success) {
      dispatch(updateMoney(-result.cost));
      
      // Remove event from local state
      setActivePestEvents(prev => {
        const newMap = new Map(prev);
        const events = newMap.get(cropId) || [];
        newMap.set(cropId, events.filter(e => e.id !== event.id));
        return newMap;
      });

      alert(`Treatment successful! Cost: ₹${result.cost}`);
    } else {
      alert(result.error || 'Treatment failed');
    }
  };

  const getGrowthStageProgress = (crop: CropData): number => {
    const cropType = CROP_TYPES[crop.type];
    if (!cropType) return 0;

    const daysGrown = farm.day - crop.plantedDate;
    return Math.min(100, (daysGrown / cropType.growthDuration) * 100);
  };

  const getCropStatusColor = (crop: CropData): string => {
    if (crop.health > 80) return 'text-green-600';
    if (crop.health > 60) return 'text-yellow-600';
    if (crop.health > 40) return 'text-orange-600';
    return 'text-red-600';
  };

  return (
    <div className={`crop-management ${className}`}>
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-800">Crop Management</h2>
          <button
            onClick={() => setShowPlantingModal(true)}
            className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 transition-colors"
            disabled={availableCrops.length === 0}
          >
            Plant Crop
          </button>
        </div>

        {/* Current Crops */}
        <div className="mb-8">
          <h3 className="text-lg font-semibold mb-4">Current Crops ({farm.crops.length})</h3>
          
          {farm.crops.length === 0 ? (
            <p className="text-gray-500 italic">No crops planted yet</p>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {farm.crops.map(crop => {
                const cropType = CROP_TYPES[crop.type];
                const progress = getGrowthStageProgress(crop);
                const isHarvestable = cropManager.isReadyForHarvest(crop, farm.day);
                const pestEvents = activePestEvents.get(crop.id) || [];
                // Use fallback recommendations for now
                const recommendations = ['Weather conditions are favorable for normal crop care'];

                return (
                  <div key={crop.id} className="border rounded-lg p-4 bg-gray-50">
                    <div className="flex justify-between items-start mb-2">
                      <h4 className="font-semibold">{cropType?.name || crop.type}</h4>
                      <span className={`text-sm font-medium ${getCropStatusColor(crop)}`}>
                        {crop.health.toFixed(0)}% Health
                      </span>
                    </div>
                    
                    <div className="space-y-2 text-sm">
                      <div>
                        <span className="text-gray-600">Stage:</span> 
                        <span className="ml-1 capitalize">{crop.growthStage}</span>
                      </div>
                      
                      <div>
                        <span className="text-gray-600">Area:</span> 
                        <span className="ml-1">{crop.area} acres</span>
                      </div>
                      
                      <div>
                        <span className="text-gray-600">Expected Yield:</span> 
                        <span className="ml-1">{crop.expectedYield.toFixed(0)} kg</span>
                      </div>

                      {/* Growth Progress Bar */}
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-green-600 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${progress}%` }}
                        ></div>
                      </div>
                      <div className="text-xs text-gray-500">{progress.toFixed(0)}% grown</div>

                      {/* Pest/Disease Events */}
                      {pestEvents.length > 0 && (
                        <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded">
                          <p className="text-red-700 font-medium text-xs mb-1">Active Issues:</p>
                          {pestEvents.map(event => (
                            <div key={event.id} className="flex justify-between items-center text-xs">
                              <span className="text-red-600">{event.name}</span>
                              {event.canTreat && (
                                <button
                                  onClick={() => handleTreatPestDisease(event, crop.id)}
                                  className="bg-red-600 text-white px-2 py-1 rounded text-xs hover:bg-red-700"
                                  disabled={farm.money < event.treatmentCost}
                                >
                                  Treat (₹{event.treatmentCost})
                                </button>
                              )}
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Care Recommendations */}
                      {recommendations.length > 0 && (
                        <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded">
                          <p className="text-blue-700 font-medium text-xs mb-1">Recommendations:</p>
                          {recommendations.map((rec, index) => (
                            <p key={index} className="text-blue-600 text-xs">{rec}</p>
                          ))}
                        </div>
                      )}

                      {/* Harvest Button */}
                      {isHarvestable && (
                        <button
                          onClick={() => handleHarvestCrop(crop)}
                          className="w-full bg-yellow-600 text-white py-2 rounded hover:bg-yellow-700 transition-colors mt-2"
                        >
                          Harvest
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Planting Modal */}
        {showPlantingModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md">
              <h3 className="text-lg font-semibold mb-4">Plant New Crop</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Crop Type
                  </label>
                  <select
                    value={selectedCropType}
                    onChange={(e) => setSelectedCropType(e.target.value)}
                    className="w-full border border-gray-300 rounded-md px-3 py-2"
                  >
                    <option value="">Select a crop</option>
                    {availableCrops.map(crop => (
                      <option key={crop.id} value={crop.id}>
                        {crop.name} - ₹{crop.baseCost}/acre
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Area (acres)
                  </label>
                  <input
                    type="number"
                    min="0.1"
                    max={farm.landArea}
                    step="0.1"
                    value={plantingArea}
                    onChange={(e) => setPlantingArea(parseFloat(e.target.value) || 0)}
                    className="w-full border border-gray-300 rounded-md px-3 py-2"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Available land: {farm.landArea} acres
                  </p>
                </div>

                {selectedCropType && (
                  <div className="bg-gray-50 p-3 rounded">
                    <p className="text-sm">
                      <strong>Total Cost:</strong> ₹{(CROP_TYPES[selectedCropType]?.baseCost * plantingArea).toFixed(0)}
                    </p>
                    <p className="text-sm">
                      <strong>Expected Yield:</strong> {(CROP_TYPES[selectedCropType]?.baseYield * plantingArea).toFixed(0)} kg
                    </p>
                    <p className="text-sm">
                      <strong>Growth Duration:</strong> {CROP_TYPES[selectedCropType]?.growthDuration} days
                    </p>
                  </div>
                )}
              </div>

              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={() => setShowPlantingModal(false)}
                  className="px-4 py-2 text-gray-600 border border-gray-300 rounded hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handlePlantCrop}
                  disabled={!selectedCropType || plantingArea <= 0 || 
                    (selectedCropType ? farm.money < CROP_TYPES[selectedCropType].baseCost * plantingArea : false)}
                  className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                >
                  Plant Crop
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Season Info */}
        <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded">
          <h4 className="font-semibold text-blue-800 mb-2">
            Current Season: {season.current} (Day {season.day})
          </h4>
          <p className="text-blue-700 text-sm">
            Available crops for this season: {availableCrops.map(c => c.name).join(', ') || 'None'}
          </p>
          <p className="text-blue-700 text-sm">
            Days remaining: {season.daysRemaining}
          </p>
        </div>
      </div>
    </div>
  );
};

export default CropManagement;