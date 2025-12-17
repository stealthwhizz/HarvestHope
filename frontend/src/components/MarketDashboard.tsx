/**
 * Market Dashboard Component for Harvest Hope
 * Displays market prices, selling options, and trading advice
 */

import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import type { RootState } from '../store';
import { 
  fetchMarketPrice, 
  fetchSellingOptions, 
  fetchSellingAdvice, 
  fetchMarketIntelligence,
  clearErrors 
} from '../store/slices/marketSlice';
import { marketService } from '../services/marketService';
import type { MarketPrice, SellingOption, SellingAdvice } from '../services/marketService';

interface MarketDashboardProps {
  selectedCrop?: string;
  cropQuantity?: number;
  onSellCrop?: (option: SellingOption) => void;
}

const MarketDashboard: React.FC<MarketDashboardProps> = ({
  selectedCrop = 'wheat',
  cropQuantity = 100,
  onSellCrop
}) => {
  const dispatch = useDispatch();
  const { 
    currentPrices, 
    sellingOptions, 
    sellingAdvice, 
    marketIntelligence,
    loading, 
    error 
  } = useSelector((state: RootState) => state.market);
  
  const { current: currentSeason } = useSelector((state: RootState) => state.season);
  const { weather } = useSelector((state: RootState) => state.weather);

  const [activeTab, setActiveTab] = useState<'prices' | 'selling' | 'advice' | 'intelligence'>('prices');
  const [selectedCropType, setSelectedCropType] = useState(selectedCrop);
  const [qualityGrade, setQualityGrade] = useState('grade_b');
  const [storageCapacity, setStorageCapacity] = useState(false);
  const [financialUrgency, setFinancialUrgency] = useState<'low' | 'medium' | 'high'>('medium');

  const cropTypes = ['wheat', 'rice', 'cotton', 'maize', 'soybean', 'mustard', 'gram', 'tur'];

  useEffect(() => {
    // Fetch initial market data
    if (selectedCropType) {
      handleFetchMarketPrice();
    }
  }, [selectedCropType, currentSeason]);

  const handleFetchMarketPrice = () => {
    if (!selectedCropType) return;

    const weatherConditions = {
      rainfall: weather?.current?.rainfall || 50,
      temperature: weather?.current?.temperature?.max || 25,
      drought_risk: weather?.extremeEvents?.find(e => e.type === 'drought')?.severity || 0,
      flood_risk: weather?.extremeEvents?.find(e => e.type === 'flood')?.severity || 0
    };

    dispatch(fetchMarketPrice({
      cropType: selectedCropType,
      season: currentSeason,
      weatherConditions
    }) as any);
  };

  const handleFetchSellingOptions = () => {
    const currentPrice = currentPrices[selectedCropType]?.current_price;
    if (!currentPrice) return;

    dispatch(fetchSellingOptions({
      cropType: selectedCropType,
      quantity: cropQuantity,
      qualityGrade,
      currentPrice
    }) as any);
  };

  const handleFetchSellingAdvice = () => {
    const currentPrice = currentPrices[selectedCropType]?.current_price;
    if (!currentPrice) return;

    dispatch(fetchSellingAdvice({
      cropType: selectedCropType,
      currentPrice,
      quantity: cropQuantity,
      storageCapacity,
      financialUrgency
    }) as any);
  };

  const handleFetchMarketIntelligence = () => {
    dispatch(fetchMarketIntelligence({
      cropType: selectedCropType
    }) as any);
  };

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(amount);
  };

  const getMarketSentimentColor = (sentiment: string): string => {
    switch (sentiment) {
      case 'very_bullish': return 'text-green-600 bg-green-100';
      case 'bullish': return 'text-green-500 bg-green-50';
      case 'neutral': return 'text-gray-600 bg-gray-100';
      case 'bearish': return 'text-red-500 bg-red-50';
      case 'very_bearish': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getTrendIcon = (direction: string): string => {
    switch (direction) {
      case 'rising':
      case 'slightly_rising':
        return '📈';
      case 'declining':
      case 'slightly_declining':
        return '📉';
      default:
        return '➡️';
    }
  };

  const currentPrice = currentPrices[selectedCropType];

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Market Dashboard</h2>
        <div className="flex space-x-2">
          <select
            value={selectedCropType}
            onChange={(e) => setSelectedCropType(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
          >
            {cropTypes.map(crop => (
              <option key={crop} value={crop}>
                {crop.charAt(0).toUpperCase() + crop.slice(1)}
              </option>
            ))}
          </select>
          <button
            onClick={() => dispatch(clearErrors())}
            className="px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600 transition-colors"
          >
            Clear Errors
          </button>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex space-x-1 mb-6 bg-gray-100 p-1 rounded-lg">
        {[
          { key: 'prices', label: 'Market Prices' },
          { key: 'selling', label: 'Selling Options' },
          { key: 'advice', label: 'Trading Advice' },
          { key: 'intelligence', label: 'Market Intel' }
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as any)}
            className={`flex-1 py-2 px-4 rounded-md transition-colors ${
              activeTab === tab.key
                ? 'bg-white text-green-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Market Prices Tab */}
      {activeTab === 'prices' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">Current Market Prices</h3>
            <button
              onClick={handleFetchMarketPrice}
              disabled={loading.prices}
              className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 transition-colors"
            >
              {loading.prices ? 'Loading...' : 'Refresh Prices'}
            </button>
          </div>

          {error.prices && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
              {error.prices}
            </div>
          )}

          {currentPrice && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="bg-blue-50 p-4 rounded-lg">
                <h4 className="font-semibold text-blue-800">Current Price</h4>
                <p className="text-2xl font-bold text-blue-600">
                  {formatCurrency(currentPrice.current_price)}/quintal
                </p>
                <p className="text-sm text-blue-600">
                  {currentPrice.price_vs_msp}% of MSP
                </p>
              </div>

              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-semibold text-gray-800">MSP</h4>
                <p className="text-2xl font-bold text-gray-600">
                  {formatCurrency(currentPrice.msp)}/quintal
                </p>
                <p className="text-sm text-gray-600">Minimum Support Price</p>
              </div>

              <div className={`p-4 rounded-lg ${getMarketSentimentColor(currentPrice.market_sentiment)}`}>
                <h4 className="font-semibold">Market Sentiment</h4>
                <p className="text-lg font-bold capitalize">
                  {currentPrice.market_sentiment.replace('_', ' ')}
                </p>
                <p className="text-sm">
                  {getTrendIcon(currentPrice.trend.direction)} {currentPrice.trend.direction}
                </p>
              </div>
            </div>
          )}

          {currentPrice && (
            <div className="bg-gray-50 p-4 rounded-lg">
              <h4 className="font-semibold mb-3">Price Factors</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <p className="text-sm text-gray-600">Weather Impact</p>
                  <p className={`font-semibold ${currentPrice.factors.weather_impact >= 0 ? 'text-red-600' : 'text-green-600'}`}>
                    {currentPrice.factors.weather_impact > 0 ? '+' : ''}{currentPrice.factors.weather_impact}%
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Seasonal Demand</p>
                  <p className={`font-semibold ${currentPrice.factors.seasonal_demand >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {currentPrice.factors.seasonal_demand > 0 ? '+' : ''}{currentPrice.factors.seasonal_demand}%
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Supply Situation</p>
                  <p className={`font-semibold ${currentPrice.factors.supply_situation >= 0 ? 'text-red-600' : 'text-green-600'}`}>
                    {currentPrice.factors.supply_situation > 0 ? '+' : ''}{currentPrice.factors.supply_situation}%
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Demand Situation</p>
                  <p className={`font-semibold ${currentPrice.factors.demand_situation >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {currentPrice.factors.demand_situation > 0 ? '+' : ''}{currentPrice.factors.demand_situation}%
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Selling Options Tab */}
      {activeTab === 'selling' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">Selling Options</h3>
            <div className="flex space-x-2">
              <select
                value={qualityGrade}
                onChange={(e) => setQualityGrade(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
              >
                <option value="premium">Premium Grade</option>
                <option value="grade_a">Grade A</option>
                <option value="grade_b">Grade B</option>
                <option value="grade_c">Grade C</option>
                <option value="below_standard">Below Standard</option>
              </select>
              <button
                onClick={handleFetchSellingOptions}
                disabled={loading.sellingOptions || !currentPrice}
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 transition-colors"
              >
                {loading.sellingOptions ? 'Loading...' : 'Get Options'}
              </button>
            </div>
          </div>

          {error.sellingOptions && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
              {error.sellingOptions}
            </div>
          )}

          <div className="grid gap-4">
            {sellingOptions.map((option, index) => (
              <div key={option.channel_id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h4 className="font-semibold text-lg">{option.channel_name}</h4>
                    <p className="text-sm text-gray-600">
                      Reliability: {Math.round(option.reliability_score * 100)}%
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-green-600">
                      {formatCurrency(option.net_price_per_quintal)}/quintal
                    </p>
                    <p className="text-sm text-gray-600">
                      Total: {formatCurrency(option.total_revenue)}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-3">
                  <div>
                    <p className="text-sm text-gray-600">Transport Cost</p>
                    <p className="font-semibold">{formatCurrency(option.transport_cost)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Commission</p>
                    <p className="font-semibold">{formatCurrency(option.commission)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Payment Delay</p>
                    <p className="font-semibold">{option.payment_delay_days} days</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Score</p>
                    <p className="font-semibold">{Math.round(option.recommendation_score)}/100</p>
                  </div>
                </div>

                {onSellCrop && (
                  <button
                    onClick={() => onSellCrop(option)}
                    className="w-full py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
                  >
                    Sell via {option.channel_name}
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Trading Advice Tab */}
      {activeTab === 'advice' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">AI Trading Advice</h3>
            <div className="flex space-x-2">
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={storageCapacity}
                  onChange={(e) => setStorageCapacity(e.target.checked)}
                  className="rounded"
                />
                <span className="text-sm">Storage Available</span>
              </label>
              <select
                value={financialUrgency}
                onChange={(e) => setFinancialUrgency(e.target.value as any)}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
              >
                <option value="low">Low Urgency</option>
                <option value="medium">Medium Urgency</option>
                <option value="high">High Urgency</option>
              </select>
              <button
                onClick={handleFetchSellingAdvice}
                disabled={loading.advice || !currentPrice}
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 transition-colors"
              >
                {loading.advice ? 'Loading...' : 'Get Advice'}
              </button>
            </div>
          </div>

          {error.advice && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
              {error.advice}
            </div>
          )}

          {sellingAdvice && (
            <div className="space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="font-semibold text-blue-800 mb-2">Recommendation</h4>
                <p className="text-lg font-bold text-blue-600 capitalize mb-2">
                  {sellingAdvice.recommendation.replace(/_/g, ' ')}
                </p>
                <p className="text-blue-700">{sellingAdvice.optimal_timing}</p>
              </div>

              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <h4 className="font-semibold text-green-800 mb-2">Reasoning</h4>
                <ul className="list-disc list-inside space-y-1">
                  {sellingAdvice.reasoning.map((reason, index) => (
                    <li key={index} className="text-green-700">{reason}</li>
                  ))}
                </ul>
              </div>

              {sellingAdvice.risk_factors.length > 0 && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <h4 className="font-semibold text-yellow-800 mb-2">Risk Factors</h4>
                  <ul className="list-disc list-inside space-y-1">
                    {sellingAdvice.risk_factors.map((risk, index) => (
                      <li key={index} className="text-yellow-700">{risk}</li>
                    ))}
                  </ul>
                </div>
              )}

              {sellingAdvice.alternative_strategies.length > 0 && (
                <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                  <h4 className="font-semibold text-purple-800 mb-2">Alternative Strategies</h4>
                  <ul className="list-disc list-inside space-y-1">
                    {sellingAdvice.alternative_strategies.map((strategy, index) => (
                      <li key={index} className="text-purple-700">{strategy}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Market Intelligence Tab */}
      {activeTab === 'intelligence' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">Market Intelligence</h3>
            <button
              onClick={handleFetchMarketIntelligence}
              disabled={loading.intelligence}
              className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 transition-colors"
            >
              {loading.intelligence ? 'Loading...' : 'Get Intelligence'}
            </button>
          </div>

          {error.intelligence && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
              {error.intelligence}
            </div>
          )}

          {marketIntelligence && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-blue-50 p-4 rounded-lg">
                  <h4 className="font-semibold text-blue-800">Supply</h4>
                  <p className="text-lg font-bold text-blue-600 capitalize">
                    {marketIntelligence.current_market_status.supply_situation}
                  </p>
                </div>
                <div className="bg-green-50 p-4 rounded-lg">
                  <h4 className="font-semibold text-green-800">Demand</h4>
                  <p className="text-lg font-bold text-green-600 capitalize">
                    {marketIntelligence.current_market_status.demand_strength}
                  </p>
                </div>
                <div className="bg-yellow-50 p-4 rounded-lg">
                  <h4 className="font-semibold text-yellow-800">Storage</h4>
                  <p className="text-lg font-bold text-yellow-600">
                    {Math.round(marketIntelligence.current_market_status.storage_levels * 100)}%
                  </p>
                </div>
                <div className="bg-purple-50 p-4 rounded-lg">
                  <h4 className="font-semibold text-purple-800">Exports</h4>
                  <p className="text-lg font-bold text-purple-600 capitalize">
                    {marketIntelligence.current_market_status.export_prospects}
                  </p>
                </div>
              </div>

              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-semibold mb-3">Key Price Drivers</h4>
                <ul className="list-disc list-inside space-y-1">
                  {marketIntelligence.price_drivers.map((driver, index) => (
                    <li key={index} className="text-gray-700">{driver}</li>
                  ))}
                </ul>
              </div>

              <div className="bg-orange-50 p-4 rounded-lg">
                <h4 className="font-semibold mb-3">Upcoming Events</h4>
                <div className="space-y-2">
                  {marketIntelligence.upcoming_events.map((event, index) => (
                    <div key={index} className="flex justify-between items-center">
                      <span className="text-orange-700">{event.event}</span>
                      <span className={`px-2 py-1 rounded text-sm ${
                        event.potential_impact === 'positive' ? 'bg-green-100 text-green-800' :
                        event.potential_impact === 'negative' ? 'bg-red-100 text-red-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {event.potential_impact}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default MarketDashboard;