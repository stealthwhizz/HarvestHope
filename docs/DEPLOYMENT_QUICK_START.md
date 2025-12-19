# 🚀 Quick Deployment Guide

## 📋 Overview

Deploy your Harvest Hope game to production in minutes with these automated deployment options.

## 🎯 Choose Your Deployment Method

### 🆓 **GitHub Pages** (Recommended for beginners)
- **Cost**: Free
- **Setup Time**: 5 minutes
- **Custom Domain**: Supported
- **SSL**: Automatic
- **CDN**: GitHub's global CDN


- **Custom Domain**: Full control
- **SSL**: AWS Certificate Manager
- **CDN**: Global CloudFront network

## 🚀 Method 1: GitHub Pages (Fastest)

### Step 1: Prepare Repository

```bash
# Ensure you're on main branch
git checkout main

# Commit any pending changes
git add .
git commit -m "prepare for deployment"
git push origin main
```

### Step 2: Run Deployment Script

```powershell
# Windows PowerShell
.\deploy-github-pages.ps1
```

```bash
# Linux/macOS
chmod +x deploy-github-pages.sh
./deploy-github-pages.sh
```

### Step 3: Configure GitHub Pages

1. **Go to Repository Settings**
   - Visit: `https://github.com/yourusername/harvest-hope/settings`
   - Click "Pages" in sidebar

2. **Set Source**
   - Source: "GitHub Actions"
   - Save configuration

3. **Add API Key Secret**
   - Go to "Secrets and variables" → "Actions"
   - Add secret: `VITE_GEMINI_API_KEY` = `your-actual-api-key`

### Step 4: Wait for Deployment

- ⏱️ **Build Time**: 2-3 minutes
- 🔗 **URL**: `https://yourusername.github.io/harvest-hope`
- 📊 **Monitor**: Check "Actions" tab for progress



## 🔧 Environment Configuration

### Required Environment Variables

For both deployment methods, you need:

```bash
# Required for AI features
VITE_GEMINI_API_KEY=your-actual-api-key

# Optional production settings
VITE_NODE_ENV=production
VITE_ENABLE_DEBUG_LOGGING=false
VITE_API_BASE_URL=https://api.yourdomain.com
```

### GitHub Secrets Setup

1. **Repository Settings** → **Secrets and variables** → **Actions**
2. **Add these secrets**:
   ```
   VITE_GEMINI_API_KEY=your-actual-api-key

   ```

## ✅ Verification Checklist

### After Deployment

- [ ] ✅ Site loads without errors
- [ ] ✅ All assets load (CSS, JS, images)
- [ ] ✅ Game functionality works
- [ ] ✅ AI features work (weather, market, NPC)
- [ ] ✅ Game saves and loads properly
- [ ] ✅ No console errors
- [ ] ✅ Mobile responsive
- [ ] ✅ Fast loading times

### Test Game Features

```bash
# Test these in your deployed site:
1. Plant crops on farm tiles
2. Advance days and watch growth
3. Harvest mature crops
4. Check weather predictions (AI)
5. View market prices (AI)
6. Meet farmers (AI stories)
7. Apply for loans
8. Use government schemes
9. Save/load game state
10. Skip month functionality
```

## 🐛 Troubleshooting

### Common Issues

#### 1. **Build Fails**
```bash
# Check for TypeScript errors
cd frontend
npm run type-check

# Fix any errors and redeploy
```

#### 2. **API Key Not Working**
```bash
# Verify secret is set correctly
# GitHub: Repository Settings → Secrets
# AWS: Check environment variables in deployment
```

#### 3. **404 Errors on Page Refresh**
```bash
# GitHub Pages: Automatic SPA routing
```

#### 4. **Slow Loading**
```bash
# Check CloudFront cache settings
# Verify asset optimization in build
```

### Debug Commands

```bash
# Test build locally
cd frontend
npm run build
npm run preview

# Check deployment logs
# GitHub: Actions tab

# Verify environment variables
echo $VITE_GEMINI_API_KEY
```

## 📊 Performance Optimization

### Build Optimization

The deployment scripts automatically:
- ✅ Minify JavaScript and CSS
- ✅ Optimize images and assets
- ✅ Enable code splitting
- ✅ Remove console.log in production
- ✅ Generate optimized bundles

### Caching Strategy

- **Static Assets**: 1 year cache (CSS, JS, images)
- **HTML Files**: 5 minutes cache (for updates)
- **API Responses**: Cached per game day

## 💰 Cost Comparison

### GitHub Pages
- **Cost**: $0 (Free)
- **Bandwidth**: 100GB/month
- **Storage**: 1GB
- **Custom Domain**: Free
- **SSL**: Free



## 🎯 Recommended Workflow

### For Development/Testing
1. **Use GitHub Pages** for quick deployments
2. **Free and automatic** with every push
3. **Perfect for demos** and testing

### For Production
1. **Use GitHub Pages** with custom domain for professional setup
2. **Custom domain** with your branding
3. **Global CDN** through GitHub's infrastructure
4. **Professional setup** for business use

## 🔗 Next Steps

### After Successful Deployment

1. **🌐 Custom Domain** (optional)
   - GitHub Pages: Add CNAME file
   - GitHub Pages: Configure DNS settings

2. **📊 Analytics** (optional)
   - Add Google Analytics
   - Monitor user engagement

3. **🔍 SEO Optimization**
   - Add meta tags
   - Create sitemap.xml

4. **📱 PWA Features** (optional)
   - Add service worker
   - Enable offline mode

## 📚 Detailed Guides

- **[GitHub Pages Deployment](DEPLOYMENT_GITHUB_PAGES.md)** - Complete GitHub Pages guide

- **[Custom Domain Setup](DEPLOYMENT_CUSTOM_DOMAIN.md)** - Domain configuration
- **[Performance Optimization](PERFORMANCE_OPTIMIZATIONS.md)** - Speed optimization

---

<div align="center">

**🎉 Your Harvest Hope game is ready for the world! 🌾**

*Choose your deployment method and get your farming simulation live in minutes.*

</div>