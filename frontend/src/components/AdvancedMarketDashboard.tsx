/**
 * Advanced Market Dashboard Component for Harvest Hope
 * Handles storage, government procurement, and advanced market analysis
 */

import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import type { RootState } from '../store';
import { storeCrop, sellStoredCrop, upgradeStorage } from '../store/slices/farmSlice';
import { marketService } from '../services/marketService';
import type { 
  StorageOption, 
  MarketTrendAnalysis, 
  SellingRecommendation
} from '../services/marketService';
import type { StoredCropData } from '../../../shared/types/game-state';

interface AdvancedMarketDashboardProps {
  selectedCrop?: string;
  cropQuantity?: number;
  onStoreCrop?: (storageOption: StorageOption) => void;
  onSellStoredCrop?: (cropId: string, quantity: number) => void;
}

const AdvancedMarketDashboard: React.FC<AdvancedMarketDashboardProps> = ({
  selectedCrop = 'wheat',
  cropQuantity = 100,
  onStoreCrop,
  onSellStoredCrop
}) => {
  const dispatch = useDispatch();
  const { storedCrops, storageCapacity, money } = useSelector((state: RootState) => state.farm);
  const { currentPrices } = useSelector((state: RootState) => state.market);

  const [activeTab, setActiveTab] = useState<'storage' | 'trends' | 'recommendations' | 'government'>('storage');
  const [storageOptions, setStorageOptions] = useState<StorageOption[]>([]);
  const [trendAnalysis, setTrendAnalysis] = useState<MarketTrendAnalysis | null>(null);
  const [recommendation, setRecommendation] = useState<SellingRecommendation | null>(null);
  const [governmentProcurement, setGovernmentProcurement] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [selectedStoredCrop, setSelectedStoredCrop] = useState<string>('');
  const [sellQuantity, setSellQuantity] = useState<number>(0);

  const currentPrice = currentPrices[selectedCrop]?.current_price || 0;

  useEffect(() => {
    if (activeTab === 'storage') {
      fetchStorageOptions();
    } else if (activeTab === 'trends') {
      fetchTrendAnalysis();
    } else if (activeTab === 'recommendations') {
      fetchRecommendations();
    } else if (activeTab === 'government') {
      checkGovernmentProcurement();
    }
  }, [activeTab, selectedCrop]);

  const fetchStorageOptions = async () => {
    setLoading(true);
    try {
      const options = await marketService.getStorageOptions(selectedCrop, cropQuantity);
      setStorageOptions(options);
    } catch (error) {
      console.error('Failed to fetch storage options:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchTrendAnalysis = async () => {
    setLoading(true);
    try {
      const analysis = await marketService.getMarketTrendAnalysis(selectedCrop, '30d');
      setTrendAnalysis(analysis);
    } catch (error) {
      console.error('Failed to fetch trend analysis:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchRecommendations = async () => {
    setLoading(true);
    try {
      const hasStorage = getTotalStorageCapacity() > 0;
      const rec = await marketService.getAdvancedSellingRecommendation(
        selectedCrop,
        cropQuantity,
        currentPrice,
        hasStorage,
        'medium',
        'grade_b'
      );
      setRecommendation(rec);
    } catch (error) {
      console.error('Failed to fetch recommendations:', error);
    } finally {
      setLoading(false);
    }
  };

  const checkGovernmentProcurement = async () => {
    setLoading(true);
    try {
      const procurement = await marketService.checkGovernmentProcurement(
        selectedCrop,
        cropQuantity,
        currentPrice
      );
      setGovernmentProcurement(procurement);
    } catch (error) {
      console.error('Failed to check government procurement:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleStoreCrop = (storageOption: StorageOption) => {
    if (cropQuantity <= storageOption.capacity) {
      const storedCrop: StoredCropData = {
        id: `stored_${Date.now()}`,
        cropType: selectedCrop,
        quantity: cropQuantity,
        qualityGrade: 'grade_b',
        harvestDate: Date.now(),
        storageLocation: storageOption.storage_id as any,
        storageCost: storageOption.cost_per_day * cropQuantity,
        deteriorationRate: storageOption.deterioration_rate,
        marketValue: currentPrice * cropQuantity / 100
      };

      dispatch(storeCrop(storedCrop));
      onStoreCrop?.(storageOption);
    }
  };

  const handleSellStoredCrop = () => {
    if (selectedStoredCrop && sellQuantity > 0) {
      dispatch(sellStoredCrop({
        id: selectedStoredCrop,
        quantity: sellQuantity,
        price: currentPrice
      }));
      onSellStoredCrop?.(selectedStoredCrop, sellQuantity);
      setSelectedStoredCrop('');
      setSellQuantity(0);
    }
  };

  const handleUpgradeStorage = (storageType: keyof typeof storageCapacity, capacity: number, cost: number) => {
    if (money >= cost) {
      dispatch(upgradeStorage({ type: storageType, capacity, cost }));
    }
  };

  const getTotalStorageCapacity = () => {
    return storageCapacity.farm + storageCapacity.warehouse + storageCapacity.cold_storage;
  };

  const getUsedStorageCapacity = () => {
    return storedCrops.reduce((total, crop) => total + crop.quantity, 0);
  };

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(amount);
  };

  const getTrendColor = (trend: string): string => {
    switch (trend) {
      case 'bullish': return 'text-green-600 bg-green-100';
      case 'bearish': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getActionColor = (action: string): string => {
    switch (action) {
      case 'sell_now': return 'text-green-600 bg-green-100';
      case 'store_and_wait': return 'text-blue-600 bg-blue-100';
      case 'sell_government': return 'text-purple-600 bg-purple-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Advanced Market Features</h2>
        <div className="text-sm text-gray-600">
          Storage: {getUsedStorageCapacity()}/{getTotalStorageCapacity()} kg
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex space-x-1 mb-6 bg-gray-100 p-1 rounded-lg">
        {[
          { key: 'storage', label: 'Storage System' },
          { key: 'trends', label: 'Market Trends' },
          { key: 'recommendations', label: 'AI Recommendations' },
          { key: 'government', label: 'Government Procurement' }
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

      {loading && (
        <div className="flex justify-center items-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
        </div>
      )}

      {/* Storage System Tab */}
      {activeTab === 'storage' && !loading && (
        <div className="space-y-6">
          {/* Current Storage Status */}
          <div className="bg-blue-50 p-4 rounded-lg">
            <h3 className="font-semibold text-blue-800 mb-3">Current Storage Status</h3>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <p className="text-sm text-blue-600">Farm Storage</p>
                <p className="font-bold">{storageCapacity.farm} kg</p>
              </div>
              <div>
                <p className="text-sm text-blue-600">Warehouse</p>
                <p className="font-bold">{storageCapacity.warehouse} kg</p>
              </div>
              <div>
                <p className="text-sm text-blue-600">Cold Storage</p>
                <p className="font-bold">{storageCapacity.cold_storage} kg</p>
              </div>
            </div>
          </div>

          {/* Stored Crops */}
          {storedCrops.length > 0 && (
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="font-semibold mb-3">Stored Crops</h3>
              <div className="space-y-2">
                {storedCrops.map(crop => (
                  <div key={crop.id} className="flex justify-between items-center bg-white p-3 rounded">
                    <div>
                      <p className="font-semibold">{crop.cropType} - {crop.quantity} kg</p>
                      <p className="text-sm text-gray-600">
                        Quality: {crop.qualityGrade} | Storage: {crop.storageLocation}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold">{formatCurrency(crop.marketValue)}</p>
                      <p className="text-sm text-gray-600">Daily cost: {formatCurrency(crop.storageCost)}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Sell Stored Crop */}
              <div className="mt-4 p-3 bg-green-50 rounded">
                <h4 className="font-semibold mb-2">Sell Stored Crop</h4>
                <div className="flex space-x-2">
                  <select
                    value={selectedStoredCrop}
                    onChange={(e) => setSelectedStoredCrop(e.target.value)}
                    className="flex-1 px-3 py-2 border rounded"
                  >
                    <option value="">Select crop to sell</option>
                    {storedCrops.map(crop => (
                      <option key={crop.id} value={crop.id}>
                        {crop.cropType} - {crop.quantity} kg
                      </option>
                    ))}
                  </select>
                  <input
                    type="number"
                    placeholder="Quantity"
                    value={sellQuantity}
                    onChange={(e) => setSellQuantity(Number(e.target.value))}
                    className="w-24 px-3 py-2 border rounded"
                  />
                  <button
                    onClick={handleSellStoredCrop}
                    disabled={!selectedStoredCrop || sellQuantity <= 0}
                    className="px-4 py-2 bg-green-600 text-white rounded disabled:opacity-50"
                  >
                    Sell
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Storage Options */}
          <div>
            <h3 className="font-semibold mb-3">Available Storage Options</h3>
            <div className="grid gap-4">
              {storageOptions.map(option => (
                <div key={option.storage_id} className="border rounded-lg p-4">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h4 className="font-semibold">{option.storage_name}</h4>
                      <p className="text-sm text-gray-600">{option.location}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold">{formatCurrency(option.cost_per_day * cropQuantity)}/day</p>
                      <p className="text-sm text-gray-600">Capacity: {option.capacity} kg</p>
                    </div>
                  </div>

                  <div className="mb-3">
                    <p className="text-sm text-gray-600 mb-1">Features:</p>
                    <div className="flex flex-wrap gap-1">
                      {option.features.map((feature, index) => (
                        <span key={index} className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">
                          {feature}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="flex justify-between items-center">
                    <div className="text-sm">
                      <span className="text-gray-600">Deterioration: </span>
                      <span className="font-semibold">{(option.deterioration_rate * 100).toFixed(1)}%/day</span>
                    </div>
                    <button
                      onClick={() => handleStoreCrop(option)}
                      disabled={!option.available || cropQuantity > option.capacity}
                      className="px-4 py-2 bg-green-600 text-white rounded disabled:opacity-50"
                    >
                      {option.available ? 'Store Crop' : 'Not Available'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Storage Upgrades */}
          <div className="bg-yellow-50 p-4 rounded-lg">
            <h3 className="font-semibold text-yellow-800 mb-3">Storage Upgrades</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white p-3 rounded">
                <h4 className="font-semibold">Farm Storage Expansion</h4>
                <p className="text-sm text-gray-600">+500 kg capacity</p>
                <button
                  onClick={() => handleUpgradeStorage('farm', 500, 25000)}
                  disabled={money < 25000}
                  className="mt-2 px-3 py-1 bg-yellow-600 text-white rounded text-sm disabled:opacity-50"
                >
                  Upgrade - {formatCurrency(25000)}
                </button>
              </div>
              <div className="bg-white p-3 rounded">
                <h4 className="font-semibold">Warehouse Access</h4>
                <p className="text-sm text-gray-600">+2000 kg capacity</p>
                <button
                  onClick={() => handleUpgradeStorage('warehouse', 2000, 75000)}
                  disabled={money < 75000}
                  className="mt-2 px-3 py-1 bg-yellow-600 text-white rounded text-sm disabled:opacity-50"
                >
                  Upgrade - {formatCurrency(75000)}
                </button>
              </div>
              <div className="bg-white p-3 rounded">
                <h4 className="font-semibold">Cold Storage Access</h4>
                <p className="text-sm text-gray-600">+1000 kg premium capacity</p>
                <button
                  onClick={() => handleUpgradeStorage('cold_storage', 1000, 150000)}
                  disabled={money < 150000}
                  className="mt-2 px-3 py-1 bg-yellow-600 text-white rounded text-sm disabled:opacity-50"
                >
                  Upgrade - {formatCurrency(150000)}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Market Trends Tab */}
      {activeTab === 'trends' && !loading && trendAnalysis && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className={`p-4 rounded-lg ${getTrendColor(trendAnalysis.current_trend)}`}>
              <h4 className="font-semibold">Current Trend</h4>
              <p className="text-lg font-bold capitalize">{trendAnalysis.current_trend}</p>
            </div>
            <div className="bg-blue-50 p-4 rounded-lg">
              <h4 className="font-semibold text-blue-800">Price Momentum</h4>
              <p className="text-lg font-bold text-blue-600">
                {trendAnalysis.price_momentum > 0 ? '+' : ''}{(trendAnalysis.price_momentum * 100).toFixed(1)}%
              </p>
            </div>
            <div className="bg-yellow-50 p-4 rounded-lg">
              <h4 className="font-semibold text-yellow-800">Volatility</h4>
              <p className="text-lg font-bold text-yellow-600">
                {(trendAnalysis.volatility * 100).toFixed(1)}%
              </p>
            </div>
            <div className="bg-purple-50 p-4 rounded-lg">
              <h4 className="font-semibold text-purple-800">RSI</h4>
              <p className="text-lg font-bold text-purple-600">
                {trendAnalysis.technical_indicators.rsi.toFixed(1)}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-gray-50 p-4 rounded-lg">
              <h4 className="font-semibold mb-3">Price Levels</h4>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span>Resistance Level:</span>
                  <span className="font-bold">{formatCurrency(trendAnalysis.resistance_level)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Current Price:</span>
                  <span className="font-bold">{formatCurrency(currentPrice)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Support Level:</span>
                  <span className="font-bold">{formatCurrency(trendAnalysis.support_level)}</span>
                </div>
              </div>
            </div>

            <div className="bg-gray-50 p-4 rounded-lg">
              <h4 className="font-semibold mb-3">Fundamental Outlook</h4>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span>Supply Outlook:</span>
                  <span className="font-bold capitalize">{trendAnalysis.fundamental_factors.supply_outlook}</span>
                </div>
                <div className="flex justify-between">
                  <span>Demand Outlook:</span>
                  <span className="font-bold capitalize">{trendAnalysis.fundamental_factors.demand_outlook}</span>
                </div>
                <div className="flex justify-between">
                  <span>Intervention Risk:</span>
                  <span className="font-bold">
                    {(trendAnalysis.fundamental_factors.government_intervention_risk * 100).toFixed(0)}%
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-green-50 p-4 rounded-lg">
            <h4 className="font-semibold text-green-800 mb-3">Seasonal Pattern</h4>
            <p className="text-green-700">
              Expected peak in month {trendAnalysis.seasonal_pattern.expected_peak_month}, 
              low in month {trendAnalysis.seasonal_pattern.expected_low_month}. 
              Seasonal multiplier: {trendAnalysis.seasonal_pattern.seasonal_multiplier}x
            </p>
          </div>
        </div>
      )}

      {/* AI Recommendations Tab */}
      {activeTab === 'recommendations' && !loading && recommendation && (
        <div className="space-y-6">
          <div className={`p-4 rounded-lg ${getActionColor(recommendation.action)}`}>
            <h3 className="font-semibold mb-2">Recommended Action</h3>
            <p className="text-2xl font-bold capitalize mb-2">
              {recommendation.action.replace(/_/g, ' ')}
            </p>
            <p className="text-sm">Confidence: {(recommendation.confidence * 100).toFixed(0)}%</p>
          </div>

          <div className="bg-blue-50 p-4 rounded-lg">
            <h4 className="font-semibold text-blue-800 mb-3">Reasoning</h4>
            <ul className="list-disc list-inside space-y-1">
              {recommendation.reasoning.map((reason, index) => (
                <li key={index} className="text-blue-700">{reason}</li>
              ))}
            </ul>
            <p className="mt-3 font-semibold text-blue-800">
              Optimal Timing: {recommendation.optimal_timing}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-green-50 p-4 rounded-lg">
              <h4 className="font-semibold text-green-800 mb-3">Expected Price Range</h4>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span>Target Price:</span>
                  <span className="font-bold">{formatCurrency(recommendation.expected_price_range.target)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Maximum:</span>
                  <span className="font-bold">{formatCurrency(recommendation.expected_price_range.max)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Minimum:</span>
                  <span className="font-bold">{formatCurrency(recommendation.expected_price_range.min)}</span>
                </div>
              </div>
            </div>

            <div className="bg-red-50 p-4 rounded-lg">
              <h4 className="font-semibold text-red-800 mb-3">Risk Assessment</h4>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span>Storage Risk:</span>
                  <span className="font-bold">{(recommendation.risk_assessment.storage_risk * 100).toFixed(0)}%</span>
                </div>
                <div className="flex justify-between">
                  <span>Price Risk:</span>
                  <span className="font-bold">{(recommendation.risk_assessment.price_risk * 100).toFixed(0)}%</span>
                </div>
                <div className="flex justify-between">
                  <span>Opportunity Cost:</span>
                  <span className="font-bold">{(recommendation.risk_assessment.opportunity_cost * 100).toFixed(0)}%</span>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-purple-50 p-4 rounded-lg">
            <h4 className="font-semibold text-purple-800 mb-3">Alternative Strategies</h4>
            <div className="space-y-3">
              {recommendation.alternative_strategies.map((strategy, index) => (
                <div key={index} className="bg-white p-3 rounded">
                  <h5 className="font-semibold">{strategy.strategy}</h5>
                  <p className="text-sm text-gray-600 mb-1">{strategy.description}</p>
                  <p className="text-sm font-semibold text-purple-700">{strategy.expected_outcome}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Government Procurement Tab */}
      {activeTab === 'government' && !loading && governmentProcurement && (
        <div className="space-y-6">
          <div className={`p-4 rounded-lg ${
            governmentProcurement.available ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
          } border`}>
            <h3 className="font-semibold mb-2">
              Government Procurement {governmentProcurement.available ? 'Available' : 'Not Available'}
            </h3>
            <p className="text-2xl font-bold mb-2">
              MSP: {formatCurrency(governmentProcurement.msp_price)}/quintal
            </p>
            <p className="text-sm">
              {governmentProcurement.available 
                ? 'Current market price is at or below MSP - government procurement is available'
                : 'Current market price is above MSP - government procurement not needed'
              }
            </p>
          </div>

          {governmentProcurement.available && (
            <>
              <div className="bg-blue-50 p-4 rounded-lg">
                <h4 className="font-semibold text-blue-800 mb-3">Procurement Centers</h4>
                <div className="space-y-3">
                  {governmentProcurement.procurement_centers.map((center: any, index: number) => (
                    <div key={index} className="bg-white p-3 rounded">
                      <div className="flex justify-between items-start">
                        <div>
                          <h5 className="font-semibold">{center.name}</h5>
                          <p className="text-sm text-gray-600">{center.location}</p>
                          <p className="text-sm text-gray-600">Distance: {center.distance} km</p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold">Capacity Available</p>
                          <p className="text-sm">{center.capacity_available.toLocaleString()} kg</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-yellow-50 p-4 rounded-lg">
                <h4 className="font-semibold text-yellow-800 mb-3">Requirements</h4>
                <ul className="list-disc list-inside space-y-1">
                  {governmentProcurement.requirements.map((req: string, index: number) => (
                    <li key={index} className="text-yellow-700">{req}</li>
                  ))}
                </ul>
                <p className="mt-3 font-semibold text-yellow-800">
                  Timeline: {governmentProcurement.timeline}
                </p>
              </div>

              <div className="bg-green-50 p-4 rounded-lg">
                <h4 className="font-semibold text-green-800 mb-3">Procurement Benefits</h4>
                <ul className="list-disc list-inside space-y-1 text-green-700">
                  <li>Guaranteed minimum support price</li>
                  <li>No commission or middleman costs</li>
                  <li>Government backing ensures payment</li>
                  <li>Helps maintain market stability</li>
                  <li>Direct farmer support program</li>
                </ul>
              </div>
            </>
          )}

          {!governmentProcurement.available && (
            <div className="bg-gray-50 p-4 rounded-lg">
              <h4 className="font-semibold text-gray-800 mb-3">Alternative Options</h4>
              <ul className="list-disc list-inside space-y-1 text-gray-700">
                <li>Sell through regular market channels for better prices</li>
                <li>Consider storage if prices are expected to fall</li>
                <li>Explore direct sales or cooperative options</li>
                <li>Monitor market trends for optimal selling time</li>
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default AdvancedMarketDashboard;