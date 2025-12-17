/**
 * Main Game UI Component - Retro-styled farming game interface
 */

import React from 'react';
import { useSelector } from 'react-redux';
import type { RootState } from '../store/index';
import FarmGrid from './FarmGrid';
import HUD from './HUD';
import ControlPanel from './ControlPanel';

const GameUI: React.FC = () => {
  const farm = useSelector((state: RootState) => state.farm);
  const season = useSelector((state: RootState) => state.season);
  const economics = useSelector((state: RootState) => state.economics);
  const weather = useSelector((state: RootState) => state.weather);

  return (
    <div className="game-ui-container">
      {/* Game Title */}
      <div className="game-title">
        <h1 className="retro-font-large retro-text-green retro-glow">
          🌾 HARVEST HOPE: THE LAST FARM 🌾
        </h1>
      </div>

      {/* HUD - Top bar with essential info */}
      <HUD 
        money={farm.money + economics.bankAccount}
        season={season.current}
        day={season.day}
        daysRemaining={season.daysRemaining}
        weather={weather.current}
      />

      {/* Main Game Area */}
      <div className="game-main-area">
        {/* Farm Grid - Left side */}
        <div className="farm-section">
          <FarmGrid 
            crops={farm.crops}
          />
        </div>

        {/* Control Panel - Right side */}
        <div className="control-section">
          <ControlPanel 
            money={farm.money + economics.bankAccount}
            debt={economics.loans.reduce((total, loan) => total + loan.remainingAmount, 0)}
            season={season.current}
          />
        </div>
      </div>
    </div>
  );
};

export default GameUI;