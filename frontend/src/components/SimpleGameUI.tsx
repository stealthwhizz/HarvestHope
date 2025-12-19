/**
 * Simplified Game UI for demonstration - Retro-styled farming game interface
 */

import React, { useState, useEffect } from 'react';
import { clearPriceCache } from '../services/marketPriceService';

import { predictWeather, predictMarketPrices, getFarmingTip } from '../services/aiPredictions';
import type { NPCData, CrisisType } from '../../../shared/types/game-state';

interface CropTile {
  id: number;
  cropType: string;
  plantedDay: number;
  growthStage: 'seedling' | 'growing' | 'mature' | 'harvestable';
  quantity: number;
}

// Loan interface
interface Loan {
  id: string;
  type: 'bank' | 'moneylender' | 'government';
  principal: number;
  interestRate: number; // Annual percentage
  monthlyEMI: number;
  remainingAmount: number;
  startDay: number;
  nextEMIDay: number;
  missedPayments: number;
  status: 'active' | 'defaulted' | 'paid';
}

// Financial transaction interface
interface Transaction {
  id: string;
  day: number;
  type: 'income' | 'expense';
  category: 'crop_sale' | 'loan_received' | 'scheme_payment' | 'emi_payment' | 'crop_purchase' | 'equipment' | 'other';
  amount: number;
  description: string;
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
  loans: Loan[];
  creditScore: number;
  transactions: Transaction[];
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
  const [loans, setLoans] = useState<Loan[]>(savedState?.loans ?? []);
  const [creditScore, setCreditScore] = useState(savedState?.creditScore ?? 750);
  const [transactions, setTransactions] = useState<Transaction[]>(savedState?.transactions ?? []);
  
  // Non-persistent UI state
  const [notifications, setNotifications] = useState<string[]>([]);
  const [showWeatherModal, setShowWeatherModal] = useState(false);
  const [showSchemesModal, setShowSchemesModal] = useState(false);
  const [showMarketModal, setShowMarketModal] = useState(false);
  const [showNPCModal, setShowNPCModal] = useState(false);
  const [showLoanModal, setShowLoanModal] = useState(false);
  const [showFinancialModal, setShowFinancialModal] = useState(false);
  const [weatherLoading, setWeatherLoading] = useState(false);
  const [aiWeatherData, setAiWeatherData] = useState<any>(null);
  const [marketData, setMarketData] = useState<any>(null);
  const [marketLoading, setMarketLoading] = useState(false);
  const [currentNPC, setCurrentNPC] = useState<NPCData | null>(null);
  const [npcLoading, setNpcLoading] = useState(false);
  const [showSaveIndicator, setShowSaveIndicator] = useState(false);

  const seasons = ['Kharif', 'Rabi', 'Zaid', 'Off-season'];
  
  // Fast crop growth configuration (in days) - optimized for gameplay
  const cropGrowthDays = {
    rice: { daysToMaturity: 12, yield: 25 },      // 12 days - fast gameplay
    wheat: { daysToMaturity: 9, yield: 30 },      // 9 days - fast gameplay  
    cotton: { daysToMaturity: 15, yield: 15 },    // 15 days - fast gameplay
    sugarcane: { daysToMaturity: 30, yield: 80 }  // 30 days - fast gameplay
  };

  const cropPrices = {
    rice: 2500,    // ₹2500 per quintal
    wheat: 2200,   // ₹2200 per quintal
    cotton: 6000,  // ₹6000 per quintal
    sugarcane: 350 // ₹350 per quintal
  };

  // Loan configurations based on Requirement 4
  const loanTypes = {
    bank: {
      name: 'Bank KCC Loan',
      interestRate: 7, // 7% annual
      maxAmount: 300000,
      description: 'Kisan Credit Card loan with collateral',
      processingTime: 'Instant approval with good credit score'
    },
    moneylender: {
      name: 'Moneylender Loan',
      interestRate: 36, // 36% annual (3% monthly)
      maxAmount: 100000,
      description: 'Quick cash but high interest',
      processingTime: 'Instant approval'
    },
    government: {
      name: 'Government Scheme Loan',
      interestRate: 4, // 4% annual
      maxAmount: 200000,
      description: 'Subsidized loan for farmers',
      processingTime: 'Requires documentation'
    }
  };

  // Calculate EMI using standard formula
  const calculateEMI = (principal: number, annualRate: number, tenureMonths: number = 12): number => {
    const monthlyRate = annualRate / 100 / 12;
    if (monthlyRate === 0) return principal / tenureMonths;
    
    const emi = (principal * monthlyRate * Math.pow(1 + monthlyRate, tenureMonths)) / 
                (Math.pow(1 + monthlyRate, tenureMonths) - 1);
    return Math.round(emi);
  };

  // Calculate total debt
  const getTotalDebt = (): number => {
    return loans.reduce((total, loan) => total + loan.remainingAmount, 0);
  };

  // Record financial transaction
  const recordTransaction = (type: Transaction['type'], category: Transaction['category'], amount: number, description: string) => {
    const transaction: Transaction = {
      id: `txn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      day,
      type,
      category,
      amount,
      description
    };
    setTransactions(prev => [...prev, transaction]);
  };

  // Get financial summary for last 30 days
  const getFinancialSummary = () => {
    const recentTransactions = transactions.filter(txn => txn.day >= day - 30);
    const income = recentTransactions.filter(txn => txn.type === 'income').reduce((sum, txn) => sum + txn.amount, 0);
    const expenses = recentTransactions.filter(txn => txn.type === 'expense').reduce((sum, txn) => sum + txn.amount, 0);
    return { income, expenses, profit: income - expenses, transactions: recentTransactions };
  };

  // Process EMI payments
  const processEMIPayments = () => {
    const updatedLoans = loans.map(loan => {
      if (loan.status !== 'active' || day < loan.nextEMIDay) return loan;
      
      // EMI is due
      if (money >= loan.monthlyEMI) {
        // Payment successful
        const newRemainingAmount = Math.max(0, loan.remainingAmount - loan.monthlyEMI);
        const newStatus = newRemainingAmount === 0 ? 'paid' : 'active';
        
        setMoney(prev => prev - loan.monthlyEMI);
        recordTransaction('expense', 'emi_payment', loan.monthlyEMI, `EMI for ${loanTypes[loan.type].name}`);
        setNotifications(prev => [...prev, `💳 EMI paid: ₹${loan.monthlyEMI.toLocaleString()} for ${loanTypes[loan.type].name}`]);
        
        // Improve credit score for on-time payment
        setCreditScore(prev => Math.min(850, prev + 2));
        
        return {
          ...loan,
          remainingAmount: newRemainingAmount,
          nextEMIDay: day + 30, // Next EMI in 30 days
          status: newStatus
        } as Loan;
      } else {
        // Payment failed - missed EMI
        const newMissedPayments = loan.missedPayments + 1;
        const penalty = Math.round(loan.monthlyEMI * 0.02); // 2% penalty
        
        setNotifications(prev => [...prev, `⚠️ EMI missed! Penalty: ₹${penalty.toLocaleString()}`]);
        
        // Reduce credit score for missed payment
        setCreditScore(prev => Math.max(300, prev - 10));
        
        return {
          ...loan,
          remainingAmount: loan.remainingAmount + penalty,
          nextEMIDay: day + 30,
          missedPayments: newMissedPayments,
          status: (newMissedPayments >= 3 ? 'defaulted' : 'active') as Loan['status']
        };
      }
    });
    
    setLoans(updatedLoans);
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
      loans,
      creditScore,
      transactions,
      lastSaved: Date.now()
    };
    
    // Save to localStorage
    saveGameState(gameState);
    
    // Show save indicator
    setShowSaveIndicator(true);
    const timer = setTimeout(() => setShowSaveIndicator(false), 2000);
    
    return () => clearTimeout(timer);
  }, [money, day, season, selectedCrop, plantedCrops, harvestedCrops, appliedSchemes, loans, creditScore, transactions]);

  // Show welcome back message if game was loaded
  useEffect(() => {
    if (savedState) {
      setNotifications(prev => [...prev, `🎮 Welcome back! Game loaded from Day ${savedState.day}`]);
      setTimeout(() => {
        setNotifications(prev => prev.slice(1));
      }, 4000);
    }
    
    // AI features are available but no startup notifications
    
    setTimeout(() => {
      setNotifications(prev => prev.slice(1));
    }, 6000);
  }, []); // Only run once on mount
  
  // Apply for loan
  const applyForLoan = (type: keyof typeof loanTypes, amount: number) => {
    const loanConfig = loanTypes[type];
    
    // Validation
    if (amount > loanConfig.maxAmount) {
      setNotifications(prev => [...prev, `❌ Loan amount exceeds maximum limit of ₹${loanConfig.maxAmount.toLocaleString()}`]);
      return;
    }
    
    if (amount < 10000) {
      setNotifications(prev => [...prev, `❌ Minimum loan amount is ₹10,000`]);
      return;
    }
    
    // Credit score check for bank loans
    if (type === 'bank' && creditScore < 650) {
      setNotifications(prev => [...prev, `❌ Bank loan rejected. Credit score too low: ${creditScore}/850`]);
      return;
    }
    
    // Create new loan
    const monthlyEMI = calculateEMI(amount, loanConfig.interestRate);
    const newLoan: Loan = {
      id: `loan_${Date.now()}`,
      type,
      principal: amount,
      interestRate: loanConfig.interestRate,
      monthlyEMI,
      remainingAmount: amount,
      startDay: day,
      nextEMIDay: day + 30, // First EMI in 30 days
      missedPayments: 0,
      status: 'active'
    };
    
    setLoans(prev => [...prev, newLoan]);
    setMoney(prev => prev + amount);
    recordTransaction('income', 'loan_received', amount, `${loanConfig.name} disbursed`);
    setNotifications(prev => [...prev, `✅ ${loanConfig.name} approved! ₹${amount.toLocaleString()} credited. EMI: ₹${monthlyEMI.toLocaleString()}/month`]);
    setShowLoanModal(false);
  };

  const handleAdvanceDay = () => {
    const newDay = day + 1;
    setDay(newDay);
    
    // Daily farm maintenance cost (realistic farming expense)
    const dailyMaintenanceCost = 200 + Math.floor(plantedCrops.length * 50); // Base cost + per crop
    if (money >= dailyMaintenanceCost) {
      setMoney(prev => prev - dailyMaintenanceCost);
      recordTransaction('expense', 'other', dailyMaintenanceCost, 'Daily farm maintenance');
    }
    
    // Check for upcoming EMI payments (3 days warning)
    const upcomingEMIs = loans.filter(loan => 
      loan.status === 'active' && 
      loan.nextEMIDay - newDay <= 3 && 
      loan.nextEMIDay > newDay
    );
    
    if (upcomingEMIs.length > 0) {
      const daysLeft = upcomingEMIs[0].nextEMIDay - newDay;
      setNotifications(prev => [...prev, `⏰ EMI due in ${daysLeft} days: ₹${upcomingEMIs[0].monthlyEMI.toLocaleString()}`]);
    }
    
    // Process EMI payments for the new day
    processEMIPayments();
    
    // Clear market price cache for new day
    clearPriceCache();
    setMarketData(null);
    
    // Change season every 30 days for demo
    if (newDay % 30 === 0) {
      const currentIndex = seasons.indexOf(season);
      const nextIndex = (currentIndex + 1) % seasons.length;
      setSeason(seasons[nextIndex]);
    }
  };

  const handleSkipMonth = () => {
    if (!confirm('⏭️ Skip 30 days? This will:\n• Advance crops by 30 days\n• Process any due EMI payments\n• Charge monthly maintenance costs\n• Change season\n\nContinue?')) {
      return;
    }
    
    const daysToSkip = 30;
    const newDay = day + daysToSkip;
    setDay(newDay);
    
    // Calculate total maintenance cost for the month
    const dailyMaintenanceCost = 200 + Math.floor(plantedCrops.length * 50);
    const monthlyMaintenanceCost = dailyMaintenanceCost * daysToSkip;
    
    if (money >= monthlyMaintenanceCost) {
      setMoney(prev => prev - monthlyMaintenanceCost);
      recordTransaction('expense', 'other', monthlyMaintenanceCost, `Monthly farm maintenance (${daysToSkip} days)`);
    }
    
    // Process any EMI payments that would be due during the skipped month
    const updatedLoans = loans.map(loan => {
      if (loan.status !== 'active') return loan;
      
      // Calculate how many EMIs are due during the skipped period
      let emisDue = 0;
      let nextEMIDay = loan.nextEMIDay;
      
      while (nextEMIDay <= newDay) {
        emisDue++;
        nextEMIDay += 30; // Next EMI in 30 days
      }
      
      if (emisDue > 0) {
        const totalEMIAmount = loan.monthlyEMI * emisDue;
        
        if (money >= totalEMIAmount) {
          // Pay all due EMIs
          setMoney(prev => prev - totalEMIAmount);
          recordTransaction('expense', 'emi_payment', totalEMIAmount, `${emisDue} EMI payments for ${loanTypes[loan.type].name}`);
          
          const newRemainingAmount = Math.max(0, loan.remainingAmount - totalEMIAmount);
          const newStatus = newRemainingAmount === 0 ? 'paid' : 'active';
          
          // Improve credit score for on-time payments
          setCreditScore(prev => Math.min(850, prev + (2 * emisDue)));
          
          return {
            ...loan,
            remainingAmount: newRemainingAmount,
            nextEMIDay: nextEMIDay,
            status: newStatus
          } as Loan;
        } else {
          // Missed payments - apply penalties
          const penalty = Math.round(loan.monthlyEMI * 0.02 * emisDue);
          const newMissedPayments = loan.missedPayments + emisDue;
          
          // Reduce credit score for missed payments
          setCreditScore(prev => Math.max(300, prev - (10 * emisDue)));
          
          setNotifications(prev => [...prev, `⚠️ Missed ${emisDue} EMI payments! Penalty: ₹${penalty.toLocaleString()}`]);
          
          return {
            ...loan,
            remainingAmount: loan.remainingAmount + penalty,
            nextEMIDay: nextEMIDay,
            missedPayments: newMissedPayments,
            status: (newMissedPayments >= 3 ? 'defaulted' : 'active') as Loan['status']
          };
        }
      }
      
      return loan;
    });
    
    setLoans(updatedLoans);
    
    // Clear market price cache for new day
    clearPriceCache();
    setMarketData(null);
    
    // Change season (every 30 days)
    const currentIndex = seasons.indexOf(season);
    const nextIndex = (currentIndex + 1) % seasons.length;
    setSeason(seasons[nextIndex]);
    
    // Show notification
    setNotifications(prev => [...prev, `⏭️ Skipped ${daysToSkip} days! New season: ${seasons[nextIndex]}`]);
    setTimeout(() => {
      setNotifications(prev => prev.slice(1));
    }, 4000);
  };

  const handleNewGame = () => {
    if (confirm('🔄 Start a new game? All current progress will be lost!')) {
      // Clear localStorage
      localStorage.removeItem('harvestHopeSave');
      
      // Reset all state to defaults
      setMoney(100000);
      setLoans([]);
      setCreditScore(750);
      setTransactions([]);
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
        recordTransaction('expense', 'crop_purchase', plantingCost, `Planted ${selectedCrop} seeds`);
        
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
    recordTransaction('income', 'crop_sale', revenue, `Sold ${quantity}kg ${cropType.toUpperCase()}`);
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
      recordTransaction('income', 'scheme_payment', scheme.amount, `${scheme.name} benefit received`);
      setNotifications(prev => [...prev, `✅ ${scheme.name}: ₹${scheme.amount.toLocaleString()} received!`]);
    } else if (scheme.type === 'insurance') {
      // For demo, give immediate benefit
      setMoney(prev => prev + scheme.amount);
      recordTransaction('income', 'scheme_payment', scheme.amount, `${scheme.name} insurance payout`);
      setNotifications(prev => [...prev, `🛡️ ${scheme.name}: Insurance coverage activated!`]);
    } else if (scheme.type === 'credit') {
      setMoney(prev => prev + scheme.amount);
      recordTransaction('income', 'scheme_payment', scheme.amount, `${scheme.name} credit facility`);
      setNotifications(prev => [...prev, `💳 ${scheme.name}: Credit facility approved!`]);
    }

    // Auto-hide notification after 4 seconds
    setTimeout(() => {
      setNotifications(prev => prev.slice(1));
    }, 4000);
  };

  // AI Weather Analytics
  const fetchSimpleWeatherPrediction = async () => {
    setWeatherLoading(true);
    
    try {
      console.log('🌦️ Analyzing weather patterns with AI...');
      
      // Get simple weather prediction with game context
      const currentCrops = plantedCrops.map(crop => crop.cropType);
      const weatherForecast = await predictWeather(day, season, 'Maharashtra', currentCrops);
      
      // Get farming tip for current crop with growth stage
      const currentCrop = selectedCrop || 'rice';
      const currentPlantedCrop = plantedCrops.find(crop => crop.cropType === currentCrop);
      const growthStage = currentPlantedCrop?.growthStage || 'growing';
      const farmingTip = await getFarmingTip(currentCrop, season, day, growthStage);
      
      // Create simple weather data
      const simpleWeatherData = {
        forecast: weatherForecast,
        farmingTip: farmingTip,
        season: season,
        day: day,
        isAI: true,
        source: 'AI Weather Analytics'
      };
      
      setAiWeatherData(simpleWeatherData);
      
    } catch (error) {
      console.error('🚨 Weather prediction error:', error);
      
      // Fallback weather
      const fallbackWeather = {
        forecast: 'Day 1: Sunny, Day 2: Cloudy, Day 3: Rainy',
        farmingTip: 'Monitor your crops regularly and maintain good farming practices.',
        season: season,
        day: day,
        isAI: false,
        source: 'Weather Simulation Engine'
      };
      
      setAiWeatherData(fallbackWeather);
    }
    
    setWeatherLoading(false);
    setTimeout(() => {
      setNotifications(prev => prev.slice(1));
    }, 3000);
  };

  // AI Market Analytics
  const fetchSimpleMarketPrices = async () => {
    setMarketLoading(true);
    
    try {
      console.log('💹 Analyzing market trends with AI...');
      
      // Get AI prices for all crops
      const crops = ['rice', 'wheat', 'cotton', 'sugarcane'];
      const marketPrices: { [key: string]: number } = {};
      
      for (const crop of crops) {
        const harvestedCrop = harvestedCrops.find(item => item.type === crop);
        const quantity = harvestedCrop?.quantity || 0;
        const price = await predictMarketPrices(crop, season, day, money, quantity);
        marketPrices[crop] = price;
      }
      
      // Create simple market data
      const simpleMarketData = {
        date: `Day ${day}`,
        season: season,
        prices: marketPrices,
        isAI: true,
        source: 'AI Market Analytics'
      };
      
      setMarketData(simpleMarketData);
      
    } catch (error) {
      console.error('🚨 Market price error:', error);
      
      // Fallback prices (MSP)
      const fallbackPrices = {
        date: `Day ${day}`,
        season: season,
        prices: {
          rice: 2100,
          wheat: 2125,
          cotton: 5500,
          sugarcane: 290
        },
        isAI: false,
        source: 'Government MSP Database'
      };
      
      setMarketData(fallbackPrices);
    }
    
    setMarketLoading(false);
    setTimeout(() => {
      setNotifications(prev => prev.slice(1));
    }, 3000);
  };

  // Helper functions to extract information from AI-generated stories
  const extractNameFromStory = (story: string): string | null => {
    const nameMatch = story.match(/([A-Z][a-z]+ [A-Z][a-z]+)/);
    return nameMatch ? nameMatch[1] : null;
  };

  const extractLocationFromStory = (story: string): string => {
    const locations = ['Vidarbha', 'Marathwada', 'Western Maharashtra', 'Konkan', 'Northern Maharashtra'];
    for (const location of locations) {
      if (story.includes(location)) return location;
    }
    return 'Maharashtra';
  };

  const extractCrisisFromStory = (story: string): string => {
    if (story.includes('flood') || story.includes('water')) return 'flood';
    if (story.includes('drought') || story.includes('rain') || story.includes('dry')) return 'drought';
    if (story.includes('pest') || story.includes('bollworm') || story.includes('insect')) return 'pest';
    if (story.includes('debt') || story.includes('loan') || story.includes('money')) return 'debt';
    if (story.includes('health') || story.includes('medical') || story.includes('hospital')) return 'health';
    if (story.includes('equipment') || story.includes('tractor') || story.includes('machine')) return 'equipment';
    return 'debt'; // Default
  };

  // Generate fallback NPC when service is unavailable
  const generateFallbackNPC = (): NPCData => {
    const names = [
      'Ramesh Kumar', 'Priya Sharma', 'Suresh Patel', 'Meera Devi', 'Rajesh Singh',
      'Sunita Yadav', 'Mohan Reddy', 'Kavita Joshi', 'Anil Gupta', 'Rekha Kumari'
    ];
    
    const locations = [
      'Vidarbha, Maharashtra', 'Bundelkhand, Uttar Pradesh', 'Rayalaseema, Andhra Pradesh',
      'Marathwada, Maharashtra', 'Telangana', 'Punjab', 'Haryana', 'Karnataka'
    ];
    
    const crises: CrisisType[] = ['drought', 'flood', 'pest', 'debt', 'health', 'equipment'];
    const farmSizes = ['small (1-2 acres)', 'medium (3-5 acres)', 'large (6+ acres)'];
    const crops = [['rice', 'cotton'], ['wheat', 'sugarcane'], ['cotton', 'soybean'], ['rice', 'vegetables']];
    
    const backstories = [
      'A third-generation farmer struggling to maintain traditional farming methods in changing times.',
      'A young farmer trying to modernize the family farm while dealing with mounting debts.',
      'A widow managing her late husband\'s farm while raising three children alone.',
      'A progressive farmer experimenting with organic methods but facing market challenges.',
      'An elderly farmer whose sons moved to the city, leaving him to manage the farm alone.',
      'A tenant farmer working on leased land with dreams of owning property someday.',
      'A farmer who lost crops to unexpected weather and is rebuilding from scratch.',
      'A cooperative leader helping other farmers but neglecting his own financial troubles.'
    ];
    
    const selectedCrisis = crises[Math.floor(Math.random() * crises.length)];
    const crisisLevel = Math.floor(Math.random() * 5) + 1;
    
    const crisisDetails: Record<CrisisType, string> = {
      drought: `Facing severe water shortage for ${crisisLevel} consecutive months. Wells have dried up and crops are withering.`,
      flood: `Farm flooded ${crisisLevel} times this season. Lost standing crops worth ₹${(crisisLevel * 25000).toLocaleString()}.`,
      pest: `Pest attack destroyed ${crisisLevel * 20}% of crops. Spent ₹${(crisisLevel * 15000).toLocaleString()} on pesticides with little success.`,
      debt: `Owes ₹${(crisisLevel * 100000).toLocaleString()} to moneylenders at ${crisisLevel * 8}% monthly interest. Unable to repay.`,
      health: `Suffering from ${crisisLevel > 3 ? 'chronic illness' : 'health issues'} for ${crisisLevel} months. Medical bills mounting.`,
      equipment: `Tractor broke down ${crisisLevel} months ago. Cannot afford ₹${(crisisLevel * 50000).toLocaleString()} repair cost.`
    };
    
    return {
      id: `npc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name: names[Math.floor(Math.random() * names.length)],
      age: 25 + Math.floor(Math.random() * 40),
      location: locations[Math.floor(Math.random() * locations.length)],
      backstory: backstories[Math.floor(Math.random() * backstories.length)],
      currentCrisis: selectedCrisis,
      relationshipLevel: Math.floor(Math.random() * 21) - 10, // -10 to 10
      dialogueHistory: [],
      farmSize: farmSizes[Math.floor(Math.random() * farmSizes.length)],
      familySize: Math.floor(Math.random() * 6) + 1,
      primaryCrops: crops[Math.floor(Math.random() * crops.length)],
      educationLevel: Math.random() > 0.7 ? 'High School' : Math.random() > 0.4 ? 'Primary' : 'Illiterate',
      personality: Math.random() > 0.5 ? 'Optimistic despite challenges' : 'Worried but determined',
      crisisDetails: crisisDetails[selectedCrisis],
      dialogueStyle: 'Speaks with rural Indian dialect, emotional about farming struggles',
      createdAt: new Date().toISOString(),
      lastInteraction: new Date().toISOString()
    };
  };

  // Handle Meet Farmers button click - AI Generated Stories
  const handleMeetFarmers = async () => {
    setNpcLoading(true);
    
    try {
      console.log('🤝 Generating AI farmer story...');
      
      // Determine weather condition based on season
      const weatherCondition = season === 'Kharif' ? 'rainy' : 
                              season === 'Zaid' ? 'hot' : 'normal';
      
      // Generate AI-powered farmer story
      const { generateNPCFarmerStory } = await import('../services/aiPredictions');
      const aiStory = await generateNPCFarmerStory(season, day, money, weatherCondition);
      
      // Create NPC data from AI story
      const aiNPC: NPCData = {
        id: `ai_npc_${Date.now()}`,
        name: extractNameFromStory(aiStory) || 'Anonymous Farmer',
        age: Math.floor(Math.random() * 30) + 35, // 35-65 years old
        location: extractLocationFromStory(aiStory) || 'Maharashtra',
        backstory: aiStory,
        currentCrisis: extractCrisisFromStory(aiStory) as CrisisType,
        relationshipLevel: 0,
        dialogueHistory: [
          {
            id: `dialogue_${Date.now()}`,
            npcId: `ai_npc_${Date.now()}`,
            playerChoice: 'Tell me about your situation',
            npcResponse: `"${aiStory.split('.')[0]}."`,
            timestamp: new Date().toISOString(),
            relationshipChange: 0
          }
        ],
        farmSize: `${Math.floor(Math.random() * 5) + 1} acres`,
        primaryCrops: plantedCrops.length > 0 ? plantedCrops.map(c => c.cropType) : ['rice', 'wheat'],
        crisisDetails: aiStory,
        lastInteraction: new Date().toISOString()
      };
      
      setCurrentNPC(aiNPC);
      
    } catch (error) {
      console.error('🚨 AI NPC generation error:', error);
      console.log('🔄 Using fallback farmer story');
      
      // Use fallback NPC generation
      const fallbackNPC = generateFallbackNPC();
      setCurrentNPC(fallbackNPC);
    }
    
    setShowNPCModal(true);
    setNpcLoading(false);
    
    setTimeout(() => {
      setNotifications(prev => prev.slice(1));
    }, 3000);
  };

  // Get crisis level color
  const getCrisisColor = (crisis: CrisisType): string => {
    const crisisLevels: Record<CrisisType, number> = {
      health: 5,
      debt: 4,
      equipment: 3,
      drought: 3,
      flood: 3,
      pest: 2
    };
    
    const level = crisisLevels[crisis] || 1;
    
    if (level >= 5) return '#ff4444'; // Red - Critical
    if (level >= 4) return '#ff8800'; // Orange - High
    if (level >= 3) return '#ffaa00'; // Yellow - Medium
    if (level >= 2) return '#88cc00'; // Light Green - Low
    return '#44ff44'; // Green - Minimal
  };

  // Get crisis level text
  const getCrisisLevelText = (crisis: CrisisType): string => {
    const crisisLevels: Record<CrisisType, number> = {
      health: 5,
      debt: 4,
      equipment: 3,
      drought: 3,
      flood: 3,
      pest: 2
    };
    
    const level = crisisLevels[crisis] || 1;
    
    if (level >= 5) return 'CRITICAL';
    if (level >= 4) return 'HIGH';
    if (level >= 3) return 'MEDIUM';
    if (level >= 2) return 'LOW';
    return 'MINIMAL';
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
                    className={`retro-button retro-font ${selectedCrop === cropType ? 'retro-button-green' : ''}`}
                    onClick={() => setSelectedCrop(cropType)}
                  >
                    {getCropEmoji(cropType)} {cropType.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>

            {/* Action Sections - Below Crop Selection */}
            <div className="farm-actions-container">
              {/* Farm Information Section */}
              <div className="action-section">
                <h4 className="retro-font retro-text-cyan section-title">🌾 FARM INFO</h4>
                <button 
                  className="retro-button action-button"
                  onClick={() => {
                    setShowWeatherModal(true);
                    if (!aiWeatherData) {
                      fetchSimpleWeatherPrediction();
                    }
                  }}
                  disabled={weatherLoading}
                >
                  {weatherLoading ? '🌍 FETCHING...' : '🌦️ WEATHER'}
                </button>

                <button 
                  className="retro-button action-button"
                  onClick={() => {
                    setShowMarketModal(true);
                    if (!marketData || marketData.date !== `Day ${day}`) {
                      fetchSimpleMarketPrices();
                    }
                  }}
                  disabled={marketLoading}
                >
                  {marketLoading ? '💹 CHECKING...' : '🏪 MARKET'}
                </button>
              </div>

              {/* Financial Section */}
              <div className="action-section">
                <h4 className="retro-font retro-text-amber section-title">💰 FINANCE</h4>
                <button 
                  className="retro-button action-button"
                  onClick={() => setShowLoanModal(true)}
                >
                  💳 LOANS
                </button>

                <button 
                  className="retro-button action-button"
                  onClick={() => setShowFinancialModal(true)}
                >
                  📊 FINANCES
                </button>
              </div>

              {/* Support Section */}
              <div className="action-section">
                <h4 className="retro-font retro-text-green section-title">🤝 SUPPORT</h4>
                <button 
                  className="retro-button action-button"
                  onClick={() => setShowSchemesModal(true)}
                >
                  📜 SCHEMES
                </button>

                <button 
                  className="retro-button action-button"
                  onClick={handleMeetFarmers}
                  disabled={npcLoading}
                >
                  {npcLoading ? '🤝 CONNECTING...' : '👥 FARMERS'}
                </button>
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
                  <span className={`retro-font ${getTotalDebt() > 0 ? 'retro-text-red' : 'retro-text-green'}`}>
                    ₹{getTotalDebt().toLocaleString()}
                  </span>
                </div>
                <div className="financial-row">
                  <span className="retro-font">Credit Score:</span>
                  <span className={`retro-font ${creditScore >= 700 ? 'retro-text-green' : creditScore >= 600 ? 'retro-text-yellow' : 'retro-text-red'}`}>
                    {creditScore}/850
                  </span>
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
                onClick={handleSkipMonth}
                className="retro-button retro-button-blue action-button"
                title="Skip 30 days - crops will grow, EMIs will be processed"
              >
                ⏭️ SKIP MONTH
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
              <h2 className="retro-font retro-text-green">🌦️ AI WEATHER PREDICTION</h2>
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
                  {aiWeatherData?.isAI === false ? '📊 FALLBACK DATA' : '🤖 AI POWERED'} - {season} Season, Day {day}
                </h3>
                {aiWeatherData?.source && (
                  <div className="source-info">
                    <p className="retro-font data-source">Source: {aiWeatherData.source}</p>
                    {aiWeatherData?.isAI !== false && (
                      <div className="ai-badge retro-font">
                        <span className="ai-indicator">✨ AI POWERED ANALYTICS</span>
                      </div>
                    )}
                  </div>
                )}
                {weatherLoading && (
                  <div className="ai-loading retro-font">
                    <span className="loading-spinner">🌦️</span> Analyzing weather patterns...
                  </div>
                )}
              </div>

              {aiWeatherData && (
                <div className="simple-weather-display retro-panel-inset">
                  <h3 className="retro-font retro-text-amber">🌦️ 3-Day Forecast</h3>
                  <div className="forecast-text retro-font">
                    {aiWeatherData.forecast}
                  </div>
                </div>
              )}

              {aiWeatherData && (
                <div className="farming-tip retro-panel-inset">
                  <h3 className="retro-font retro-text-green">🌾 Farming Tip for {selectedCrop.toUpperCase()}</h3>
                  <div className="tip-text retro-font">
                    {aiWeatherData.farmingTip}
                  </div>
                </div>
              )}

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

      {/* Market Prices Modal */}
      {showMarketModal && (
        <div className="modal-overlay" onClick={() => setShowMarketModal(false)}>
          <div className="market-modal retro-panel" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="retro-font retro-text-green">💹 MARKET PRICES - {marketData?.date || `Day ${day}`}</h2>
              <span className={`ai-badge retro-font ${(marketData as any)?.isAI !== false ? 'retro-text-amber' : 'retro-text-red'}`}>
                {(marketData as any)?.isAI !== false ? '🤖 AI-Powered' : '📊 Simulation Mode'}
              </span>
              <button 
                className="close-button retro-button"
                onClick={() => setShowMarketModal(false)}
              >
                ✕
              </button>
            </div>
            
            {marketLoading ? (
              <div className="loading-section retro-panel-inset">
                <div className="retro-font retro-text-cyan">🤖 Analyzing market trends...</div>
              </div>
            ) : marketData ? (
              <>
                {/* Simple Market Info */}
                <div className="market-summary retro-panel-inset">
                  <div className="retro-font retro-text-amber" style={{fontSize: '10px', marginBottom: '8px'}}>
                    📊 Current Market Prices - {marketData.season} Season
                  </div>
                  <div className="retro-font" style={{fontSize: '9px'}}>
                    Source: {marketData.source}
                  </div>
                </div>

                {/* Price Table */}
                <div className="price-table retro-panel-inset">
                  <table className="retro-font" style={{width: '100%', fontSize: '9px'}}>
                    <thead>
                      <tr style={{borderBottom: '1px solid #4af626'}}>
                        <th style={{padding: '8px', textAlign: 'left'}}>Crop</th>
                        <th style={{padding: '8px', textAlign: 'right'}}>Market Price</th>
                        <th style={{padding: '8px', textAlign: 'right'}}>MSP Floor</th>
                        <th style={{padding: '8px', textAlign: 'center'}}>Trend</th>
                        <th style={{padding: '8px', textAlign: 'right'}}>Your Stock</th>
                        <th style={{padding: '8px', textAlign: 'center'}}>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {Object.entries(marketData.prices).map(([crop, data]: [string, any]) => {
                        const playerStock = harvestedCrops.find(item => item.type === crop);
                        const quantity = playerStock?.quantity || 0;
                        const priceValue = typeof data === 'number' ? data : data.market_price || data;
                        const totalValue = Math.floor((quantity * priceValue) / 100); // Convert kg to quintal pricing
                        
                        return (
                          <tr key={crop} style={{borderBottom: '1px solid #333'}}>
                            <td style={{padding: '6px'}}>
                              {getCropEmoji(crop)} {crop.toUpperCase()}
                            </td>
                            <td style={{padding: '6px', textAlign: 'right'}} className="retro-text-green">
                              ₹{priceValue.toLocaleString('en-IN')}
                              <div style={{fontSize: '7px', color: '#888'}}>/quintal</div>
                            </td>
                            <td style={{padding: '6px', textAlign: 'right'}} className="retro-text-amber">
                              MSP
                            </td>
                            <td style={{padding: '6px', textAlign: 'center'}}>
                              🤖 AI
                            </td>
                            <td style={{padding: '6px', textAlign: 'right'}}>
                              {quantity > 0 ? (
                                <>
                                  <div>{quantity}kg</div>
                                  <div className="retro-text-cyan" style={{fontSize: '7px'}}>
                                    ≈ ₹{totalValue.toLocaleString('en-IN')}
                                  </div>
                                </>
                              ) : (
                                <span style={{color: '#666'}}>No stock</span>
                              )}
                            </td>
                            <td style={{padding: '6px', textAlign: 'center'}}>
                              {quantity > 0 ? (
                                <button
                                  className="retro-button"
                                  style={{fontSize: '8px', padding: '4px 8px'}}
                                  onClick={() => {
                                    handleSellCrop(crop, quantity);
                                    setShowMarketModal(false);
                                  }}
                                >
                                  💰 SELL
                                </button>
                              ) : (
                                <span style={{color: '#666', fontSize: '8px'}}>-</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Price Explanations */}
                <div className="price-reasons retro-panel-inset">
                  <h3 className="retro-font retro-text-amber" style={{fontSize: '10px', marginBottom: '8px'}}>
                    📊 Market Analysis
                  </h3>
                  {Object.entries(marketData.prices).map(([crop, price]: [string, any]) => {
                    const priceValue = typeof price === 'number' ? price : price.market_price || price;
                    const playerStock = harvestedCrops.find(item => item.type === crop);
                    const hasStock = playerStock && playerStock.quantity > 0;
                    const isSeasonalCrop = (season === 'Kharif' && (crop === 'rice' || crop === 'cotton')) ||
                                          (season === 'Rabi' && crop === 'wheat');
                    
                    const contextualAdvice = hasStock ? 
                      (isSeasonalCrop ? `Good time to sell - ${season} season demand high` : 'Consider holding for better prices') :
                      (isSeasonalCrop ? `Plant ${crop} - favorable season` : 'Off-season crop');
                    
                    return (
                      <div key={crop} className="reason-card" style={{marginBottom: '6px'}}>
                        <span className="retro-font retro-text-green" style={{fontSize: '9px'}}>
                          {crop.toUpperCase()}:
                        </span>
                        <span className="retro-font" style={{fontSize: '8px', marginLeft: '8px'}}>
                          ₹{priceValue.toLocaleString('en-IN')}/quintal - {contextualAdvice}
                        </span>
                      </div>
                    );
                  })}
                </div>

                {/* Educational Info */}
                <div className="educational-info retro-panel-inset">
                  <h4 className="retro-font retro-text-amber" style={{fontSize: '10px', marginBottom: '6px'}}>
                    💡 What is MSP?
                  </h4>
                  <p className="retro-font" style={{fontSize: '8px', lineHeight: '1.4'}}>
                    Minimum Support Price (MSP) is the minimum price at which the 
                    government buys crops from farmers. Market prices can go above 
                    MSP, but the government ensures you never sell below MSP.
                  </p>
                </div>
              </>
            ) : (
              <div className="retro-panel-inset">
                <div className="retro-font">No market data available</div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* NPC (Farmer Stories) Modal */}
      {showNPCModal && currentNPC && (
        <div className="modal-overlay" onClick={() => setShowNPCModal(false)}>
          <div className="npc-modal retro-panel" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="retro-font retro-text-green">👥 FARMER STORIES</h2>
              <button 
                className="close-button retro-button"
                onClick={() => setShowNPCModal(false)}
              >
                ✕
              </button>
            </div>
            
            <div className="npc-content">
              {/* Farmer Profile Header */}
              <div className="npc-profile retro-panel-inset">
                <div className="npc-header-info">
                  <h3 className="retro-font retro-text-amber npc-name">{currentNPC.name}</h3>
                  <div className="npc-basic-info">
                    <span className="retro-font npc-age">Age: {currentNPC.age}</span>
                    <span className="retro-font npc-location">📍 {currentNPC.location}</span>
                  </div>
                </div>
                
                {/* Crisis Level Indicator */}
                <div className="crisis-indicator">
                  <div className="crisis-header">
                    <span className="retro-font crisis-label">Crisis Level:</span>
                    <span 
                      className="retro-font crisis-level"
                      style={{ color: getCrisisColor(currentNPC.currentCrisis) }}
                    >
                      {getCrisisLevelText(currentNPC.currentCrisis)}
                    </span>
                  </div>
                  <div className="crisis-type retro-font">
                    {currentNPC.currentCrisis.toUpperCase()} CRISIS
                  </div>
                </div>
              </div>

              {/* Farm Details */}
              <div className="npc-farm-details retro-panel-inset">
                <h4 className="retro-font retro-text-amber">🚜 FARM DETAILS</h4>
                <div className="farm-info-grid">
                  <div className="farm-info-item">
                    <span className="retro-font info-label">Farm Size:</span>
                    <span className="retro-font info-value">{currentNPC.farmSize}</span>
                  </div>
                  <div className="farm-info-item">
                    <span className="retro-font info-label">Family:</span>
                    <span className="retro-font info-value">{currentNPC.familySize} members</span>
                  </div>
                  <div className="farm-info-item">
                    <span className="retro-font info-label">Main Crops:</span>
                    <span className="retro-font info-value">
                      {currentNPC.primaryCrops?.join(', ') || 'Mixed farming'}
                    </span>
                  </div>
                  <div className="farm-info-item">
                    <span className="retro-font info-label">Education:</span>
                    <span className="retro-font info-value">{currentNPC.educationLevel}</span>
                  </div>
                </div>
              </div>

              {/* Farmer's Story */}
              <div className="npc-story retro-panel-inset">
                <h4 className="retro-font retro-text-amber">📖 FARMER'S STORY</h4>
                <div className="story-content">
                  <p className="retro-font story-backstory">{currentNPC.backstory}</p>
                  
                  {currentNPC.crisisDetails && (
                    <div className="crisis-details">
                      <h5 className="retro-font crisis-details-title retro-text-red">
                        Current Crisis:
                      </h5>
                      <p className="retro-font crisis-details-text">{currentNPC.crisisDetails}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Relationship & Dialogue */}
              <div className="npc-dialogue retro-panel-inset">
                <h4 className="retro-font retro-text-amber">💬 CONVERSATION</h4>
                <div className="relationship-status">
                  <span className="retro-font relationship-label">Relationship:</span>
                  <span 
                    className={`retro-font relationship-value ${
                      currentNPC.relationshipLevel > 5 ? 'retro-text-green' : 
                      currentNPC.relationshipLevel < -5 ? 'retro-text-red' : 
                      'retro-text-amber'
                    }`}
                  >
                    {currentNPC.relationshipLevel > 5 ? 'Friendly' : 
                     currentNPC.relationshipLevel < -5 ? 'Distant' : 'Neutral'}
                    ({currentNPC.relationshipLevel > 0 ? '+' : ''}{currentNPC.relationshipLevel})
                  </span>
                </div>
                
                <div className="dialogue-content">
                  <div className="npc-dialogue-text retro-font">
                    {currentNPC.currentCrisis === 'debt' && 
                      `"The moneylenders are demanding payment, but how can I pay when the crops failed? My family depends on this farm, but the debt keeps growing every month..."`
                    }
                    {currentNPC.currentCrisis === 'drought' && 
                      `"The wells have dried up and there's no rain in sight. I watch my crops wither every day, knowing my family's future is dying with them..."`
                    }
                    {currentNPC.currentCrisis === 'flood' && 
                      `"The floods came so suddenly. Everything we worked for this season is underwater. How do we start over when we have nothing left?"`
                    }
                    {currentNPC.currentCrisis === 'pest' && 
                      `"The pests destroyed half my crop before I could stop them. I spent everything on pesticides, but it wasn't enough. What will I tell my children?"`
                    }
                    {currentNPC.currentCrisis === 'health' && 
                      `"I can barely work the fields anymore, but who else will do it? The medical bills are piling up, and the farm is all we have..."`
                    }
                    {currentNPC.currentCrisis === 'equipment' && 
                      `"My tractor broke down during planting season. Without it, I can't prepare the fields properly. The repair costs more than I earn in a year..."`
                    }
                  </div>
                </div>
              </div>

              {/* Educational Content */}
              <div className="npc-education retro-panel-inset">
                <h4 className="retro-font retro-text-amber">💡 LEARNING OPPORTUNITY</h4>
                <div className="education-content">
                  <p className="retro-font education-text">
                    This farmer's situation highlights the challenges of {currentNPC.currentCrisis} crisis in Indian agriculture. 
                    Understanding these real-world problems helps us appreciate the complexity of farming decisions.
                  </p>
                  
                  <div className="education-tip">
                    <span className="retro-font tip-label">💡 Did you know:</span>
                    <span className="retro-font tip-text">
                      {currentNPC.currentCrisis === 'debt' && 
                        'Government schemes like PM-KISAN provide ₹6,000 annual support to small farmers, and Kisan Credit Cards offer loans at just 7% interest.'
                      }
                      {currentNPC.currentCrisis === 'drought' && 
                        'Drip irrigation can reduce water usage by 30-50% while maintaining crop yields, making farms more drought-resistant.'
                      }
                      {currentNPC.currentCrisis === 'flood' && 
                        'Crop insurance under PM Fasal Bima Yojana covers up to ₹2 lakh per hectare for flood damage at subsidized premiums.'
                      }
                      {currentNPC.currentCrisis === 'pest' && 
                        'Integrated Pest Management (IPM) can reduce pesticide costs by 25% while improving crop health through natural predators.'
                      }
                      {currentNPC.currentCrisis === 'health' && 
                        'Ayushman Bharat provides free healthcare up to ₹5 lakh per family for rural farmers, covering most medical emergencies.'
                      }
                      {currentNPC.currentCrisis === 'equipment' && 
                        'Custom Hiring Centers provide tractor services at ₹800-1200 per acre, eliminating the need for expensive equipment purchases.'
                      }
                    </span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="npc-actions">
                <button
                  className="retro-button retro-button-green npc-action-button"
                  onClick={handleMeetFarmers}
                  disabled={npcLoading}
                >
                  {npcLoading ? '🤝 CONNECTING...' : '👥 MEET ANOTHER FARMER'}
                </button>
                
                <button
                  className="retro-button npc-action-button"
                  onClick={() => setShowNPCModal(false)}
                >
                  📚 CONTINUE FARMING
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Loan Modal */}
      {showLoanModal && (
        <div className="modal-overlay" onClick={() => setShowLoanModal(false)}>
          <div className="loan-modal retro-panel" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="retro-font retro-text-green">💳 AGRICULTURAL LOANS</h2>
              <button 
                className="modal-close retro-button"
                onClick={() => setShowLoanModal(false)}
              >
                ✕
              </button>
            </div>

            <div className="loan-content">
              <div className="credit-info retro-panel-inset">
                <h3 className="retro-font retro-text-amber">📊 YOUR CREDIT PROFILE</h3>
                <div className="credit-row">
                  <span className="retro-font">Credit Score:</span>
                  <span className={`retro-font ${creditScore >= 700 ? 'retro-text-green' : creditScore >= 600 ? 'retro-text-yellow' : 'retro-text-red'}`}>
                    {creditScore}/850
                  </span>
                </div>
                <div className="credit-row">
                  <span className="retro-font">Current Debt:</span>
                  <span className={`retro-font ${getTotalDebt() > 0 ? 'retro-text-red' : 'retro-text-green'}`}>
                    ₹{getTotalDebt().toLocaleString()}
                  </span>
                </div>
                <div className="credit-row">
                  <span className="retro-font">Active Loans:</span>
                  <span className="retro-font retro-text-cyan">
                    {loans.filter(loan => loan.status === 'active').length}
                  </span>
                </div>
              </div>

              <div className="loan-options">
                <h3 className="retro-font retro-text-amber">💰 AVAILABLE LOAN OPTIONS</h3>
                
                {Object.entries(loanTypes).map(([type, config]) => (
                  <div key={type} className="loan-option retro-panel-inset">
                    <div className="loan-header">
                      <h4 className="retro-font retro-text-green">{config.name}</h4>
                      <span className="retro-font loan-rate">{config.interestRate}% Annual</span>
                    </div>
                    <p className="retro-font loan-description">{config.description}</p>
                    <div className="loan-details">
                      <div className="loan-detail">
                        <span className="retro-font">Max Amount:</span>
                        <span className="retro-font retro-text-cyan">₹{config.maxAmount.toLocaleString()}</span>
                      </div>
                      <div className="loan-detail">
                        <span className="retro-font">Processing:</span>
                        <span className="retro-font retro-text-yellow">{config.processingTime}</span>
                      </div>
                    </div>
                    
                    <div className="loan-apply">
                      <input
                        type="number"
                        placeholder="Enter amount (₹10,000 - ₹3,00,000)"
                        className="retro-input loan-amount-input"
                        min="10000"
                        max={config.maxAmount}
                        step="1000"
                        id={`loan-amount-${type}`}
                      />
                      <button
                        className="retro-button retro-button-green loan-apply-button"
                        onClick={() => {
                          const input = document.getElementById(`loan-amount-${type}`) as HTMLInputElement;
                          const amount = parseInt(input.value);
                          if (amount) {
                            applyForLoan(type as keyof typeof loanTypes, amount);
                          }
                        }}
                        disabled={type === 'bank' && creditScore < 650}
                      >
                        {type === 'bank' && creditScore < 650 ? '❌ CREDIT TOO LOW' : '✅ APPLY NOW'}
                      </button>
                    </div>
                    
                    {type === 'bank' && creditScore < 650 && (
                      <p className="retro-font loan-warning retro-text-red">
                        ⚠️ Bank loans require credit score ≥650. Current: {creditScore}
                      </p>
                    )}
                  </div>
                ))}
              </div>

              {loans.length > 0 && (
                <div className="active-loans">
                  <h3 className="retro-font retro-text-amber">📋 YOUR ACTIVE LOANS</h3>
                  {loans.filter(loan => loan.status === 'active').map(loan => (
                    <div key={loan.id} className="active-loan retro-panel-inset">
                      <div className="loan-summary">
                        <span className="retro-font loan-type">{loanTypes[loan.type].name}</span>
                        <span className="retro-font loan-amount">₹{loan.remainingAmount.toLocaleString()}</span>
                      </div>
                      <div className="loan-emi">
                        <span className="retro-font">Monthly EMI: ₹{loan.monthlyEMI.toLocaleString()}</span>
                        <span className="retro-font">Next Due: Day {loan.nextEMIDay}</span>
                      </div>
                      {loan.missedPayments > 0 && (
                        <div className="loan-warning retro-text-red retro-font">
                          ⚠️ Missed Payments: {loan.missedPayments}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              <div className="loan-education retro-panel-inset">
                <h4 className="retro-font retro-text-amber">💡 LOAN EDUCATION</h4>
                <p className="retro-font education-text">
                  • <strong>Bank KCC:</strong> Lowest interest but requires good credit score and collateral<br/>
                  • <strong>Moneylender:</strong> Quick approval but very high interest - use only for emergencies<br/>
                  • <strong>Government:</strong> Subsidized rates but may require documentation<br/>
                  • <strong>EMI:</strong> Paid automatically every 30 days. Missing payments hurts credit score<br/>
                  • <strong>Credit Score:</strong> Improves with on-time payments, drops with missed payments
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Financial Dashboard Modal */}
      {showFinancialModal && (
        <div className="modal-overlay" onClick={() => setShowFinancialModal(false)}>
          <div className="financial-modal retro-panel" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="retro-font retro-text-green">📊 FINANCIAL DASHBOARD</h2>
              <button 
                className="modal-close retro-button"
                onClick={() => setShowFinancialModal(false)}
              >
                ✕
              </button>
            </div>

            <div className="financial-content">
              {/* Current Status */}
              <div className="financial-overview retro-panel-inset">
                <h3 className="retro-font retro-text-amber">💰 CURRENT STATUS</h3>
                <div className="status-grid">
                  <div className="status-item">
                    <span className="retro-font status-label">Cash:</span>
                    <span className="retro-font retro-text-green">₹{money.toLocaleString()}</span>
                  </div>
                  <div className="status-item">
                    <span className="retro-font status-label">Debt:</span>
                    <span className={`retro-font ${getTotalDebt() > 0 ? 'retro-text-red' : 'retro-text-green'}`}>
                      ₹{getTotalDebt().toLocaleString()}
                    </span>
                  </div>
                  <div className="status-item">
                    <span className="retro-font status-label">Net Worth:</span>
                    <span className={`retro-font ${(money - getTotalDebt()) >= 0 ? 'retro-text-green' : 'retro-text-red'}`}>
                      ₹{(money - getTotalDebt()).toLocaleString()}
                    </span>
                  </div>
                  <div className="status-item">
                    <span className="retro-font status-label">Credit Score:</span>
                    <span className={`retro-font ${creditScore >= 700 ? 'retro-text-green' : creditScore >= 600 ? 'retro-text-yellow' : 'retro-text-red'}`}>
                      {creditScore}/850
                    </span>
                  </div>
                </div>
              </div>

              {/* 30-Day Summary */}
              {(() => {
                const summary = getFinancialSummary();
                return (
                  <div className="financial-summary retro-panel-inset">
                    <h3 className="retro-font retro-text-amber">📈 LAST 30 DAYS</h3>
                    <div className="summary-grid">
                      <div className="summary-item income">
                        <span className="retro-font summary-label">Income:</span>
                        <span className="retro-font retro-text-green">₹{summary.income.toLocaleString()}</span>
                      </div>
                      <div className="summary-item expense">
                        <span className="retro-font summary-label">Expenses:</span>
                        <span className="retro-font retro-text-red">₹{summary.expenses.toLocaleString()}</span>
                      </div>
                      <div className="summary-item profit">
                        <span className="retro-font summary-label">Profit:</span>
                        <span className={`retro-font ${summary.profit >= 0 ? 'retro-text-green' : 'retro-text-red'}`}>
                          ₹{summary.profit.toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* Visual Chart */}
              {(() => {
                const summary = getFinancialSummary();
                const maxAmount = Math.max(summary.income, summary.expenses, 1000);
                const incomeHeight = Math.max((summary.income / maxAmount) * 150, 5);
                const expenseHeight = Math.max((summary.expenses / maxAmount) * 150, 5);
                
                return (
                  <div className="visual-chart">
                    <h3 className="retro-font retro-text-amber">📊 INCOME vs EXPENSES (30 Days)</h3>
                    <div className="chart-canvas">
                      <div className="chart-bars">
                        <div className="chart-bar">
                          <div 
                            className="bar-visual income" 
                            style={{ height: `${incomeHeight}px` }}
                          ></div>
                          <div className="retro-font bar-label">INCOME</div>
                          <div className="retro-font bar-value">₹{summary.income.toLocaleString()}</div>
                        </div>
                        <div className="chart-bar">
                          <div 
                            className="bar-visual expense" 
                            style={{ height: `${expenseHeight}px` }}
                          ></div>
                          <div className="retro-font bar-label">EXPENSES</div>
                          <div className="retro-font bar-value">₹{summary.expenses.toLocaleString()}</div>
                        </div>
                      </div>
                    </div>
                    <div className="chart-legend">
                      <div className="legend-item">
                        <div className="legend-color income"></div>
                        <span className="retro-font legend-text">Income</span>
                      </div>
                      <div className="legend-item">
                        <div className="legend-color expense"></div>
                        <span className="retro-font legend-text">Expenses</span>
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* Recent Transactions */}
              {(() => {
                const recentTransactions = transactions.slice(-10).reverse();
                return (
                  <div className="recent-transactions retro-panel-inset">
                    <h3 className="retro-font retro-text-amber">📋 RECENT TRANSACTIONS</h3>
                    <div className="transactions-list">
                      {recentTransactions.length === 0 ? (
                        <p className="retro-font no-transactions">No transactions yet</p>
                      ) : (
                        recentTransactions.map(txn => (
                          <div key={txn.id} className="transaction-item">
                            <div className="transaction-main">
                              <span className="retro-font transaction-day">Day {txn.day}</span>
                              <span className="retro-font transaction-desc">{txn.description}</span>
                              <span className={`retro-font transaction-amount ${txn.type === 'income' ? 'retro-text-green' : 'retro-text-red'}`}>
                                {txn.type === 'income' ? '+' : '-'}₹{txn.amount.toLocaleString()}
                              </span>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                );
              })()}

              {/* Financial Tips */}
              <div className="financial-tips retro-panel-inset">
                <h4 className="retro-font retro-text-amber">💡 FINANCIAL TIPS</h4>
                <div className="tips-content">
                  <p className="retro-font tip-text">
                    • <strong>Maintain Emergency Fund:</strong> Keep 3-6 months of expenses as cash<br/>
                    • <strong>Credit Score:</strong> Pay EMIs on time to improve creditworthiness<br/>
                    • <strong>Diversify Income:</strong> Plant different crops to reduce risk<br/>
                    • <strong>Government Schemes:</strong> Use PM-KISAN and insurance schemes<br/>
                    • <strong>Market Timing:</strong> Sell crops when prices are above MSP
                  </p>
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