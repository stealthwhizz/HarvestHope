/**
 * Redux slice for market data management
 */

import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import { marketService } from '../../services/marketService';
import type { 
  MarketPrice, 
  SellingOption, 
  SellingAdvice, 
  MarketIntelligence,
  StorageOption,
  MarketTrendAnalysis,
  SellingRecommendation
} from '../../services/marketService';

export interface MarketState {
  currentPrices: Record<string, MarketPrice>;
  sellingOptions: SellingOption[];
  sellingAdvice: SellingAdvice | null;
  marketIntelligence: MarketIntelligence | null;
  storageOptions: StorageOption[];
  trendAnalysis: MarketTrendAnalysis | null;
  advancedRecommendation: SellingRecommendation | null;
  governmentProcurement: any | null;
  loading: {
    prices: boolean;
    sellingOptions: boolean;
    advice: boolean;
    intelligence: boolean;
    storage: boolean;
    trends: boolean;
    recommendation: boolean;
    government: boolean;
  };
  error: {
    prices: string | null;
    sellingOptions: string | null;
    advice: string | null;
    intelligence: string | null;
    storage: string | null;
    trends: string | null;
    recommendation: string | null;
    government: string | null;
  };
  lastUpdated: {
    prices: string | null;
    sellingOptions: string | null;
    advice: string | null;
    intelligence: string | null;
    storage: string | null;
    trends: string | null;
    recommendation: string | null;
    government: string | null;
  };
}

const initialState: MarketState = {
  currentPrices: {},
  sellingOptions: [],
  sellingAdvice: null,
  marketIntelligence: null,
  storageOptions: [],
  trendAnalysis: null,
  advancedRecommendation: null,
  governmentProcurement: null,
  loading: {
    prices: false,
    sellingOptions: false,
    advice: false,
    intelligence: false,
    storage: false,
    trends: false,
    recommendation: false,
    government: false,
  },
  error: {
    prices: null,
    sellingOptions: null,
    advice: null,
    intelligence: null,
    storage: null,
    trends: null,
    recommendation: null,
    government: null,
  },
  lastUpdated: {
    prices: null,
    sellingOptions: null,
    advice: null,
    intelligence: null,
    storage: null,
    trends: null,
    recommendation: null,
    government: null,
  },
};

// Async thunks for market operations
export const fetchMarketPrice = createAsyncThunk(
  'market/fetchPrice',
  async (params: {
    cropType: string;
    season: string;
    weatherConditions?: any;
    supplyFactors?: any;
    demandFactors?: any;
  }) => {
    const price = await marketService.simulateMarketPrice(
      params.cropType,
      params.season,
      params.weatherConditions,
      params.supplyFactors,
      params.demandFactors
    );
    return { cropType: params.cropType, price };
  }
);

export const fetchSellingOptions = createAsyncThunk(
  'market/fetchSellingOptions',
  async (params: {
    cropType: string;
    quantity: number;
    qualityGrade?: string;
    location?: string;
    currentPrice: number;
  }) => {
    return await marketService.getSellingOptions(
      params.cropType,
      params.quantity,
      params.qualityGrade,
      params.location,
      params.currentPrice
    );
  }
);

export const fetchSellingAdvice = createAsyncThunk(
  'market/fetchSellingAdvice',
  async (params: {
    cropType: string;
    currentPrice: number;
    quantity: number;
    storageCapacity?: boolean;
    financialUrgency?: 'low' | 'medium' | 'high';
  }) => {
    return await marketService.getSellingAdvice(
      params.cropType,
      params.currentPrice,
      params.quantity,
      params.storageCapacity,
      params.financialUrgency
    );
  }
);

export const fetchMarketIntelligence = createAsyncThunk(
  'market/fetchIntelligence',
  async (params: {
    cropType: string;
    region?: string;
  }) => {
    return await marketService.getMarketIntelligence(
      params.cropType,
      params.region
    );
  }
);

export const fetchStorageOptions = createAsyncThunk(
  'market/fetchStorageOptions',
  async (params: {
    cropType: string;
    quantity: number;
    location?: string;
  }) => {
    return await marketService.getStorageOptions(
      params.cropType,
      params.quantity,
      params.location
    );
  }
);

export const fetchTrendAnalysis = createAsyncThunk(
  'market/fetchTrendAnalysis',
  async (params: {
    cropType: string;
    timeframe?: '7d' | '30d' | '90d';
  }) => {
    return await marketService.getMarketTrendAnalysis(
      params.cropType,
      params.timeframe
    );
  }
);

export const fetchAdvancedRecommendation = createAsyncThunk(
  'market/fetchAdvancedRecommendation',
  async (params: {
    cropType: string;
    quantity: number;
    currentPrice: number;
    storageCapacity?: boolean;
    financialUrgency?: 'low' | 'medium' | 'high';
    qualityGrade?: string;
  }) => {
    return await marketService.getAdvancedSellingRecommendation(
      params.cropType,
      params.quantity,
      params.currentPrice,
      params.storageCapacity,
      params.financialUrgency,
      params.qualityGrade
    );
  }
);

export const fetchGovernmentProcurement = createAsyncThunk(
  'market/fetchGovernmentProcurement',
  async (params: {
    cropType: string;
    quantity: number;
    currentPrice: number;
  }) => {
    return await marketService.checkGovernmentProcurement(
      params.cropType,
      params.quantity,
      params.currentPrice
    );
  }
);

const marketSlice = createSlice({
  name: 'market',
  initialState,
  reducers: {
    clearMarketData: (state) => {
      state.currentPrices = {};
      state.sellingOptions = [];
      state.sellingAdvice = null;
      state.marketIntelligence = null;
      state.storageOptions = [];
      state.trendAnalysis = null;
      state.advancedRecommendation = null;
      state.governmentProcurement = null;
      state.error = {
        prices: null,
        sellingOptions: null,
        advice: null,
        intelligence: null,
        storage: null,
        trends: null,
        recommendation: null,
        government: null,
      };
    },
    clearErrors: (state) => {
      state.error = {
        prices: null,
        sellingOptions: null,
        advice: null,
        intelligence: null,
        storage: null,
        trends: null,
        recommendation: null,
        government: null,
      };
    },
    updateMarketPrice: (state, action: PayloadAction<{ cropType: string; price: MarketPrice }>) => {
      state.currentPrices[action.payload.cropType] = action.payload.price;
      state.lastUpdated.prices = new Date().toISOString();
    },
    setSellingOptions: (state, action: PayloadAction<SellingOption[]>) => {
      state.sellingOptions = action.payload;
      state.lastUpdated.sellingOptions = new Date().toISOString();
    },
    setSellingAdvice: (state, action: PayloadAction<SellingAdvice>) => {
      state.sellingAdvice = action.payload;
      state.lastUpdated.advice = new Date().toISOString();
    },
    setMarketIntelligence: (state, action: PayloadAction<MarketIntelligence>) => {
      state.marketIntelligence = action.payload;
      state.lastUpdated.intelligence = new Date().toISOString();
    },
    setStorageOptions: (state, action: PayloadAction<StorageOption[]>) => {
      state.storageOptions = action.payload;
      state.lastUpdated.storage = new Date().toISOString();
    },
    setTrendAnalysis: (state, action: PayloadAction<MarketTrendAnalysis>) => {
      state.trendAnalysis = action.payload;
      state.lastUpdated.trends = new Date().toISOString();
    },
    setAdvancedRecommendation: (state, action: PayloadAction<SellingRecommendation>) => {
      state.advancedRecommendation = action.payload;
      state.lastUpdated.recommendation = new Date().toISOString();
    },
    setGovernmentProcurement: (state, action: PayloadAction<any>) => {
      state.governmentProcurement = action.payload;
      state.lastUpdated.government = new Date().toISOString();
    },
  },
  extraReducers: (builder) => {
    // Fetch market price
    builder
      .addCase(fetchMarketPrice.pending, (state) => {
        state.loading.prices = true;
        state.error.prices = null;
      })
      .addCase(fetchMarketPrice.fulfilled, (state, action) => {
        state.loading.prices = false;
        state.currentPrices[action.payload.cropType] = action.payload.price;
        state.lastUpdated.prices = new Date().toISOString();
      })
      .addCase(fetchMarketPrice.rejected, (state, action) => {
        state.loading.prices = false;
        state.error.prices = action.error.message || 'Failed to fetch market price';
      });

    // Fetch selling options
    builder
      .addCase(fetchSellingOptions.pending, (state) => {
        state.loading.sellingOptions = true;
        state.error.sellingOptions = null;
      })
      .addCase(fetchSellingOptions.fulfilled, (state, action) => {
        state.loading.sellingOptions = false;
        state.sellingOptions = action.payload;
        state.lastUpdated.sellingOptions = new Date().toISOString();
      })
      .addCase(fetchSellingOptions.rejected, (state, action) => {
        state.loading.sellingOptions = false;
        state.error.sellingOptions = action.error.message || 'Failed to fetch selling options';
      });

    // Fetch selling advice
    builder
      .addCase(fetchSellingAdvice.pending, (state) => {
        state.loading.advice = true;
        state.error.advice = null;
      })
      .addCase(fetchSellingAdvice.fulfilled, (state, action) => {
        state.loading.advice = false;
        state.sellingAdvice = action.payload;
        state.lastUpdated.advice = new Date().toISOString();
      })
      .addCase(fetchSellingAdvice.rejected, (state, action) => {
        state.loading.advice = false;
        state.error.advice = action.error.message || 'Failed to fetch selling advice';
      });

    // Fetch market intelligence
    builder
      .addCase(fetchMarketIntelligence.pending, (state) => {
        state.loading.intelligence = true;
        state.error.intelligence = null;
      })
      .addCase(fetchMarketIntelligence.fulfilled, (state, action) => {
        state.loading.intelligence = false;
        state.marketIntelligence = action.payload;
        state.lastUpdated.intelligence = new Date().toISOString();
      })
      .addCase(fetchMarketIntelligence.rejected, (state, action) => {
        state.loading.intelligence = false;
        state.error.intelligence = action.error.message || 'Failed to fetch market intelligence';
      });

    // Fetch storage options
    builder
      .addCase(fetchStorageOptions.pending, (state) => {
        state.loading.storage = true;
        state.error.storage = null;
      })
      .addCase(fetchStorageOptions.fulfilled, (state, action) => {
        state.loading.storage = false;
        state.storageOptions = action.payload;
        state.lastUpdated.storage = new Date().toISOString();
      })
      .addCase(fetchStorageOptions.rejected, (state, action) => {
        state.loading.storage = false;
        state.error.storage = action.error.message || 'Failed to fetch storage options';
      });

    // Fetch trend analysis
    builder
      .addCase(fetchTrendAnalysis.pending, (state) => {
        state.loading.trends = true;
        state.error.trends = null;
      })
      .addCase(fetchTrendAnalysis.fulfilled, (state, action) => {
        state.loading.trends = false;
        state.trendAnalysis = action.payload;
        state.lastUpdated.trends = new Date().toISOString();
      })
      .addCase(fetchTrendAnalysis.rejected, (state, action) => {
        state.loading.trends = false;
        state.error.trends = action.error.message || 'Failed to fetch trend analysis';
      });

    // Fetch advanced recommendation
    builder
      .addCase(fetchAdvancedRecommendation.pending, (state) => {
        state.loading.recommendation = true;
        state.error.recommendation = null;
      })
      .addCase(fetchAdvancedRecommendation.fulfilled, (state, action) => {
        state.loading.recommendation = false;
        state.advancedRecommendation = action.payload;
        state.lastUpdated.recommendation = new Date().toISOString();
      })
      .addCase(fetchAdvancedRecommendation.rejected, (state, action) => {
        state.loading.recommendation = false;
        state.error.recommendation = action.error.message || 'Failed to fetch advanced recommendation';
      });

    // Fetch government procurement
    builder
      .addCase(fetchGovernmentProcurement.pending, (state) => {
        state.loading.government = true;
        state.error.government = null;
      })
      .addCase(fetchGovernmentProcurement.fulfilled, (state, action) => {
        state.loading.government = false;
        state.governmentProcurement = action.payload;
        state.lastUpdated.government = new Date().toISOString();
      })
      .addCase(fetchGovernmentProcurement.rejected, (state, action) => {
        state.loading.government = false;
        state.error.government = action.error.message || 'Failed to fetch government procurement info';
      });
  },
});

export const {
  clearMarketData,
  clearErrors,
  updateMarketPrice,
  setSellingOptions,
  setSellingAdvice,
  setMarketIntelligence,
  setStorageOptions,
  setTrendAnalysis,
  setAdvancedRecommendation,
  setGovernmentProcurement,
} = marketSlice.actions;

export const marketReducer = marketSlice.reducer;