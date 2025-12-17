/**
 * ControlPanel Component - Side panel with game controls and information
 */

import React from 'react';
import { useDispatch } from 'react-redux';
import { advanceDay as advanceFarmDay, updateMoney } from '../store/slices/farmSlice';
import { advanceDay as advanceSeasonDay } from '../store/slices/seasonSlice';

interface ControlPanelProps {
  money: number;
  debt: number;
  season: string;
}

const ControlPanel: React.FC<ControlPanelProps> = ({ money, debt, season }) => {
  const dispatch = useDispatch();

  const handleAdvanceDay = () => {
    dispatch(advanceFarmDay());
    dispatch(advanceSeasonDay());
  };

  const handleAddMoney = () => {
    dispatch(updateMoney(10000));
  };

  // Format money with Indian currency
  const formatMoney = (amount: number) => {
    return `₹${amount.toLocaleString('en-IN')}`;
  };

  return (
    <div className="control-panel-container">
      {/* Financial Summary */}
      <div className="financial-panel retro-panel">
        <h3 className="retro-font retro-text-amber">📊 FINANCES</h3>
        <div className="financial-info retro-panel-inset">
          <div className="financial-row">
            <span className="retro-font">Money:</span>
            <span className={`retro-font ${money >= 0 ? 'retro-text-green' : 'retro-text-red'}`}>
              {formatMoney(money)}
            </span>
          </div>
          <div className="financial-row">
            <span className="retro-font">Debt:</span>
            <span className={`retro-font ${debt > 0 ? 'retro-text-red' : 'retro-text-green'}`}>
              {formatMoney(debt)}
            </span>
          </div>
          <div className="financial-row">
            <span className="retro-font">Net Worth:</span>
            <span className={`retro-font ${(money - debt) >= 0 ? 'retro-text-green' : 'retro-text-red'}`}>
              {formatMoney(money - debt)}
            </span>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="action-panel retro-panel">
        <h3 className="retro-font retro-text-amber">⚡ ACTIONS</h3>
        
        <button
          onClick={handleAdvanceDay}
          className="retro-button retro-button-green action-button"
        >
          ⏩ ADVANCE DAY
        </button>

        <button
          onClick={handleAddMoney}
          className="retro-button action-button"
        >
          💰 ADD MONEY
        </button>

        <button
          className="retro-button action-button"
          disabled
        >
          🌦️ WEATHER FORECAST
        </button>

        <button
          className="retro-button action-button"
          disabled
        >
          📜 GOVT SCHEMES
        </button>

        <button
          className="retro-button action-button"
          disabled
        >
          🏪 MARKET PRICES
        </button>
      </div>

      {/* Season Info */}
      <div className="season-panel retro-panel">
        <h3 className="retro-font retro-text-amber">🌱 SEASON INFO</h3>
        <div className="season-info retro-panel-inset">
          <div className="season-row">
            <span className="retro-font">Current:</span>
            <span className="retro-font retro-text-cyan">{season}</span>
          </div>
          <div className="season-row">
            <span className="retro-font">Best Crops:</span>
            <span className="retro-font retro-text-green">
              {season === 'Kharif' ? 'Rice, Cotton' : 
               season === 'Rabi' ? 'Wheat' : 
               season === 'Zaid' ? 'Sugarcane' : 'All Crops'}
            </span>
          </div>
        </div>
      </div>

      {/* Tips Panel */}
      <div className="tips-panel retro-panel">
        <h3 className="retro-font retro-text-amber">💡 TIPS</h3>
        <div className="tips-content retro-panel-inset">
          <p className="retro-font tip-text">
            Click empty soil tiles to plant crops. Different seasons favor different crops!
          </p>
        </div>
      </div>
    </div>
  );
};

export default ControlPanel;