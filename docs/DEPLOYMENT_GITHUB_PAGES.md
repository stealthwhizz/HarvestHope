# 🚀 GitHub Pages Deployment Guide

## 📋 Overview

Deploy Harvest Hope to GitHub Pages for free static hosting with automatic builds and deployments.

## 🔧 Prerequisites

- ✅ GitHub repository with your code
- ✅ Production build working locally (`npm run build`)
- ✅ No sensitive data in tracked files (API keys in environment variables)

## 🚀 Method 1: GitHub Actions (Recommended)

### Step 1: Create GitHub Actions Workflow

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches: [ main ]
  pull_request:
    branches: [ main ]

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: "pages"
  cancel-in-progress: false

jobs:
  build:
    runs-on: ubuntu-latest
    
    steps:
    - name: Checkout
      uses: actions/checkout@v4
      
    - name: Setup Node.js
      uses: actions/setup-node@v4
      with:
        node-version: '18'
        cache: 'npm'
        cache-dependency-path: frontend/package-lock.json
        
    - name: Install dependencies
      run: |
        cd frontend
        npm ci
        
    - name: Build application
      run: |
        cd frontend
        npm run build
      env:
        VITE_GEMINI_API_KEY: ${{ secrets.VITE_GEMINI_API_KEY }}
        VITE_NODE_ENV: production
        VITE_ENABLE_DEBUG_LOGGING: false
        
    - name: Setup Pages
      uses: actions/configure-pages@v4
      
    - name: Upload artifact
      uses: actions/upload-pages-artifact@v3
      with:
        path: frontend/dist
        
  deploy:
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    runs-on: ubuntu-latest
    needs: build
    
    steps:
    - name: Deploy to GitHub Pages
      id: deployment
      uses: actions/deploy-pages@v4
```

### Step 2: Configure Repository Settings

1. **Go to Repository Settings**
   - Navigate to your GitHub repository
   - Click on "Settings" tab

2. **Enable GitHub Pages**
   - Go to "Pages" in the left sidebar
   - Source: "GitHub Actions"
   - Save the configuration

3. **Add Environment Secrets**
   - Go to "Secrets and variables" → "Actions"
   - Click "New repository secret"
   - Add: `VITE_GEMINI_API_KEY` with your actual API key

### Step 3: Configure Base Path (if needed)

If your repository name is not your domain, update `vite.config.ts`:

```typescript
export default defineConfig({
  base: '/your-repository-name/', // Add this line
  plugins: [react()],
  // ... rest of config
});
```

### Step 4: Deploy

```bash
# Commit and push the workflow file
git add .github/workflows/deploy.yml
git commit -m "feat: add GitHub Pages deployment workflow"
git push origin main

# GitHub Actions will automatically build and deploy
```

## 🚀 Method 2: Manual Deployment with gh-pages

### Step 1: Install gh-pages

```bash
cd frontend
npm install --save-dev gh-pages
```

### Step 2: Update package.json

Add deployment scripts:

```json
{
  "scripts": {
    "predeploy": "npm run build",
    "deploy": "gh-pages -d dist",
    "deploy:clean": "gh-pages -d dist -f"
  },
  "homepage": "https://yourusername.github.io/harvest-hope"
}
```

### Step 3: Deploy

```bash
cd frontend
npm run deploy
```

## 🔧 Configuration Files

### Update vite.config.ts for GitHub Pages

```typescript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: '/harvest-hope/', // Replace with your repo name
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: false, // Disable for production
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          ai: ['@google/generative-ai']
        }
      }
    }
  },
  server: {
    port: 5174,
    host: true
  }
})
```

### Create _redirects file for SPA routing

Create `frontend/public/_redirects`:

```
/*    /index.html   200
```

## 🌐 Custom Domain (Optional)

### Step 1: Add CNAME file

Create `frontend/public/CNAME`:

```
yourdomain.com
```

### Step 2: Configure DNS

Add DNS records:
- **A Record**: Point to GitHub Pages IPs
  - 185.199.108.153
  - 185.199.109.153
  - 185.199.110.153
  - 185.199.111.153
- **CNAME Record**: `www` → `yourusername.github.io`

## 🔒 Environment Variables

### Production Environment Variables

Set these in GitHub repository secrets:

```bash
# Required
VITE_GEMINI_API_KEY=your-actual-api-key

# Optional
VITE_API_BASE_URL=https://api.yourdomain.com
VITE_WEATHER_API_URL=https://api.yourdomain.com/weather
VITE_NODE_ENV=production
VITE_ENABLE_DEBUG_LOGGING=false
```

### Access in GitHub Actions

```yaml
env:
  VITE_GEMINI_API_KEY: ${{ secrets.VITE_GEMINI_API_KEY }}
  VITE_NODE_ENV: production
```

## ✅ Verification Steps

### 1. Check Build Locally

```bash
cd frontend
npm run build
npm run preview
# Visit http://localhost:4173
```

### 2. Verify Deployment

- ✅ Site loads at `https://yourusername.github.io/harvest-hope`
- ✅ All assets load correctly (CSS, JS, images)
- ✅ AI features work (if API key configured)
- ✅ Game saves and loads properly
- ✅ No console errors

### 3. Test Game Features

- ✅ Plant and harvest crops
- ✅ Weather predictions work
- ✅ Market prices load
- ✅ NPC stories generate
- ✅ Financial system functions

## 🐛 Troubleshooting

### Common Issues

#### 1. **404 Errors on Refresh**
**Problem**: SPA routing not working  
**Solution**: Add `_redirects` file or configure server

#### 2. **Assets Not Loading**
**Problem**: Incorrect base path  
**Solution**: Update `base` in `vite.config.ts`

#### 3. **API Key Not Working**
**Problem**: Environment variable not set  
**Solution**: Check GitHub repository secrets

#### 4. **Build Fails**
**Problem**: TypeScript errors or missing dependencies  
**Solution**: Fix errors locally first

### Debug Commands

```bash
# Check GitHub Actions logs
# Go to Actions tab in GitHub repository

# Test build locally
cd frontend
npm run build

# Check environment variables
echo $VITE_GEMINI_API_KEY

# Clear cache and rebuild
rm -rf node_modules dist
npm install
npm run build
```

## 📊 Performance Optimization

### Build Optimization

```typescript
// vite.config.ts
export default defineConfig({
  build: {
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true, // Remove console.log in production
        drop_debugger: true
      }
    },
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          ai: ['@google/generative-ai'],
          utils: ['lodash', 'date-fns'] // if used
        }
      }
    }
  }
})
```

### GitHub Pages Limits

- **File Size**: 100MB per file
- **Repository Size**: 1GB total
- **Bandwidth**: 100GB per month
- **Builds**: 10 per hour

## 🎯 Final Checklist

- [ ] ✅ GitHub Actions workflow created
- [ ] ✅ Repository Pages settings configured
- [ ] ✅ Environment secrets added
- [ ] ✅ Base path configured (if needed)
- [ ] ✅ Build succeeds locally
- [ ] ✅ Deployment workflow runs successfully
- [ ] ✅ Site accessible at GitHub Pages URL
- [ ] ✅ All game features working
- [ ] ✅ No sensitive data in repository
- [ ] ✅ Custom domain configured (optional)

## 🔗 Useful Links

- **GitHub Pages Docs**: https://docs.github.com/en/pages
- **GitHub Actions**: https://docs.github.com/en/actions
- **Vite Deployment**: https://vitejs.dev/guide/static-deploy.html
- **Custom Domains**: https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site

---

**🎉 Your Harvest Hope game will be live at: `https://yourusername.github.io/harvest-hope`**