# ⚡ Quick Start: Enable AI Features

## 🎯 3-Minute Setup

### Option 1: Play Without API Key (Recommended for Quick Start)
**Just run the game!** Everything works with smart fallbacks.
```bash
npm run dev
```
Visit: http://localhost:5174/

---

### Option 2: Enable Real AI (Optional)

#### Step 1: Get Free API Key (2 minutes)
1. Visit: **https://aistudio.google.com/app/apikey**
2. Sign in with Google
3. Click "Create API key"
4. Copy the key (starts with `AIza...`)

#### Step 2: Add to Project (30 seconds)
Open `frontend/.env` and change this line:
```bash
# Before:
# VITE_GEMINI_API_KEY=your-gemini-api-key-here

# After (paste your actual key):
VITE_GEMINI_API_KEY= your api key
```

#### Step 3: Restart Server (10 seconds)
```bash
# Press Ctrl+C to stop
# Then restart:
npm run dev
```

#### Step 4: Verify ✅
Look in browser console for:
```
🤖 Gemini AI: Connected ✅
AI-powered weather and market features enabled!
```

---

## 🎮 What Changes With API Key?

| Feature | Without API Key | With API Key |
|---------|----------------|--------------|
| Weather Advisory | ✅ Smart simulation | ✅ Real AI analysis |
| Market Prices | ✅ Seasonal variation | ✅ Context-aware AI |
| Farming Tips | ✅ Pre-written advice | ✅ Dynamic recommendations |
| Game Playability | ✅ **100% Functional** | ✅ **Enhanced Experience** |

**Bottom line:** The game is fully playable either way!

---

## 📁 File Location

```
HarvestHope/
├── frontend/
│   ├── .env          ← ADD YOUR API KEY HERE
│   ├── API_SETUP.md  ← Detailed guide
│   └── QUICK_START.md ← This file
```

---

## 🆓 Is It Really Free?

**YES!** Google Gemini offers:
- ✅ 60 requests/minute
- ✅ 1,500 requests/day  
- ✅ 1 million tokens/month
- ✅ **No credit card required**

Harvest Hope uses caching, so you'll barely use any quota!

---

## 🐛 Not Working?

### Check Console
Open browser DevTools (F12) and look for:
- ❌ "API key not configured" → Add key to `.env`
- ❌ "API error: 400" → Invalid key, check for typos
- ✅ "Gemini AI: Connected" → Working perfectly!

### Common Issues
1. **Forgot to restart server** → Press Ctrl+C, then `npm run dev`
2. **Extra spaces in key** → Make sure no spaces before/after key
3. **Didn't uncomment line** → Remove the `#` at start of line

---

## 💡 Pro Tip

Start playing immediately without API key, then add it later if you want the enhanced AI features. The game is designed to work great either way!

---

**Need more help?** See `API_SETUP.md` for detailed instructions.

**Ready to play?** Run `npm run dev` and visit http://localhost:5174/

Happy farming! 🌾🚜
