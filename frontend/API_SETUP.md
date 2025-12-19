# 🔑 API Key Setup Guide

This guide will help you set up the Google Gemini API key to enable AI-powered features in Harvest Hope.

## 🎯 What You'll Get With API Key

With a Google Gemini API key, you'll unlock:
- 🌦️ **AI Weather Advisory** - Real-time farming recommendations based on weather
- 💹 **AI Market Pricing** - Dynamic crop prices that react to game state
- 🤖 **Intelligent Analysis** - Context-aware advice for your farming decisions

**Without API key:** The game works perfectly with intelligent fallback systems!

---

## 📝 Step-by-Step: Get Your FREE Google Gemini API Key

### Step 1: Visit Google AI Studio
Go to: **https://aistudio.google.com/app/apikey**

### Step 2: Sign In
- Sign in with your Google account
- If you don't have one, create a free Google account

### Step 3: Create API Key
1. Click **"Get API key"** or **"Create API key"**
2. Select **"Create API key in new project"** (recommended)
3. Copy the generated API key (starts with `AIza...`)

### Step 4: Add to Your Project
1. Open `frontend/.env` file in your project
2. Find the line: `# VITE_GEMINI_API_KEY=your-gemini-api-key-here`
3. Uncomment it (remove the `#`) and replace with your key:
   ```
   VITE_GEMINI_API_KEY=your_api_key
   ```
4. Save the file

### Step 5: Restart Development Server
```bash
# Stop the current server (Ctrl+C)
# Then restart:
npm run dev
```

---

## ✅ Verify It's Working

1. **Start the game** at http://localhost:5174/
2. **Look for notifications** at game start:
   - ✅ `🤖 AI Features: ENABLED (Google Gemini SDK)`
   - ✅ `✅ Gemini AI: Connection verified!`
3. **Test AI features**:
   - Click `🌦️ WEATHER` - Should show "🤖 AI POWERED" badge
   - Click `🏪 MARKET` - Should show "🤖 AI-Powered" badge
4. **Check browser console** for detailed logs:
   - `🤖 Gemini AI SDK initialized successfully`
   - `✅ Gemini AI response received via SDK`

## 🔧 Technical Details (Updated)

**New Implementation (v2.0):**
- ✅ Uses official `@google/generative-ai` SDK
- ✅ Uses `gemini-2.5-flash` model (latest stable)
- ✅ Better error handling and fallbacks
- ✅ Automatic connection testing
- ✅ Improved response validation
- ✅ No more 404 errors!

**Previous Issues Fixed:**
- ❌ REST API 404 errors → ✅ Official SDK
- ❌ Manual endpoint management → ✅ Automatic handling
- ❌ Complex error handling → ✅ Built-in fallbacks
2. **Click "🌦️ REAL WEATHER + AI"** button
3. **Look for:** "🤖 AI Advisory (Google Gemini)" in the weather modal
4. **Click "🏪 MARKET PRICES"** button
5. **Look for:** "🤖 AI-Powered" badge in the market modal

If you see these, your API key is working! 🎉

---

## 🆓 Free Tier Limits

Google Gemini offers a **generous free tier**:
- ✅ **60 requests per minute**
- ✅ **1,500 requests per day**
- ✅ **1 million tokens per month**

**For Harvest Hope:** This is more than enough! The game caches responses and uses smart fallbacks.

---

## 🔒 Security Best Practices

### ✅ DO:
- Keep your `.env` file in `.gitignore` (already configured)
- Never commit API keys to GitHub
- Use environment variables for production

### ❌ DON'T:
- Share your API key publicly
- Commit `.env` file to version control
- Use the same key for production and development

---

## 🐛 Troubleshooting

### "API key not configured, using demo response"
**Solution:** Make sure you:
1. Uncommented the line in `.env`
2. Replaced `your-gemini-api-key-here` with your actual key
3. Restarted the development server

### "Gemini API error: 400" or "Gemini API error: 404"
**Solution:** Your API key might be invalid or expired. Try these steps:
1. Visit https://aistudio.google.com/app/apikey
2. Delete the old API key and create a new one
3. Copy the entire new key (starts with `AIza`)
4. Replace the key in `.env` file (no extra spaces)
5. Restart the development server

**Note:** Google sometimes updates their API endpoints. If you continue to see 404 errors, the game will automatically use smart fallback responses.

### "Gemini API error: 429"
**Solution:** You've hit the rate limit. The game will:
1. Automatically use fallback responses
2. Cache previous responses to reduce API calls
3. Work perfectly without interruption

---

## 🎮 Playing Without API Key

**Good news:** Harvest Hope works great without an API key!

**Fallback Features:**
- 🌦️ **Smart Weather Simulation** - Realistic seasonal patterns
- 💹 **Dynamic Market Prices** - Seasonal price variations
- 📊 **Intelligent Defaults** - Context-aware responses

The AI features enhance the experience but aren't required for gameplay.

---

## 📚 Additional Resources

- **Google AI Studio:** https://aistudio.google.com/
- **Gemini API Docs:** https://ai.google.dev/docs
- **Pricing Info:** https://ai.google.dev/pricing
- **Rate Limits:** https://ai.google.dev/gemini-api/docs/quota

---

## 💡 Pro Tips

1. **Cache is Your Friend:** The game caches AI responses per day, so you won't spam the API
2. **Fallback is Smart:** Even without API, the game provides realistic responses
3. **Monitor Usage:** Check your usage at https://aistudio.google.com/app/apikey
4. **Free Forever:** Google Gemini's free tier is permanent (as of 2024)

---

## 🚀 Ready to Play!

Once you've added your API key:
1. Restart the dev server
2. Plant some crops
3. Check the AI-powered weather and market features
4. Enjoy the enhanced farming experience!

Happy farming! 🌾🚜💰
