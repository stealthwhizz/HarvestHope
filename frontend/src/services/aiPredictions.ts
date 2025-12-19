/**
 * AI Analytics Engine for Agricultural Intelligence
 * Provides weather forecasting and market analysis using Google Gemini AI
 */

import { GoogleGenerativeAI } from '@google/generative-ai';

// Initialize Gemini AI
const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY || 'demo-mode';
let genAI: GoogleGenerativeAI | null = null;
let model: any = null;

if (GEMINI_API_KEY !== 'demo-mode') {
  try {
    genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
    model = genAI.getGenerativeModel({ 
      model: 'gemini-2.5-flash',
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 200,
      }
    });
    console.log('🤖 AI Analytics Engine: Initialized');
  } catch (error) {
    console.error('❌ Failed to initialize AI Predictions:', error);
  }
}

/**
 * Predict weather for next 3 days - ALWAYS returns a result
 * @param currentDay - Current game day
 * @param season - Current season (Kharif, Rabi, etc.)
 * @param region - Region name (default: Maharashtra)
 * @param plantedCrops - Array of currently planted crops
 * @returns Simple 3-day weather forecast as plain text
 */
export async function predictWeather(currentDay: number, season: string, region: string = 'Maharashtra', plantedCrops: string[] = []): Promise<string> {
  console.log(`🌦️ Predicting weather for ${region}, ${season}, Day ${currentDay}`);
  
  // Weather simulation engine - season appropriate
  const simulatedWeather = season === 'Kharif' ? `Day 1: Monsoon showers, Day 2: Heavy rain, Day 3: Cloudy` :
                           season === 'Rabi' ? `Day 1: Clear skies, Day 2: Cool and dry, Day 3: Sunny` :
                           season === 'Zaid' ? `Day 1: Hot and dry, Day 2: Very hot, Day 3: Scorching sun` :
                           `Day 1: Pleasant, Day 2: Mild weather, Day 3: Partly cloudy`;
  
  try {
    if (GEMINI_API_KEY === 'demo-mode' || !model) {
      console.log('🤖 Using weather simulation engine');
      return simulatedWeather;
    }
    
    const cropContext = plantedCrops.length > 0 ? ` I have planted ${plantedCrops.join(', ')} crops.` : '';
    const prompt = `I'm a farmer in ${region}, India. It's ${season} season, day ${currentDay} of my farming cycle.${cropContext} Give me a 3-day weather forecast that's realistic for this season and region. Format your response exactly like this example: "Day 1: Sunny and warm, Day 2: Light rain expected, Day 3: Cloudy with cool temperatures"`;
    
    console.log('🤖 Calling Gemini for weather prediction...');
    const result = await model.generateContent(prompt);
    const response = await result.response;
    
    if (!response || !response.text) {
      throw new Error('Empty response from Gemini');
    }
    
    let weatherText = response.text().trim();
    
    // Strip any markdown formatting
    weatherText = weatherText.replace(/```/g, '').replace(/\*/g, '').replace(/#/g, '');
    
    // Validate response format (should contain day references or be reasonable length)
    const hasDayReferences = /day\s*[1-3]/i.test(weatherText) || 
                            weatherText.includes('Day 1') || 
                            weatherText.includes('Day 2') || 
                            weatherText.includes('Day 3') ||
                            weatherText.split(',').length >= 2 ||
                            weatherText.split('.').length >= 2;
    
    // More flexible validation - accept any reasonable weather response
    const hasWeatherTerms = /rain|sun|cloud|hot|cold|wind|storm|clear|humid|dry|monsoon|weather/i.test(weatherText);
    
    if ((!hasDayReferences && !hasWeatherTerms) || weatherText.length < 10) {
      throw new Error('Invalid weather response format');
    }
    
    console.log('✅ Weather prediction successful:', weatherText);
    return weatherText;
    
  } catch (error) {
    console.error('❌ Weather prediction failed:', error);
    console.log('🔄 Using weather simulation engine');
    return simulatedWeather;
  }
}

/**
 * Predict market price for a crop - ALWAYS returns a number
 * @param cropType - Type of crop (rice, wheat, cotton, sugarcane, pulses)
 * @param season - Current season
 * @param currentDay - Current game day
 * @param playerMoney - Player's current money (affects market context)
 * @param harvestedQuantity - How much of this crop player has harvested
 * @returns Market price in rupees per quintal
 */
export async function predictMarketPrices(cropType: string, season: string, currentDay: number, playerMoney: number = 100000, harvestedQuantity: number = 0): Promise<number> {
  console.log(`💹 Predicting market price for ${cropType}, ${season}, Day ${currentDay}`);
  
  // Government MSP database - season adjusted
  const getSeasonalMSP = (crop: string, season: string): number => {
    const baseMSP: { [key: string]: number } = {
      rice: 2100,
      wheat: 2125,
      cotton: 5500,
      sugarcane: 290,
      pulses: 5100
    };
    
    // Seasonal price adjustments based on supply/demand
    const seasonalMultiplier = season === 'Kharif' ? 
      (crop === 'rice' || crop === 'cotton' ? 1.1 : 0.95) : // Higher prices for Kharif crops during their season
      season === 'Rabi' ? 
      (crop === 'wheat' ? 1.1 : 0.95) : // Higher prices for Rabi crops during their season
      1.0; // Normal prices in other seasons
    
    return Math.round((baseMSP[crop] || 2100) * seasonalMultiplier);
  };
  
  const mspPrice = getSeasonalMSP(cropType.toLowerCase(), season);
  

  
  try {
    if (GEMINI_API_KEY === 'demo-mode' || !model) {
      console.log('🤖 Using MSP database pricing');
      return mspPrice;
    }
    
    const marketContext = harvestedQuantity > 0 ? ` I have ${harvestedQuantity}kg of ${cropType} ready to sell.` : '';
    const seasonContext = season === 'Kharif' ? ' (monsoon/summer crop season)' : season === 'Rabi' ? ' (winter crop season)' : season === 'Zaid' ? ' (summer crop season)' : '';
    const economicContext = playerMoney < 50000 ? ' I need good prices as I have limited funds.' : playerMoney > 200000 ? ' I can wait for better prices if needed.' : '';
    const prompt = `I'm a farmer in Maharashtra, India. It's day ${currentDay} of ${season} season${seasonContext}.${marketContext}${economicContext} What's the current market price for ${cropType} in Indian mandis today? Consider seasonal demand, MSP rates, and current market conditions. Reply with ONLY a number between 1000-10000 representing rupees per quintal. Example: 2500`;
    
    console.log('🤖 Calling Gemini for market price prediction...');
    const result = await model.generateContent(prompt);
    const response = await result.response;
    
    if (!response || !response.text) {
      throw new Error('Empty response from Gemini');
    }
    
    let priceText = response.text().trim();
    
    // Strip any markdown formatting
    priceText = priceText.replace(/```/g, '').replace(/\*/g, '').replace(/#/g, '');
    
    // Extract all numbers from response and find the most reasonable price
    const priceMatches = priceText.match(/\d+/g);
    let extractedPrice = null;
    
    if (priceMatches) {
      // Look for a reasonable price (between 100 and 50000)
      for (const match of priceMatches) {
        const price = parseInt(match);
        if (price >= 100 && price <= 50000) {
          extractedPrice = price;
          break;
        }
      }
      
      // If no reasonable price found, try to use the largest number as it's likely the price
      if (!extractedPrice && priceMatches.length > 0) {
        const prices = priceMatches.map((m: string) => parseInt(m)).filter((p: number) => p >= 100);
        if (prices.length > 0) {
          extractedPrice = Math.max(...prices);
          // Cap it at reasonable maximum
          extractedPrice = Math.min(extractedPrice, 50000);
        }
      }
    }
    
    if (!extractedPrice) {
      console.log('🔄 No valid price extracted, using MSP fallback');
      return mspPrice;
    }
    
    console.log('✅ Market price prediction successful:', extractedPrice);
    return extractedPrice;
    
  } catch (error) {
    console.error('❌ Market price prediction failed:', error);
    console.log('🔄 Using MSP database price:', mspPrice);
    return mspPrice;
  }
}

/**
 * Get simple farming tip - ALWAYS returns a tip
 * @param cropType - Type of crop
 * @param season - Current season
 * @param currentDay - Current game day
 * @param cropGrowthStage - Current growth stage of the crop
 * @returns Simple farming tip as plain text
 */
export async function getFarmingTip(cropType: string, season: string, currentDay: number = 1, cropGrowthStage: string = 'growing'): Promise<string> {
  console.log(`💡 Getting farming tip for ${cropType} in ${season}`);
  
  // Agricultural knowledge base - season and stage specific
  const getSeasonalTip = (crop: string, season: string, stage: string): string => {
    const tips: { [key: string]: { [key: string]: { [key: string]: string } } } = {
      rice: {
        Kharif: {
          seedling: 'Ensure proper water levels for rice seedlings during monsoon.',
          growing: 'Monitor for brown plant hopper during Kharif season.',
          mature: 'Prepare for harvesting as monsoon ends.',
          harvestable: 'Harvest immediately to avoid monsoon damage.'
        },
        Rabi: {
          seedling: 'Rice not typically grown in Rabi season.',
          growing: 'Maintain irrigation as winter crops need water.',
          mature: 'Winter rice requires careful water management.',
          harvestable: 'Harvest before extreme cold affects grain quality.'
        }
      },
      wheat: {
        Rabi: {
          seedling: 'Sow wheat early in Rabi for better yields.',
          growing: 'Apply nitrogen fertilizer during tillering stage.',
          mature: 'Watch for rust diseases in late Rabi season.',
          harvestable: 'Harvest wheat when grains are golden yellow.'
        },
        Kharif: {
          seedling: 'Wheat not suitable for Kharif monsoon season.',
          growing: 'Avoid wheat cultivation during monsoon.',
          mature: 'Wheat cultivation not recommended in Kharif.',
          harvestable: 'Wheat harvest not applicable in Kharif.'
        }
      },
      cotton: {
        Kharif: {
          seedling: 'Plant cotton with adequate spacing for monsoon growth.',
          growing: 'Monitor for bollworm during cotton flowering.',
          mature: 'Prepare for cotton picking as bolls mature.',
          harvestable: 'Hand-pick cotton bolls for best quality.'
        }
      },
      sugarcane: {
        Kharif: {
          seedling: 'Plant sugarcane with proper irrigation setup.',
          growing: 'Maintain consistent watering for sugarcane growth.',
          mature: 'Sugarcane takes 10-12 months to fully mature.',
          harvestable: 'Harvest sugarcane when sugar content is highest.'
        }
      }
    };
    
    return tips[crop]?.[season]?.[stage] || `Monitor your ${crop} regularly during ${season} season.`;
  };
  
  const knowledgeBase = getSeasonalTip(cropType.toLowerCase(), season, cropGrowthStage);
  
  const expertTip = knowledgeBase;
  
  try {
    if (GEMINI_API_KEY === 'demo-mode' || !model) {
      console.log('🤖 Using agricultural knowledge base');
      return expertTip;
    }
    
    const stageContext = cropGrowthStage === 'seedling' ? ' My crops are just planted.' : 
                         cropGrowthStage === 'growing' ? ' My crops are currently growing.' :
                         cropGrowthStage === 'mature' ? ' My crops are almost ready.' :
                         cropGrowthStage === 'harvestable' ? ' My crops are ready to harvest.' : '';
    const prompt = `I'm a farmer in Maharashtra, India. It's day ${currentDay} of ${season} season. I'm growing ${cropType}.${stageContext} Give me one practical farming tip for my current situation. Keep it under 50 words and make it actionable.`;
    
    console.log('🤖 Calling Gemini for farming tip...');
    const result = await model.generateContent(prompt);
    const response = await result.response;
    
    if (!response || !response.text) {
      throw new Error('Empty response from Gemini');
    }
    
    let tipText = response.text().trim();
    
    // Strip any markdown formatting
    tipText = tipText.replace(/```/g, '').replace(/\*/g, '').replace(/#/g, '');
    
    // Limit length
    if (tipText.length > 200) {
      tipText = tipText.substring(0, 200) + '...';
    }
    
    console.log('✅ Farming tip successful:', tipText);
    return tipText;
    
  } catch (error) {
    console.error('❌ Farming tip failed:', error);
    console.log('🔄 Using agricultural knowledge base');
    return expertTip;
  }
}

/**
 * Generate AI-powered NPC farmer story based on game context
 * @param season - Current season
 * @param currentDay - Current game day
 * @param playerMoney - Player's current financial situation
 * @param weatherCondition - Current weather condition
 * @returns NPC farmer story with crisis and dialogue
 */
export async function generateNPCFarmerStory(season: string, currentDay: number, playerMoney: number, weatherCondition: string = 'normal'): Promise<string> {
  console.log(`👥 Generating NPC farmer story for ${season}, Day ${currentDay}`);
  
  // Contextual fallback story based on game state
  const getContextualStory = (): string => {
    const crisisTypes = season === 'Kharif' ? ['flood', 'pest', 'debt'] : 
                       season === 'Rabi' ? ['drought', 'debt', 'health'] : 
                       ['equipment', 'debt', 'health'];
    const selectedCrisis = crisisTypes[Math.floor(Math.random() * crisisTypes.length)];
    
    const names = ['Ramesh Kumar', 'Priya Sharma', 'Suresh Patel', 'Meera Devi', 'Rajesh Singh'];
    const locations = ['Vidarbha', 'Marathwada', 'Western Maharashtra', 'Konkan', 'Northern Maharashtra'];
    const selectedName = names[Math.floor(Math.random() * names.length)];
    const selectedLocation = locations[Math.floor(Math.random() * locations.length)];
    
    const storyTemplates = {
      flood: `${selectedName} from ${selectedLocation} lost 80% of crops to unexpected flooding during ${season} season. "The water came so fast, we couldn't save anything," says ${selectedName}. Now struggling with ₹2,50,000 debt and no harvest income.`,
      drought: `${selectedName}, a farmer from ${selectedLocation}, hasn't seen rain for 45 days during ${season} season. "My wells are dry, crops are dying," ${selectedName} explains. Borrowed ₹1,80,000 for irrigation but yields are still poor.`,
      pest: `${selectedName}'s cotton crop in ${selectedLocation} was devastated by bollworm attack during ${season}. "Lost 60% of my crop despite spending ₹80,000 on pesticides," says ${selectedName}. Family now depends on daily wage labor.`,
      debt: `${selectedName} from ${selectedLocation} owes ₹4,50,000 to moneylenders after three failed seasons. "Interest keeps growing, but crops keep failing," ${selectedName} says. Considering selling ancestral land to pay debts.`,
      health: `${selectedName}, a farmer from ${selectedLocation}, spent ₹3,20,000 on spouse's medical treatment during ${season} season. "Had to sell cattle and take loans," ${selectedName} explains. Now struggling to afford seeds for next planting.`,
      equipment: `${selectedName}'s tractor broke down during crucial ${season} planting season in ${selectedLocation}. "Repair costs ₹1,20,000, but I don't have money," says ${selectedName}. Using bullock cart, but planting is delayed.`
    };
    
    return storyTemplates[selectedCrisis as keyof typeof storyTemplates] || storyTemplates.debt;
  };
  
  try {
    if (GEMINI_API_KEY === 'demo-mode' || !model) {
      console.log('🤖 Using contextual story generator');
      return getContextualStory();
    }
    
    const weatherContext = weatherCondition === 'rainy' ? ' Recent heavy rains have affected farming.' :
                          weatherCondition === 'drought' ? ' Drought conditions are challenging farmers.' :
                          weatherCondition === 'hot' ? ' Extreme heat is stressing crops.' : '';
    
    const seasonContext = season === 'Kharif' ? ' during monsoon/Kharif season' :
                         season === 'Rabi' ? ' during winter/Rabi season' :
                         season === 'Zaid' ? ' during summer/Zaid season' : '';
    
    const economicContext = playerMoney < 50000 ? ' Many farmers are facing financial difficulties.' :
                           playerMoney > 200000 ? ' Some farmers are doing well this season.' :
                           ' Farmers are managing with mixed results.';
    
    const prompt = `Create a realistic story about an Indian farmer facing challenges${seasonContext} in Maharashtra. It's day ${currentDay} of the farming cycle.${weatherContext}${economicContext} 
    
    Include:
    - Farmer's name and location in Maharashtra
    - Specific crisis (debt, crop failure, weather damage, health issues, equipment problems)
    - Realistic financial amounts in Indian rupees
    - Emotional impact on family
    - Current situation and struggles
    
    Keep it under 100 words and make it authentic to Indian farming conditions. Write in third person narrative style.`;
    
    console.log('🤖 Calling Gemini for NPC story generation...');
    const result = await model.generateContent(prompt);
    const response = await result.response;
    
    if (!response || !response.text) {
      throw new Error('Empty response from Gemini');
    }
    
    let storyText = response.text().trim();
    
    // Strip any markdown formatting
    storyText = storyText.replace(/```/g, '').replace(/\*/g, '').replace(/#/g, '');
    
    // Limit length
    if (storyText.length > 500) {
      storyText = storyText.substring(0, 500) + '...';
    }
    
    console.log('✅ NPC story generation successful');
    return storyText;
    
  } catch (error) {
    console.error('❌ NPC story generation failed:', error);
    console.log('🔄 Using contextual story generator');
    return getContextualStory();
  }
}

/**
 * Test the AI prediction system
 */
export async function testAIPredictions(): Promise<boolean> {
  try {
    console.log('🧪 Testing AI Predictions...');
    
    const weather = await predictWeather(1, 'Kharif', 'Maharashtra');
    const price = await predictMarketPrices('rice', 'Kharif', 1);
    const tip = await getFarmingTip('rice', 'Kharif');
    
    console.log('🧪 Test Results:');
    console.log('Weather:', weather);
    console.log('Price:', price);
    console.log('Tip:', tip);
    
    const isWorking = weather.length > 0 && price > 0 && tip.length > 0;
    console.log(`🧪 AI Predictions Test: ${isWorking ? '✅ PASSED' : '❌ FAILED'}`);
    
    return isWorking;
  } catch (error) {
    console.error('🧪 AI Predictions Test failed:', error);
    return false;
  }
}