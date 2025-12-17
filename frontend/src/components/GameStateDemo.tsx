/**
 * Demo component to test Redux game state management
 */

import React from 'react';
import { useSelector, useDispatch } from 'react-redux';
import type { RootState } from '../store/index';
import { updateMoney, advanceDay as advanceFarmDay } from '../store/slices/farmSlice';
import { advanceDay as advanceSeasonDay } from '../store/slices/seasonSlice';

const GameStateDemo: React.FC = () => {
  const dispatch = useDispatch();
  const farm = useSelector((state: RootState) => state.farm);
  const season = useSelector((state: RootState) => state.season);
  const economics = useSelector((state: RootState) => state.economics);

  const handleAddMoney = () => {
    dispatch(updateMoney(10000));
  };

  const handleAdvanceDay = () => {
    dispatch(advanceFarmDay());
    dispatch(advanceSeasonDay());
  };

  const totalMoney = farm.money + economics.bankAccount;
  const totalDebt = economics.loans.reduce((total, loan) => total + loan.remainingAmount, 0);

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-4">🎮 Game State Demo</h2>
      
      {/* Game Summary */}
      <div className="bg-green-100 p-4 rounded-lg mb-6">
        <h3 className="text-lg font-semibold mb-2">Current Status</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <p className="font-medium">Season</p>
            <p>{season.current} (Day {season.day})</p>
          </div>
          <div>
            <p className="font-medium">Money</p>
            <p>₹{totalMoney.toLocaleString()}</p>
          </div>
          <div>
            <p className="font-medium">Debt</p>
            <p>₹{totalDebt.toLocaleString()}</p>
          </div>
          <div>
            <p className="font-medium">Crops</p>
            <p>{farm.crops.length} planted</p>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <button
          onClick={handleAddMoney}
          className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 transition-colors"
        >
          💰 Add ₹10,000
        </button>
        <button
          onClick={handleAdvanceDay}
          className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 transition-colors"
        >
          📅 Advance Day
        </button>
      </div>

      {/* Farm Details */}
      <div className="bg-yellow-50 p-4 rounded-lg mb-4">
        <h3 className="text-lg font-semibold mb-2">🚜 Farm Details</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p><strong>Land Area:</strong> {farm.landArea} acres</p>
            <p><strong>Soil Quality:</strong> {(farm.soilQuality * 100).toFixed(0)}%</p>
          </div>
          <div>
            <p><strong>Storage Capacity:</strong> {farm.storageCapacity.farm} kg farm</p>
            <p><strong>Stored Crops:</strong> {farm.storedCrops.length} types</p>
          </div>
        </div>
      </div>

      {/* Season Info */}
      <div className="bg-blue-50 p-4 rounded-lg">
        <h3 className="text-lg font-semibold mb-2">🌱 Season Information</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p><strong>Current Season:</strong> {season.current}</p>
            <p><strong>Days Remaining:</strong> {season.daysRemaining}</p>
          </div>
          <div>
            <p><strong>Next Season:</strong> {season.nextSeason}</p>
            <p><strong>Scheduled Events:</strong> {season.scheduledEvents.length}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GameStateDemo;