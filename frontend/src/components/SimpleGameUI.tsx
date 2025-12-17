/**
 * Simplified Game UI for demonstration - Retro-styled farming game interface
 */

import React, { useState, useEffect } from 'react';
import { getRealWeatherData } from '../services/weatherService';
import { getWeatherAdvisory } from '../services/weatherAdvisoryService';

interface CropTile {
  id: number;
  cropType: string;
  plantedDay: number;
  growthStage: 'seedling' | 'growing' | 'mature' | 'harvestable';
  quantity: number;
}

// Game save interface
interface GameSave {
  money: number;
  day: number;
  season: string;
  selectedCrop: string;
  plantedCrops: CropTile[];
  harvestedCrops: {type: string, quantity: number}[];
  appliedSchemes: string[];
  lastSaved: number;
}

// Load game state from localStorage
const loadGameState = (): GameSave | null => {
  try {
    const saved = localStorage.getItem('harvestHopeSave');
    if (!saved) return null;
    
    const gameState = JSON.parse(saved);
    console.log('🎮 Game loaded from localStorage:', gameState);
    return gameState;
  } catch (error) {
    console.error('❌ Error loading game save:', error);
    return null;
  }
};

// Save game state to localStorage
const saveGameState = (gameState: GameSave) => {
  try {
    gameState.lastSaved = Date.now();
    localStorage.setItem('harvestHopeSave', JSON.stringify(gameState));
    console.log('💾 Game auto-saved:', gameState);
  } catch (error) {
    console.error('❌ Error saving game:', error);
  }
};

const SimpleGameUI: React.FC = () => {
  // Load saved state or use defaults
  const savedState = loadGameState();
  
  const [money, setMoney] = useState(savedState?.money ?? 100000);
  const [day, setDay] = useState(savedState?.day ?? 1);
  const [season, setSeason] = useState(savedState?.season ?? 'Kharif');
  const [selectedCrop, setSelectedCrop] = useState(savedState?.selectedCrop ?? 'rice');
  const [plantedCrops, setPlantedCrops] = useState<CropTile[]>(savedState?.plantedCrops ?? []);
  const [harvestedCrops, setHarvestedCrops] = useState<{type: string, quantity: number}[]>(savedState?.harvestedCrops ?? []);
  const [appliedSchemes, setAppliedSchemes] = useState<string[]>(savedState?.appliedSchemes ?? []);
  
  // Non-persistent UI state
  const [notifications, setNotifications] = useState<string[]>([]);
  const [showWeatherModal, setShowWeatherModal] = useState(false);
  const [showSchemesModal, setShowSchemesModal] = useState(false);
  const [weatherLoading, setWeatherLoading] = useState(false);
  const [aiWeatherData, setAiWeatherData] = useState<any>(null);
  const [showSaveIndicator, setShowSaveIndicator] = useState(false);

  const seasons = ['Kharif', 'Rabi', 'Zaid', 'Off-season'];
  
  // Realistic crop growth configuration (in days)
  const cropGrowthDays = {
    rice: { daysToMaturity: 120, yield: 25 },      // 4 months - realistic for rice
    wheat: { daysToMaturity: 90, yield: 30 },      // 3 months - realistic for wheat  
    cotton: { daysToMaturity: 150, yield: 15 },    // 5 months - realistic for cotton
    sugarcane: { daysToMaturity: 365, yield: 80 }  // 12 months - realistic for sugarcane
  };

  const cropPrices = {
    rice: 2500,    // ₹2500 per quintal
    wheat: 2200,   // ₹2200 per quintal
    cotton: 6000,  // ₹6000 per quintal
    sugarcane: 350 // ₹350 per quintal
  };



  // Calculate crop growth percentage
  const getCropGrowthPercentage = (crop: CropTile) => {
    const daysGrown = day - crop.plantedDay;
    const growthConfig = cropGrowthDays[crop.cropType as keyof typeof cropGrowthDays];
    return Math.min((daysGrown / growthConfig.daysToMaturity) * 100, 100);
  };

  // Get growth stage based on percentage
  const getGrowthStage = (percentage: number): CropTile['growthStage'] => {
    if (percentage >= 100) return 'harvestable';
    if (percentage >= 75) return 'mature';
    if (percentage >= 50) return 'growing';
    return 'seedling';
  };

  // Update crop growth when day advances
  useEffect(() => {
    setPlantedCrops(prevCrops => {
      const newCrops = prevCrops.map(crop => {
        const growthPercentage = getCropGrowthPercentage(crop);
        const newStage = getGrowthStage(growthPercentage);
        
        // Add notification when crop becomes harvestable
        if (crop.growthStage !== 'harvestable' && newStage === 'harvestable') {
          const yieldAmount = cropGrowthDays[crop.cropType as keyof typeof cropGrowthDays].yield;
          setNotifications(prev => [...prev, `🌾 ${crop.cropType.toUpperCase()} is ready to harvest! (${yieldAmount}kg)`]);
          setTimeout(() => {
            setNotifications(prev => prev.slice(1));
          }, 3000);
        }
        
        return { ...crop, growthStage: newStage };
      });
      
      return newCrops;
    });
  }, [day]);

  // Auto-save game state whenever it changes
  useEffect(() => {
    const gameState: GameSave = {
      money,
      day,
      season,
      selectedCrop,
      plantedCrops,
      harvestedCrops,
      appliedSchemes,
      lastSaved: Date.now()
    };
    
    // Save to localStorage
    saveGameState(gameState);
    
    // Show save indicator
    setShowSaveIndicator(true);
    const timer = setTimeout(() => setShowSaveIndicator(false), 2000);
    
    return () => clearTimeout(timer);
  }, [money, day, season, selectedCrop, plantedCrops, harvestedCrops, appliedSchemes]);

  // Show welcome back message if game was loaded
  useEffect(() => {
    if (savedState) {
      setNotifications(prev => [...prev, `🎮 Welcome back! Game loaded from Day ${savedState.day}`]);
      setTimeout(() => {
        setNotifications(prev => prev.slice(1));
      }, 4000);
    }
  }, []); // Only run once on mount
  
  const handleAdvanceDay = () => {
    const newDay = day + 1;
    setDay(newDay);
    
    // Change season every 30 days for demo
    if (newDay % 30 === 0) {
      const currentIndex = seasons.indexOf(season);
      const nextIndex = (currentIndex + 1) % seasons.length;
      setSeason(seasons[nextIndex]);
    }
  };

  const handleAddMoney = () => {
    setMoney(money + 10000);
  };

  const handleNewGame = () => {
    if (confirm('🔄 Start a new game? All current progress will be lost!')) {
      // Clear localStorage
      localStorage.removeItem('harvestHopeSave');
      
      // Reset all state to defaults
      setMoney(100000);
      setDay(1);
      setSeason('Kharif');
      setSelectedCrop('rice');
      setPlantedCrops([]);
      setHarvestedCrops([]);
      setAppliedSchemes([]);
      
      // Show confirmation
      setNotifications(prev => [...prev, '🎮 New game started! Good luck, farmer!']);
      setTimeout(() => {
        setNotifications(prev => prev.slice(1));
      }, 3000);
    }
  };

  const handleExportSave = () => {
    try {
      const saveData = localStorage.getItem('harvestHopeSave');
      if (!saveData) {
        setNotifications(prev => [...prev, '❌ No save data found to export!']);
        setTimeout(() => {
          setNotifications(prev => prev.slice(1));
        }, 3000);
        return;
      }

      // Create downloadable file
      const blob = new Blob([saveData], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `harvest-hope-save-day${day}-${Date.now()}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      // Show confirmation
      setNotifications(prev => [...prev, '💾 Save file exported successfully!']);
      setTimeout(() => {
        setNotifications(prev => prev.slice(1));
      }, 3000);
    } catch (error) {
      console.error('Export error:', error);
      setNotifications(prev => [...prev, '❌ Failed to export save file!']);
      setTimeout(() => {
        setNotifications(prev => prev.slice(1));
      }, 3000);
    }
  };

  const handleTileClick = (tileIndex: number) => {
    const existingCrop = plantedCrops.find(crop => crop.id === tileIndex);
    
    if (!existingCrop) {
      // Plant new crop
      const plantingCost = 1000;
      if (money >= plantingCost) {
        const newCrop: CropTile = {
          id: tileIndex,
          cropType: selectedCrop,
          plantedDay: day,
          growthStage: 'seedling',
          quantity: 0 // Will be calculated at harvest based on realistic yields
        };
        setPlantedCrops([...plantedCrops, newCrop]);
        setMoney(money - plantingCost);
        
        // Show planting notification
        const daysToMaturity = cropGrowthDays[selectedCrop as keyof typeof cropGrowthDays].daysToMaturity;
        setNotifications(prev => [...prev, `🌱 Planted ${selectedCrop.toUpperCase()}! Harvest in ${daysToMaturity} days.`]);
        setTimeout(() => {
          setNotifications(prev => prev.slice(1));
        }, 3000);
      }
    } else if (existingCrop.growthStage === 'harvestable') {
      // Harvest crop
      handleHarvestCrop(tileIndex);
    }
  };

  const handleHarvestCrop = (tileIndex: number) => {
    const cropToHarvest = plantedCrops.find(crop => crop.id === tileIndex);
    if (cropToHarvest && cropToHarvest.growthStage === 'harvestable') {
      // Calculate realistic yield based on crop type
      const baseYield = cropGrowthDays[cropToHarvest.cropType as keyof typeof cropGrowthDays].yield;
      const actualYield = Math.floor(baseYield * (0.8 + Math.random() * 0.4)); // 80-120% of base yield
      
      // Add to harvested crops inventory
      setHarvestedCrops(prev => {
        const existing = prev.find(item => item.type === cropToHarvest.cropType);
        if (existing) {
          return prev.map(item => 
            item.type === cropToHarvest.cropType 
              ? { ...item, quantity: item.quantity + actualYield }
              : item
          );
        } else {
          return [...prev, { type: cropToHarvest.cropType, quantity: actualYield }];
        }
      });
      
      // Show harvest notification
      setNotifications(prev => [...prev, `✅ Harvested ${actualYield}kg ${cropToHarvest.cropType.toUpperCase()}!`]);
      setTimeout(() => {
        setNotifications(prev => prev.slice(1));
      }, 3000);
      
      // Remove from planted crops
      setPlantedCrops(prev => prev.filter(crop => crop.id !== tileIndex));
    }
  };

  const handleSellCrop = (cropType: string, quantity: number) => {
    const pricePerKg = cropPrices[cropType as keyof typeof cropPrices];
    const revenue = Math.floor((quantity * pricePerKg) / 100); // Convert kg to quintal pricing
    
    setMoney(prev => prev + revenue);
    setHarvestedCrops(prev => 
      prev.map(item => 
        item.type === cropType 
          ? { ...item, quantity: item.quantity - quantity }
          : item
      ).filter(item => item.quantity > 0)
    );
    
    // Show sell notification with money flash effect
    setNotifications(prev => [...prev, `💰 Sold ${quantity}kg ${cropType.toUpperCase()} for ₹${revenue.toLocaleString()}!`]);
    setTimeout(() => {
      setNotifications(prev => prev.slice(1));
    }, 4000);
    
    // Flash money display
    const moneyDisplay = document.querySelector('.hud-value');
    if (moneyDisplay) {
      moneyDisplay.classList.add('money-flash');
      setTimeout(() => {
        moneyDisplay.classList.remove('money-flash');
      }, 1000);
    }
  };

  const getCropEmoji = (cropType: string, growthStage?: string) => {
    // 0-25%: Seedling (🌱)
    if (growthStage === 'seedling') {
      return '🌱';
    }
    
    // 25-50%: Growing (🌿)
    if (growthStage === 'growing') {
      return '🌿';
    }
    
    // 50-75%: Developing - crop-specific
    if (growthStage === 'mature') {
      switch (cropType) {
        case 'rice': return '🌾';
        case 'wheat': return '🌾';
        case 'cotton': return '🌸';
        case 'sugarcane': return '🎋';
        default: return '🌾';
      }
    }
    
    // 75-100%+: Harvestable - mature crop with sparkle effect
    if (growthStage === 'harvestable') {
      switch (cropType) {
        case 'rice': return '🌾✨';
        case 'wheat': return '🌾✨';
        case 'cotton': return '☁️✨';
        case 'sugarcane': return '🎋✨';
        default: return '🌾✨';
      }
    }
    
    return '🌱';
  };

  const getCropColor = (growthStage: string) => {
    switch (growthStage) {
      case 'seedling': return '#90EE90';    // Light green
      case 'growing': return '#32CD32';     // Lime green
      case 'mature': return '#228B22';      // Forest green
      case 'harvestable': return '#FFD700'; // Gold - ready to harvest!
      default: return '#90EE90';
    }
  };

  const getWeatherEmoji = () => {
    const conditions = ['☀️', '🌧️', '☁️', '🌤️'];
    return conditions[day % 4];
  };

  const formatMoney = (amount: number) => {
    return `₹${amount.toLocaleString('en-IN')}`;
  };

  // Generate realistic Indian weather forecast
  const generateWeatherForecast = () => {
    const baseTemp = season === 'Kharif' ? 28 : season === 'Rabi' ? 22 : season === 'Zaid' ? 35 : 25;
    const forecast = [];
    
    for (let i = 0; i < 7; i++) {
      const dayOffset = i + 1;
      const temp = baseTemp + Math.floor(Math.random() * 8) - 4; // ±4°C variation
      
      // Season-based weather patterns
      let condition, rainfall, icon;
      if (season === 'Kharif') {
        // Monsoon season - more rain
        const rainChance = Math.random();
        if (rainChance > 0.6) {
          condition = 'Heavy Rain';
          rainfall = Math.floor(Math.random() * 50) + 20; // 20-70mm
          icon = '🌧️';
        } else if (rainChance > 0.3) {
          condition = 'Light Rain';
          rainfall = Math.floor(Math.random() * 15) + 5; // 5-20mm
          icon = '🌦️';
        } else {
          condition = 'Cloudy';
          rainfall = 0;
          icon = '☁️';
        }
      } else if (season === 'Rabi') {
        // Winter season - dry and cool
        const weatherChance = Math.random();
        if (weatherChance > 0.8) {
          condition = 'Light Rain';
          rainfall = Math.floor(Math.random() * 10) + 2; // 2-12mm
          icon = '🌦️';
        } else if (weatherChance > 0.4) {
          condition = 'Sunny';
          rainfall = 0;
          icon = '☀️';
        } else {
          condition = 'Partly Cloudy';
          rainfall = 0;
          icon = '🌤️';
        }
      } else if (season === 'Zaid') {
        // Summer season - hot and dry
        const weatherChance = Math.random();
        if (weatherChance > 0.9) {
          condition = 'Thunderstorm';
          rainfall = Math.floor(Math.random() * 30) + 10; // 10-40mm
          icon = '⛈️';
        } else if (weatherChance > 0.7) {
          condition = 'Hot & Sunny';
          rainfall = 0;
          icon = '🌞';
        } else {
          condition = 'Clear';
          rainfall = 0;
          icon = '☀️';
        }
      } else {
        // Off-season - mild weather
        condition = 'Pleasant';
        rainfall = 0;
        icon = '🌤️';
      }
      
      forecast.push({
        day: `Day ${day + dayOffset}`,
        condition,
        icon,
        tempMin: temp - 3,
        tempMax: temp + 5,
        rainfall,
        humidity: Math.floor(Math.random() * 30) + (season === 'Kharif' ? 60 : 40)
      });
    }
    
    return forecast;
  };

  // Get farming advisory based on season and weather
  const getFarmingAdvisory = () => {
    const advisories = {
      'Kharif': [
        '🌾 Perfect time for rice planting - monsoon provides natural irrigation',
        '🌧️ Ensure proper drainage to prevent waterlogging',
        '☁️ High humidity may increase pest risk - monitor crops closely',
        '💧 Utilize rainwater harvesting for future dry spells'
      ],
      'Rabi': [
        '🌾 Ideal for wheat cultivation - cool weather promotes growth',
        '💧 Irrigation required as rainfall is minimal',
        '🌡️ Protect crops from sudden temperature drops',
        '🌱 Good time for vegetable cultivation'
      ],
      'Zaid': [
        '🌽 Focus on heat-resistant crops like sugarcane',
        '💧 Intensive irrigation needed due to high temperatures',
        '🌞 Use mulching to conserve soil moisture',
        '⚠️ Avoid planting during peak summer heat'
      ],
      'Off-season': [
        '🛠️ Prepare fields for next planting season',
        '🌱 Good time for soil improvement and composting',
        '💧 Maintain irrigation systems',
        '📚 Plan crop rotation for optimal yield'
      ]
    };
    
    return advisories[season as keyof typeof advisories] || advisories['Off-season'];
  };

  // Government Schemes Data
  const governmentSchemes = [
    {
      id: 'pm-kisan',
      name: 'PM-KISAN',
      fullName: 'Pradhan Mantri Kisan Samman Nidhi',
      icon: '🏛️',
      description: 'Direct income support to small and marginal farmers',
      benefits: '₹6,000 per year in 3 installments of ₹2,000 each',
      eligibility: [
        'Small and marginal farmers with landholding up to 2 hectares',
        'Valid Aadhaar card required',
        'Bank account linked to Aadhaar'
      ],
      amount: 6000,
      type: 'income_support'
    },
    {
      id: 'fasal-bima',
      name: 'Fasal Bima Yojana',
      fullName: 'Pradhan Mantri Fasal Bima Yojana',
      icon: '🛡️',
      description: 'Crop insurance scheme protecting farmers from crop losses',
      benefits: 'Up to ₹2,00,000 coverage per hectare for crop losses',
      eligibility: [
        'All farmers growing notified crops',
        'Covers natural calamities, pests & diseases',
        'Premium: 2% for Kharif, 1.5% for Rabi crops'
      ],
      amount: 50000, // Insurance coverage benefit
      type: 'insurance'
    },
    {
      id: 'kisan-credit',
      name: 'Kisan Credit Card',
      fullName: 'Kisan Credit Card Scheme',
      icon: '💳',
      description: 'Low-interest credit facility for agricultural needs',
      benefits: 'Credit limit up to ₹3,00,000 at 4% interest rate',
      eligibility: [
        'Farmers with valid land records',
        'Good credit history preferred',
        'Covers crop loans, equipment purchase'
      ],
      amount: 25000, // Credit facility as working capital
      type: 'credit'
    }
  ];

  const handleApplyScheme = (schemeId: string) => {
    if (appliedSchemes.includes(schemeId)) {
      return; // Already applied
    }

    const scheme = governmentSchemes.find(s => s.id === schemeId);
    if (!scheme) return;

    // Add scheme to applied list
    setAppliedSchemes(prev => [...prev, schemeId]);

    // Apply benefits based on scheme type
    if (scheme.type === 'income_support') {
      setMoney(prev => prev + scheme.amount);
      setNotifications(prev => [...prev, `✅ ${scheme.name}: ₹${scheme.amount.toLocaleString()} received!`]);
    } else if (scheme.type === 'insurance') {
      // For demo, give immediate benefit
      setMoney(prev => prev + scheme.amount);
      setNotifications(prev => [...prev, `🛡️ ${scheme.name}: Insurance coverage activated!`]);
    } else if (scheme.type === 'credit') {
      setMoney(prev => prev + scheme.amount);
      setNotifications(prev => [...prev, `💳 ${scheme.name}: Credit facility approved!`]);
    }

    // Auto-hide notification after 4 seconds
    setTimeout(() => {
      setNotifications(prev => prev.slice(1));
    }, 4000);
  };

  // Fetch Real Weather + AI Advisory
  const fetchRealWeatherWithAI = async () => {
    setWeatherLoading(true);
    
    try {
      console.log('🌍 Step 1: Fetching REAL weather data...');
      
      // Use imported services
      
      // 1. Get REAL weather data (no API key needed!)
      const realWeatherData = await getRealWeatherData('maharashtra');
      
      console.log('🤖 Step 2: Generating AI farming advisory...');
      
      // 2. Get AI advisory based on real weather data
      const currentCrops = plantedCrops.map(crop => crop.cropType);
      const aiAdvisory = await getWeatherAdvisory(realWeatherData, 'Maharashtra', currentCrops);
      
      // 3. Combine real weather + AI advisory
      const combinedData = {
        forecast: realWeatherData.forecast.map(day => ({
          day: day.day_number,
          date: day.date,
          condition: day.condition,
          icon: day.icon,
          temperature: {
            min: day.temp_min,
            max: day.temp_max
          },
          tempMin: day.temp_min, // Backward compatibility
          tempMax: day.temp_max,
          rainfall: day.rainfall_mm,
          humidity: day.humidity,
          advisory: aiAdvisory.crop_advice[currentCrops[0]] || 'Monitor weather conditions'
        })),
        summary: `${aiAdvisory.overall_condition} - ${realWeatherData.summary.total_rainfall}mm total rainfall expected`,
        farming_tips: [
          aiAdvisory.irrigation_need,
          ...aiAdvisory.warnings,
          `Drought Risk: ${aiAdvisory.drought_risk}%`,
          `Flood Risk: ${aiAdvisory.flood_risk}%`
        ],
        isAI: true,
        source: `${realWeatherData.source} + ${aiAdvisory.source}`,
        realWeather: realWeatherData,
        aiAdvisory: aiAdvisory
      };
      
      setAiWeatherData(combinedData);
      setNotifications(prev => [...prev, '✅ Real weather + AI advisory generated!']);
      
    } catch (error) {
      console.error('🚨 Weather system error:', error);
      console.log('🔄 Falling back to simulated data because:', (error as Error).message);
      
      // Fallback to simulated data with delay
      setTimeout(() => {
        const fallbackData = generateFallbackWeatherData();
        (fallbackData as any).isAI = false;
        (fallbackData as any).source = 'Simulated (Real API unavailable)';
        setAiWeatherData(fallbackData);
        setNotifications(prev => [...prev, '⚠️ Using simulated weather data']);
        setWeatherLoading(false);
      }, 2000);
      return;
    }
    
    setWeatherLoading(false);
    setTimeout(() => {
      setNotifications(prev => prev.slice(1));
    }, 3000);
  };

  // Generate fallback weather data when AI is unavailable
  const generateFallbackWeatherData = () => {
    const conditions = ['sunny', 'partly_cloudy', 'cloudy', 'light_rain', 'heavy_rain'];
    const forecast = [];
    
    for (let i = 0; i < 7; i++) {
      const condition = conditions[Math.floor(Math.random() * conditions.length)];
      const baseTemp = season === 'Kharif' ? 28 : season === 'Rabi' ? 22 : season === 'Zaid' ? 35 : 25;
      
      forecast.push({
        day: i + 1,
        date: `Day ${day + i + 1}`,
        condition,
        icon: getWeatherIcon(condition),
        temperature: {
          min: baseTemp - 3 + Math.floor(Math.random() * 4),
          max: baseTemp + 2 + Math.floor(Math.random() * 6)
        },
        rainfall: condition.includes('rain') ? Math.floor(Math.random() * 40) + 10 : 0,
        humidity: 50 + Math.floor(Math.random() * 30) + (season === 'Kharif' ? 20 : 0),
        advisory: getSeasonalAdvice(condition, season)
      });
    }
    
    return {
      forecast,
      summary: `${season} season weather pattern for Maharashtra region`,
      farming_tips: getSeasonalTips(season),
      isAI: false
    };
  };

  const getWeatherIcon = (condition: string) => {
    const iconMap: { [key: string]: string } = {
      'sunny': '☀️',
      'partly_cloudy': '🌤️',
      'cloudy': '☁️',
      'light_rain': '🌦️',
      'heavy_rain': '🌧️',
      'thunderstorm': '⛈️'
    };
    return iconMap[condition] || '🌤️';
  };

  const getSeasonalAdvice = (condition: string, currentSeason: string) => {
    const advice: { [key: string]: { [key: string]: string } } = {
      'Kharif': {
        'sunny': 'Good for rice transplanting. Ensure adequate water supply.',
        'light_rain': 'Ideal for cotton sowing. Monitor soil moisture.',
        'heavy_rain': 'Avoid field operations. Check drainage systems.',
        'cloudy': 'Suitable for nursery preparation. Monitor pest activity.'
      },
      'Rabi': {
        'sunny': 'Perfect for wheat sowing. Prepare irrigation schedule.',
        'light_rain': 'Beneficial for germination. Reduce irrigation.',
        'cloudy': 'Good for vegetable cultivation. Monitor temperature.',
        'heavy_rain': 'Protect crops from waterlogging. Delay harvesting.'
      },
      'Zaid': {
        'sunny': 'Increase irrigation frequency. Use mulching.',
        'light_rain': 'Reduce irrigation. Good for sugarcane growth.',
        'heavy_rain': 'Rare but beneficial. Store rainwater.',
        'cloudy': 'Reduce heat stress on crops. Continue normal operations.'
      }
    };
    
    return advice[currentSeason]?.[condition] || 'Monitor weather conditions and adjust farming activities accordingly.';
  };

  const getSeasonalTips = (currentSeason: string) => {
    const tips: { [key: string]: string[] } = {
      'Kharif': [
        'Utilize monsoon rains for rice cultivation',
        'Ensure proper drainage to prevent waterlogging',
        'Monitor for pest outbreaks due to high humidity',
        'Prepare for cotton and sugarcane planting'
      ],
      'Rabi': [
        'Focus on wheat and mustard cultivation',
        'Use residual soil moisture from monsoon',
        'Implement efficient irrigation systems',
        'Protect crops from cold waves'
      ],
      'Zaid': [
        'Grow heat-resistant crops like fodder',
        'Intensive irrigation required',
        'Use mulching to conserve moisture',
        'Prepare for pre-monsoon activities'
      ],
      'Off-season': [
        'Prepare fields for next planting season',
        'Maintain irrigation infrastructure',
        'Plan crop rotation strategies',
        'Soil testing and improvement'
      ]
    };
    
    return tips[currentSeason] || tips['Off-season'];
  };

  return (
    <div className="game-ui-container">
      {/* Game Title */}
      <div className="game-title">
        <h1 className="retro-font-large retro-text-green retro-glow">
          🌾 HARVEST HOPE: THE LAST FARM 🌾
        </h1>
      </div>

      {/* Notifications */}
      {notifications.length > 0 && (
        <div className="notifications">
          {notifications.map((notification, index) => (
            <div key={index} className="notification retro-panel">
              <span className="retro-font">{notification}</span>
            </div>
          ))}
        </div>
      )}

      {/* HUD - Top bar with essential info */}
      <div className="hud-container retro-panel">
        <div className="hud-content retro-font">
          {/* Money */}
          <div className="hud-item">
            <span className="hud-icon">💰</span>
            <span className="hud-label">Money:</span>
            <span className={`hud-value ${money >= 0 ? 'retro-text-green' : 'retro-text-red'}`}>
              {formatMoney(money)}
            </span>
          </div>

          {/* Season and Day */}
          <div className="hud-item">
            <span className="hud-icon">📅</span>
            <span className="hud-label">Season:</span>
            <span className="hud-value retro-text-amber">
              {season} (Day {day}/120)
            </span>
          </div>

          {/* Weather */}
          <div className="hud-item">
            <span className="hud-icon">{getWeatherEmoji()}</span>
            <span className="hud-label">Weather:</span>
            <span className="hud-value retro-text-cyan">
              Clear 28°C
            </span>
          </div>

          {/* Save Indicator */}
          <div className="hud-item">
            <span className={`save-indicator ${showSaveIndicator ? 'show' : ''}`}>
              💾 Auto-saved
            </span>
          </div>
        </div>
      </div>

      {/* Main Game Area */}
      <div className="game-main-area">
        {/* Farm Grid - Left side */}
        <div className="farm-section">
          <div className="farm-grid-container">
            <div className="farm-grid-header retro-panel-inset">
              <h3 className="retro-font retro-text-green">🚜 YOUR FARM</h3>
            </div>
            
            <div className="farm-grid retro-border-inset">
              {Array.from({ length: 25 }, (_, index) => {
                const plantedCrop = plantedCrops.find(crop => crop.id === index);
                const isPlanted = !!plantedCrop;
                const isHarvestable = plantedCrop?.growthStage === 'harvestable';
                
                return (
                  <div
                    key={index}
                    className={`farm-tile ${isPlanted ? 'planted-crop' : 'empty-soil'} ${isHarvestable ? 'harvestable' : ''}`}
                    onClick={() => handleTileClick(index)}
                    style={{
                      backgroundColor: isPlanted ? getCropColor(plantedCrop.growthStage) : '#8B4513',
                      cursor: isPlanted ? (isHarvestable ? 'pointer' : 'default') : 'pointer',
                      boxShadow: isHarvestable ? '0 0 15px #FFD700' : undefined
                    }}
                    title={isPlanted ? (() => {
                      const growthPercentage = getCropGrowthPercentage(plantedCrop);
                      const daysToMaturity = cropGrowthDays[plantedCrop.cropType as keyof typeof cropGrowthDays].daysToMaturity;
                      const daysRemaining = Math.max(0, daysToMaturity - (day - plantedCrop.plantedDay));
                      const expectedYield = cropGrowthDays[plantedCrop.cropType as keyof typeof cropGrowthDays].yield;
                      
                      return isHarvestable ? 
                        `${plantedCrop.cropType.toUpperCase()} - READY TO HARVEST! (~${expectedYield}kg) - Click to harvest!` :
                        `${plantedCrop.cropType.toUpperCase()} - ${Math.floor(growthPercentage)}% grown - ${daysRemaining} days to harvest`;
                    })() : 'Click to plant crop (₹1,000)'}
                  >
                    {isPlanted ? (
                      <>
                        <span className="crop-emoji">
                          {getCropEmoji(plantedCrop.cropType, plantedCrop.growthStage)}
                        </span>
                        {!isHarvestable && (
                          <div className="growth-progress">
                            <div 
                              className="growth-bar" 
                              style={{ width: `${getCropGrowthPercentage(plantedCrop)}%` }}
                            />
                          </div>
                        )}
                      </>
                    ) : (
                      <span className="soil-emoji">🟫</span>
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
                    className={`retro-button ${selectedCrop === cropType ? 'retro-button-green' : ''}`}
                    onClick={() => setSelectedCrop(cropType)}
                  >
                    {getCropEmoji(cropType)} {cropType.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Control Panel - Right side */}
        <div className="control-section">
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
                  <span className="retro-font retro-text-green">₹0</span>
                </div>
                <div className="financial-row">
                  <span className="retro-font">Inventory Value:</span>
                  <span className="retro-font retro-text-cyan">
                    {formatMoney(harvestedCrops.reduce((total, crop) => 
                      total + (crop.quantity * cropPrices[crop.type as keyof typeof cropPrices]), 0
                    ))}
                  </span>
                </div>
                <div className="financial-row">
                  <span className="retro-font">Net Worth:</span>
                  <span className={`retro-font ${money >= 0 ? 'retro-text-green' : 'retro-text-red'}`}>
                    {formatMoney(money + harvestedCrops.reduce((total, crop) => 
                      total + (crop.quantity * cropPrices[crop.type as keyof typeof cropPrices]), 0
                    ))}
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
                onClick={handleNewGame}
                className="retro-button retro-button-red action-button"
              >
                🔄 NEW GAME
              </button>

              <button
                onClick={handleExportSave}
                className="retro-button action-button"
              >
                📁 EXPORT SAVE
              </button>

              <div className="planting-cost retro-panel-inset" style={{marginTop: '10px', padding: '6px'}}>
                <div className="financial-row">
                  <span className="retro-font" style={{fontSize: '9px'}}>Planting Cost:</span>
                  <span className="retro-font retro-text-amber" style={{fontSize: '9px'}}>₹1,000</span>
                </div>
                <div className="financial-row">
                  <span className="retro-font" style={{fontSize: '9px'}}>Can Plant:</span>
                  <span className={`retro-font ${money >= 1000 ? 'retro-text-green' : 'retro-text-red'}`} style={{fontSize: '9px'}}>
                    {Math.floor(money / 1000)} tiles
                  </span>
                </div>
              </div>

              <button 
                className="retro-button action-button"
                onClick={() => {
                  setShowWeatherModal(true);
                  if (!aiWeatherData) {
                    fetchRealWeatherWithAI();
                  }
                }}
                disabled={weatherLoading}
              >
                {weatherLoading ? '🌍 FETCHING REAL DATA...' : '🌦️ REAL WEATHER + AI'}
              </button>

              <button 
                className="retro-button action-button"
                onClick={() => setShowSchemesModal(true)}
              >
                📜 GOVT SCHEMES
              </button>

              <button className="retro-button action-button">
                🏪 MARKET PRICES
              </button>
            </div>

            {/* Season Info */}
            <div className="season-panel retro-panel">
              <h3 className="retro-font retro-text-amber">🌱 FARM STATUS</h3>
              <div className="season-info retro-panel-inset">
                <div className="season-row">
                  <span className="retro-font">Season:</span>
                  <span className="retro-font retro-text-cyan">{season}</span>
                </div>
                <div className="season-row">
                  <span className="retro-font">Planted:</span>
                  <span className="retro-font retro-text-green">{plantedCrops.length}/25 tiles</span>
                </div>
                <div className="season-row">
                  <span className="retro-font">Ready:</span>
                  <span className="retro-font retro-text-amber">
                    {plantedCrops.filter(crop => crop.growthStage === 'harvestable').length} crops
                  </span>
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

            {/* Harvested Crops Inventory */}
            {harvestedCrops.length > 0 && (
              <div className="inventory-panel retro-panel">
                <h3 className="retro-font retro-text-amber">📦 INVENTORY</h3>
                <div className="inventory-content retro-panel-inset">
                  {harvestedCrops.map((crop, index) => (
                    <div key={index} className="inventory-item">
                      <div className="crop-info">
                        <span className="crop-icon">{getCropEmoji(crop.type)}</span>
                        <span className="crop-name retro-font">{crop.type.toUpperCase()}</span>
                        <span className="crop-quantity retro-font">{crop.quantity}kg</span>
                      </div>
                      <div className="crop-actions">
                        <span className="crop-price retro-font retro-text-green">
                          ₹{Math.floor((crop.quantity * cropPrices[crop.type as keyof typeof cropPrices]) / 100).toLocaleString()} total
                        </span>
                        <button
                          className="retro-button sell-button"
                          onClick={() => handleSellCrop(crop.type, crop.quantity)}
                        >
                          💰 SELL ALL
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Tips Panel */}
            <div className="tips-panel retro-panel">
              <h3 className="retro-font retro-text-amber">💡 TIPS</h3>
              <div className="tips-content retro-panel-inset">
                <p className="retro-font tip-text">
                  🌱 Plant crops → ⏰ Wait for growth → ✨ Harvest when golden → 💰 Sell for profit!
                </p>
                <p className="retro-font tip-text">
                  Harvestable crops glow gold - click to harvest!
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Weather Forecast Modal */}
      {showWeatherModal && (
        <div className="modal-overlay" onClick={() => setShowWeatherModal(false)}>
          <div className="weather-modal retro-panel" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="retro-font retro-text-green">🌍 REAL WEATHER + 🤖 AI ADVISORY</h2>
              <button 
                className="close-button retro-button"
                onClick={() => setShowWeatherModal(false)}
              >
                ✕
              </button>
            </div>
            
            <div className="weather-content">
              <div className="season-info-header retro-panel-inset">
                <h3 className="retro-font retro-text-amber">
                  {aiWeatherData?.isAI === false ? '📊 SIMULATED DATA' : '🌍 REAL WEATHER + 🤖 AI'} - {season} Season
                </h3>
                {aiWeatherData?.source && (
                  <p className="retro-font data-source">Source: {aiWeatherData.source}</p>
                )}
                {weatherLoading && (
                  <div className="ai-loading retro-font">
                    <span className="loading-spinner">🌍</span> Fetching real weather data + generating AI advisory...
                  </div>
                )}
              </div>

              {aiWeatherData && (
                <div className="ai-summary retro-panel-inset">
                  <p className="retro-font ai-summary-text">{aiWeatherData.summary}</p>
                </div>
              )}

              <div className="forecast-grid">
                {(aiWeatherData?.forecast || generateWeatherForecast()).map((forecast: any, index: number) => (
                  <div key={index} className="forecast-day retro-panel-inset">
                    <div className="day-header">
                      <span className="retro-font day-name">{forecast.day}</span>
                      <span className="weather-icon">{forecast.icon}</span>
                    </div>
                    <div className="weather-details">
                      <div className="condition retro-font">{forecast.condition?.replace('_', ' ') || forecast.condition}</div>
                      <div className="temperature retro-font retro-text-amber">
                        {forecast.temperature?.min || forecast.tempMin}°C - {forecast.temperature?.max || forecast.tempMax}°C
                      </div>
                      {forecast.rainfall > 0 && (
                        <div className="rainfall retro-font retro-text-cyan">
                          🌧️ {forecast.rainfall}mm
                        </div>
                      )}
                      <div className="humidity retro-font">
                        💧 {forecast.humidity}% humidity
                      </div>
                      {forecast.advisory && (
                        <div className="advisory retro-font retro-text-green">
                          💡 {forecast.advisory}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              <div className="farming-advisory retro-panel">
                <h3 className="retro-font retro-text-amber">
                  🌾 {aiWeatherData?.isAI === false ? 'FARMING ADVISORY' : 'AI FARMING ADVISORY'}
                </h3>
                <div className="advisory-content retro-panel-inset">
                  {(aiWeatherData?.farming_tips || getFarmingAdvisory()).map((advice: string, index: number) => (
                    <div key={index} className="advisory-item retro-font">
                      {advice}
                    </div>
                  ))}
                </div>
              </div>

              <div className="monsoon-info retro-panel">
                <h3 className="retro-font retro-text-amber">🌧️ MONSOON INSIGHTS</h3>
                <div className="monsoon-content retro-panel-inset">
                  <div className="retro-font monsoon-text">
                    {season === 'Kharif' ? 
                      '🌊 Southwest monsoon brings 70% of annual rainfall. Critical for rice and cotton cultivation.' :
                     season === 'Rabi' ? 
                      '❄️ Post-monsoon period with retreating monsoon. Ideal for wheat with residual soil moisture.' :
                     season === 'Zaid' ? 
                      '☀️ Pre-monsoon summer season. Requires intensive irrigation for crop survival.' :
                      '🍂 Transition period between seasons. Time for field preparation and planning.'
                    }
                  </div>
                  <div className="retro-font monsoon-tip retro-text-cyan">
                    💡 Tip: {season === 'Kharif' ? 'Monitor for excess water and ensure drainage' :
                            season === 'Rabi' ? 'Conserve water and use drip irrigation' :
                            season === 'Zaid' ? 'Plant early morning or evening to reduce heat stress' :
                            'Prepare soil with organic matter for next season'}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Government Schemes Modal */}
      {showSchemesModal && (
        <div className="modal-overlay" onClick={() => setShowSchemesModal(false)}>
          <div className="schemes-modal retro-panel" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="retro-font retro-text-green">📜 GOVERNMENT SCHEMES</h2>
              <button 
                className="close-button retro-button"
                onClick={() => setShowSchemesModal(false)}
              >
                ✕
              </button>
            </div>
            
            <div className="schemes-content">
              <div className="schemes-intro retro-panel-inset">
                <p className="retro-font intro-text">
                  🇮🇳 Government of India schemes to support farmers and boost agricultural productivity
                </p>
              </div>

              <div className="schemes-grid">
                {governmentSchemes.map((scheme) => {
                  const isApplied = appliedSchemes.includes(scheme.id);
                  
                  return (
                    <div key={scheme.id} className="scheme-card retro-panel">
                      <div className="scheme-header">
                        <span className="scheme-icon">{scheme.icon}</span>
                        <div className="scheme-title">
                          <h3 className="retro-font scheme-name retro-text-amber">{scheme.name}</h3>
                          <p className="retro-font scheme-full-name">{scheme.fullName}</p>
                        </div>
                      </div>

                      <div className="scheme-body retro-panel-inset">
                        <div className="scheme-description">
                          <p className="retro-font description-text">{scheme.description}</p>
                        </div>

                        <div className="scheme-benefits">
                          <h4 className="retro-font benefits-title retro-text-green">💰 Benefits:</h4>
                          <p className="retro-font benefits-text">{scheme.benefits}</p>
                        </div>

                        <div className="scheme-eligibility">
                          <h4 className="retro-font eligibility-title retro-text-cyan">✅ Eligibility:</h4>
                          <ul className="eligibility-list">
                            {scheme.eligibility.map((criteria, index) => (
                              <li key={index} className="retro-font eligibility-item">
                                • {criteria}
                              </li>
                            ))}
                          </ul>
                        </div>

                        <div className="scheme-action">
                          <button
                            className={`retro-button apply-button ${isApplied ? 'applied' : ''}`}
                            onClick={() => handleApplyScheme(scheme.id)}
                            disabled={isApplied}
                          >
                            {isApplied ? '✅ APPLIED' : '📝 APPLY NOW'}
                          </button>
                          {isApplied && (
                            <p className="retro-font applied-text retro-text-green">
                              Scheme benefits received!
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="schemes-footer retro-panel">
                <h3 className="retro-font retro-text-amber">ℹ️ IMPORTANT INFORMATION</h3>
                <div className="footer-content retro-panel-inset">
                  <div className="retro-font footer-text">
                    <p>🏛️ These schemes are implemented by the Government of India to support farmers</p>
                    <p>📋 Real applications require proper documentation and verification</p>
                    <p>🌾 Schemes help improve farmer income and reduce agricultural risks</p>
                    <p>💡 Visit your nearest Common Service Center (CSC) for assistance</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SimpleGameUI;