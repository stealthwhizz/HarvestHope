# 🏗️ Harvest Hope - System Architecture

## 📋 Overview

Harvest Hope is a full-stack farming simulation game built with modern web technologies, featuring AI-powered predictions and realistic agricultural mechanics.

## 🎯 System Components

### **Frontend (React + TypeScript)**
```
frontend/
├── src/
│   ├── components/          # React components
│   │   ├── SimpleGameUI.tsx # Main game interface (2,253 lines)
│   │   ├── GameUI.tsx       # Alternative game interface
│   │   ├── FarmGrid.tsx     # Farm visualization
│   │   └── HUD.tsx          # Heads-up display
│   ├── services/            # Business logic & API calls
│   │   ├── aiPredictions.ts # AI-powered predictions
│   │   ├── geminiService.ts # Google Gemini AI integration
│   │   ├── weatherService.ts# Weather data processing
│   │   └── marketPriceService.ts # Market price calculations
│   ├── store/               # Redux state management
│   │   └── slices/          # Redux slices (configured but not used)
│   └── styles/              # CSS styling
│       └── game-ui.css      # Retro green-on-black theme
```

### **Backend (AWS Lambda + Node.js)**
```
backend/
├── weather/                 # Weather prediction service
│   ├── weather-predictor.js # Lambda function
│   └── weather.py          # Python weather analysis
├── market/                  # Market price analysis
├── gamestate/              # Game state management
├── financial/              # Financial calculations
├── npc/                    # NPC story generation
└── shared/                 # Shared utilities
```

### **Infrastructure (AWS)**
```
infrastructure/
├── CloudFormation templates
├── API Gateway configuration
├── Lambda deployment scripts
└── S3 bucket setup
```

## 🔄 Data Flow Architecture

### **Game State Management**
```
LocalStorage ←→ SimpleGameUI ←→ Services ←→ External APIs
     ↓              ↓              ↓           ↓
  Persistence   React State   Business Logic  AI/Weather
```

### **AI Integration Flow**
```
User Action → AI Service → Gemini API → Response Processing → UI Update
     ↓             ↓           ↓              ↓              ↓
  Weather      Prediction   Real AI      Validation    Display
  Market       Request      Response     & Fallback    Results
  NPC Story
```

## 🧠 AI System Architecture

### **Gemini AI Integration**
- **Model**: `gemini-2.5-flash` (latest stable)
- **SDK**: Official `@google/generative-ai` package
- **Rate Limits**: 60 requests/minute, 1,500/day
- **Fallback Strategy**: Intelligent simulation when API unavailable

### **AI Services**
1. **Weather Predictions** (`predictWeather`)
   - Input: Season, day, region, planted crops
   - Output: 3-day forecast + farming tips
   - Fallback: Seasonal weather simulation

2. **Market Price Analysis** (`predictMarketPrices`)
   - Input: Crop type, season, player context
   - Output: Dynamic pricing with MSP floor
   - Fallback: Government MSP database

3. **Farming Tips** (`getFarmingTip`)
   - Input: Crop, season, growth stage
   - Output: Contextual agricultural advice
   - Fallback: Agricultural knowledge base

4. **NPC Story Generation** (`generateNPCFarmerStory`)
   - Input: Season, day, economic context
   - Output: Realistic farmer crisis stories
   - Fallback: Template-based story generation

## 🎮 Game Architecture

### **Core Game Loop**
```
Day Advance → Crop Growth → EMI Processing → Market Updates → AI Refresh
     ↓             ↓              ↓              ↓              ↓
  Time Mgmt    Growth Calc    Loan Mgmt     Price Update   Fresh Data
```

### **State Management Strategy**
- **Primary**: React useState hooks in SimpleGameUI
- **Persistence**: localStorage with auto-save
- **Redux**: Configured but unused (standalone component approach)
- **Caching**: AI responses cached per day

### **Component Hierarchy**
```
SimpleGameUI (Main Container)
├── HUD (Money, Season, Weather)
├── FarmGrid (25 tiles, crop visualization)
├── ControlPanel (Actions, Financial summary)
├── Modals
│   ├── WeatherModal (AI predictions)
│   ├── MarketModal (Price analysis)
│   ├── NPCModal (Farmer stories)
│   ├── LoanModal (Financial services)
│   └── SchemesModal (Government programs)
└── NotificationSystem (Game events)
```

## 🔧 Technical Stack

### **Frontend Technologies**
- **React 18** - Component framework
- **TypeScript** - Type safety
- **Vite** - Build tool & dev server
- **CSS3** - Retro styling with animations
- **LocalStorage** - Game state persistence

### **Backend Technologies**
- **Node.js** - Runtime environment
- **AWS Lambda** - Serverless functions
- **API Gateway** - REST API endpoints
- **CloudFormation** - Infrastructure as code
- **Python** - Weather analysis scripts

### **External Integrations**
- **Google Gemini AI** - AI predictions
- **Open-Meteo API** - Weather data
- **Government APIs** - MSP price data

## 🚀 Deployment Architecture

### **Frontend Deployment**
- **Platform**: AWS Amplify / Vercel / Netlify
- **Build**: `npm run build` (Vite production build)
- **Assets**: Static files with CDN distribution
- **Environment**: Production environment variables

### **Backend Deployment**
- **Platform**: AWS Lambda + API Gateway
- **Deployment**: CloudFormation templates
- **Scaling**: Auto-scaling serverless functions
- **Monitoring**: CloudWatch logs and metrics

## 🔒 Security Architecture

### **API Key Management**
- **Development**: `.env` files (gitignored)
- **Production**: Environment variables
- **Rotation**: Manual key rotation support
- **Fallbacks**: Graceful degradation without keys

### **Data Protection**
- **No PII**: Game uses fictional data only
- **Local Storage**: Client-side game state only
- **API Limits**: Rate limiting and quota management
- **Error Handling**: No sensitive data in error messages

## 📊 Performance Architecture

### **Optimization Strategies**
- **Caching**: AI responses cached per game day
- **Lazy Loading**: Components loaded on demand
- **Code Splitting**: Vite automatic bundle splitting
- **Asset Optimization**: Minification and compression

### **Scalability Considerations**
- **Stateless Design**: No server-side session state
- **CDN Distribution**: Static assets globally distributed
- **Serverless Backend**: Auto-scaling Lambda functions
- **Client-Side Logic**: Reduces server load

## 🧪 Testing Architecture

### **Frontend Testing**
- **Unit Tests**: Jest + React Testing Library
- **Integration Tests**: Component interaction tests
- **E2E Tests**: Playwright (configured)
- **Type Checking**: TypeScript compilation

### **Backend Testing**
- **Lambda Tests**: Local function testing
- **API Tests**: Endpoint validation
- **Load Tests**: Performance under load
- **Error Tests**: Failure scenario handling

## 📈 Monitoring & Analytics

### **Application Monitoring**
- **Frontend**: Browser console logging
- **Backend**: CloudWatch logs and metrics
- **Performance**: Vite build analysis
- **Errors**: Comprehensive error tracking

### **Business Metrics**
- **Game Engagement**: Play session duration
- **Feature Usage**: AI feature adoption
- **Performance**: Load times and responsiveness
- **Reliability**: Error rates and uptime

This architecture provides a robust, scalable, and maintainable foundation for the Harvest Hope farming simulation game.