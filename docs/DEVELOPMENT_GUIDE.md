# 🛠️ Harvest Hope - Development Guide

## 🚀 Quick Start

### **Prerequisites**
- **Node.js** 18+ (LTS recommended)
- **npm** 9+ or **yarn** 1.22+
- **Git** for version control
- **AWS KIRo** (recommended IDE)

### **Initial Setup**
```bash
# Clone the repository
git clone https://github.com/your-username/harvest-hope.git
cd harvest-hope

# Install frontend dependencies
cd frontend
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your API keys (see API_SETUP.md)

# Start development server
npm run dev
```

### **Development Server**
- **URL**: http://localhost:5174
- **Hot Reload**: Automatic browser refresh on file changes
- **TypeScript**: Real-time type checking
- **Console Logs**: Detailed debugging information

## 🏗️ Project Structure

### **Frontend Architecture**
```
frontend/
├── src/
│   ├── components/          # React components
│   │   ├── SimpleGameUI.tsx # 🎯 Main game (2,253 lines)
│   │   ├── GameUI.tsx       # Alternative interface
│   │   ├── FarmGrid.tsx     # Farm visualization
│   │   ├── HUD.tsx          # Game HUD
│   │   └── ControlPanel.tsx # Game controls
│   ├── services/            # Business logic
│   │   ├── aiPredictions.ts # 🤖 AI integration
│   │   ├── geminiService.ts # Google Gemini API
│   │   ├── weatherService.ts# Weather processing
│   │   └── marketPriceService.ts # Market calculations
│   ├── store/               # Redux (configured, not used)
│   ├── styles/              # CSS styling
│   └── types/               # TypeScript definitions
├── public/                  # Static assets
├── dist/                    # Production build output
└── docs/                    # Documentation
```

### **Key Files to Know**
- **`SimpleGameUI.tsx`** - Main game component (primary development focus)
- **`aiPredictions.ts`** - AI service integration (weather, market, NPC)
- **`game-ui.css`** - Retro styling and animations
- **`vite.config.ts`** - Build configuration
- **`.env`** - Environment variables (API keys)

## 🔧 Development Workflow

### **Code Organization**
```typescript
// Component Structure
const SimpleGameUI: React.FC = () => {
  // 1. State Management (useState hooks)
  const [money, setMoney] = useState(100000);
  const [day, setDay] = useState(1);
  
  // 2. Game Logic Functions
  const handleAdvanceDay = () => { /* ... */ };
  const handlePlantCrop = () => { /* ... */ };
  
  // 3. AI Integration
  const fetchWeatherPrediction = async () => { /* ... */ };
  
  // 4. Render JSX
  return <div className="game-ui-container">...</div>;
};
```

### **State Management Pattern**
- **Primary**: React useState hooks
- **Persistence**: localStorage auto-save
- **No Redux**: Standalone component approach
- **Immutable Updates**: Proper React state patterns

### **AI Service Pattern**
```typescript
// AI Function Template
export async function aiFunction(params: InputType): Promise<OutputType> {
  try {
    // 1. Check API availability
    if (GEMINI_API_KEY === 'demo-mode' || !model) {
      return fallbackResponse();
    }
    
    // 2. Call Gemini AI
    const result = await model.generateContent(prompt);
    const response = await result.response;
    
    // 3. Validate and process response
    const processedData = validateResponse(response.text());
    
    // 4. Return processed result
    return processedData;
    
  } catch (error) {
    // 5. Graceful fallback
    console.error('AI function failed:', error);
    return fallbackResponse();
  }
}
```

## 🧪 Testing Strategy

### **Manual Testing Checklist**
```bash
# 1. Start development server
npm run dev

# 2. Test core gameplay
- Plant crops on farm tiles
- Advance days and watch growth
- Harvest mature crops
- Sell crops for money

# 3. Test AI features
- Click "Weather" button → Check AI predictions
- Click "Market" button → Verify dynamic prices
- Click "Farmers" button → Generate NPC stories

# 4. Test financial system
- Apply for loans
- Check EMI payments
- Monitor credit score changes
- Review transaction history

# 5. Test persistence
- Make changes to game state
- Refresh browser
- Verify state restoration
```

### **Automated Testing**
```bash
# Run TypeScript checks
npm run type-check

# Run unit tests (when available)
npm run test

# Build production version
npm run build

# Preview production build
npm run preview
```

### **Browser Console Testing**
```javascript
// Test AI functions directly in browser console
import('./src/services/aiPredictions.ts').then(ai => {
  ai.predictWeather(1, 'Kharif', 'Maharashtra', ['rice']);
  ai.predictMarketPrices('rice', 'Kharif', 1);
  ai.getFarmingTip('rice', 'Kharif', 1, 'growing');
});
```

## 🎨 Styling Guidelines

### **CSS Architecture**
```css
/* Retro Theme Variables */
:root {
  --retro-green: #4af626;
  --retro-amber: #ffaa00;
  --retro-red: #ff4444;
  --retro-bg: #000000;
  --retro-panel: #111111;
}

/* Component Naming Convention */
.game-ui-container { /* Main container */ }
.retro-panel { /* Reusable panel style */ }
.retro-button { /* Consistent button style */ }
.retro-font { /* Typography */ }
```

### **Responsive Design**
- **Desktop First**: Optimized for desktop gameplay
- **Mobile Friendly**: Responsive layout for mobile devices
- **Touch Support**: Click/touch interaction compatibility
- **Accessibility**: High contrast and readable fonts

## 🔌 API Integration

### **Gemini AI Setup**
```typescript
// Initialize Gemini AI
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ 
  model: 'gemini-2.5-flash',
  generationConfig: {
    temperature: 0.7,
    maxOutputTokens: 200,
  }
});
```

### **Error Handling Pattern**
```typescript
try {
  // API call
  const result = await apiCall();
  return processResult(result);
} catch (error) {
  console.error('API Error:', error);
  // Always provide fallback
  return intelligentFallback();
}
```

### **Rate Limit Management**
- **Caching**: Cache AI responses per game day
- **Fallbacks**: Intelligent simulation when limits reached
- **Monitoring**: Track API usage in console logs
- **Graceful Degradation**: Game works without API

## 🚀 Build & Deployment

### **Development Build**
```bash
# Start dev server with hot reload
npm run dev

# Type checking only
npm run type-check

# Lint code
npm run lint
```

### **Production Build**
```bash
# Build for production
npm run build

# Preview production build locally
npm run preview

# Build with type checking (development)
npm run build:dev
```

### **Build Output**
```
dist/
├── assets/
│   ├── index-[hash].js      # Main application bundle
│   ├── index-[hash].css     # Compiled styles
│   └── vendor-[hash].js     # Third-party libraries
├── index.html               # Entry point
└── favicon.ico              # App icon
```

### **Deployment Platforms**
- **AWS Amplify**: `amplify.yml` configuration included
- **Vercel**: Zero-config deployment
- **Netlify**: Drag-and-drop deployment
- **GitHub Pages**: Static hosting option

## 🐛 Debugging Guide

### **Common Issues & Solutions**

#### **AI Predictions Not Working**
```bash
# Check API key configuration
echo $VITE_GEMINI_API_KEY

# Verify in browser console
console.log(import.meta.env.VITE_GEMINI_API_KEY);

# Check network requests in DevTools
# Look for 404 or 429 errors
```

#### **Game State Not Saving**
```javascript
// Check localStorage in browser DevTools
localStorage.getItem('harvestHopeSave');

// Clear corrupted save data
localStorage.removeItem('harvestHopeSave');
```

#### **TypeScript Errors**
```bash
# Check for type errors
npm run type-check

# Common fixes
- Add type annotations
- Update interface definitions
- Check import/export statements
```

### **Development Tools**
- **React DevTools**: Component inspection
- **Browser DevTools**: Network, console, storage
- **VS Code Extensions**: TypeScript, React, ESLint
- **Vite DevTools**: Build analysis and optimization

## 📊 Performance Optimization

### **Code Optimization**
```typescript
// Lazy loading components
const LazyModal = React.lazy(() => import('./Modal'));

// Memoization for expensive calculations
const expensiveValue = useMemo(() => {
  return calculateComplexValue(data);
}, [data]);

// Callback optimization
const handleClick = useCallback(() => {
  // Handler logic
}, [dependencies]);
```

### **Bundle Optimization**
```javascript
// vite.config.ts
export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          ai: ['@google/generative-ai']
        }
      }
    }
  }
});
```

### **Performance Monitoring**
- **Bundle Analyzer**: `npm run build` shows bundle sizes
- **Lighthouse**: Performance auditing
- **React Profiler**: Component performance analysis
- **Network Tab**: API call optimization

## 🔒 Security Best Practices

### **API Key Security**
```bash
# ✅ DO: Use environment variables
VITE_GEMINI_API_KEY=your_key_here

# ❌ DON'T: Hardcode in source
const API_KEY = "AIza..."; // Never do this!
```

### **Input Validation**
```typescript
// Validate user inputs
const validateAmount = (amount: number): boolean => {
  return amount > 0 && amount <= MAX_AMOUNT && Number.isInteger(amount);
};

// Sanitize AI responses
const sanitizeResponse = (text: string): string => {
  return text.replace(/[<>]/g, '').trim();
};
```

## 📝 Contributing Guidelines

### **Code Style**
- **TypeScript**: Strict mode enabled
- **ESLint**: Configured for React and TypeScript
- **Prettier**: Code formatting (if configured)
- **Naming**: camelCase for variables, PascalCase for components

### **Commit Messages**
```bash
# Format: type(scope): description
feat(ai): add weather prediction caching
fix(ui): resolve crop growth animation bug
docs(readme): update installation instructions
```

### **Pull Request Process**
1. **Fork** the repository
2. **Create** feature branch (`git checkout -b feature/amazing-feature`)
3. **Commit** changes (`git commit -m 'Add amazing feature'`)
4. **Push** to branch (`git push origin feature/amazing-feature`)
5. **Open** Pull Request with detailed description

This development guide provides everything needed to contribute effectively to the Harvest Hope project!