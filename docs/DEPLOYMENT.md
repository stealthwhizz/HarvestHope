# Harvest Hope Deployment Guide

This guide covers the complete deployment process for Harvest Hope: The Last Farm using GitHub Pages.

## Prerequisites

Before deploying, ensure you have:

- Node.js 18+ installed
- Git repository set up on GitHub
- GitHub account with repository access

## Architecture Overview

The deployment consists of:

- **Frontend**: React app deployed via GitHub Pages
- **Build System**: GitHub Actions for automated deployment
- **CDN**: GitHub's global CDN infrastructure

## Quick Deployment

### Automated GitHub Pages Deployment

```bash
# Commit and push your changes
git add .
git commit -m "ready for deployment"
git push origin main

# The GitHub Actions workflow will automatically deploy
```

## Step-by-Step Deployment

### 1. Enable GitHub Pages

1. **Go to Repository Settings**:
   - Navigate to your GitHub repository
   - Click on "Settings" tab
   - Scroll down to "Pages" section

2. **Configure Source**:
   - Set Source to "GitHub Actions"
   - Save the configuration

### 2. Add Environment Variables

1. **Repository Secrets**:
   - Go to Settings → Secrets and variables → Actions
   - Add repository secret: `VITE_GEMINI_API_KEY`
   - Set value to your actual Gemini API key

### 3. Trigger Deployment

```bash
# Make sure all changes are committed
git add .
git commit -m "deploy to GitHub Pages"
git push origin main

# GitHub Actions will automatically build and deploy
```

### 4. Access Your Site

Your site will be available at:
```
https://yourusername.github.io/HarvestHope/
```

## Deployment Features

### GitHub Actions Workflow

The `.github/workflows/deploy-github-pages.yml` file automatically:
- Installs dependencies
- Builds the production bundle
- Deploys to GitHub Pages
- Runs on every push to main branch

### Build Optimization

The production build includes:
- **Code splitting**: Vendor and AI chunks separated
- **Asset optimization**: Images, CSS, JS minified
- **Caching**: Optimized file naming for browser caching
- **Bundle size**: ~84KB gzipped total

### Performance Features

- GitHub's global CDN for fast delivery
- Automatic HTTPS/SSL
- Optimized asset caching
- Mobile responsive design

## Cost

**GitHub Pages is completely FREE** including:
- Unlimited bandwidth (100GB/month soft limit)
- Free SSL certificate
- Global CDN
- Automatic deployments

## Troubleshooting

### Common Issues

1. **Build Failures**:
   - Check GitHub Actions logs in the "Actions" tab
   - Verify environment variables are set correctly
   - Ensure Node.js version compatibility

2. **API Key Issues**:
   - Verify `VITE_GEMINI_API_KEY` secret is set in repository
   - Check that the API key is valid and active
   - Game works without API key (has fallbacks)

3. **404 Errors on Page Refresh**:
   - GitHub Pages automatically handles SPA routing
   - Ensure `base` path in vite.config.ts matches repository name

### Debugging Commands

```bash
# Test build locally
cd frontend
npm run build
npm run preview

# Check GitHub Actions logs
# Go to repository → Actions tab → View latest workflow run

# Test deployed site
curl -I https://yourusername.github.io/HarvestHope/
```

## Rollback Procedures

### Rollback to Previous Version

In GitHub:
1. Go to repository → Actions tab
2. Find a previous successful deployment
3. Click "Re-run jobs" to redeploy that version

### Manual Rollback

```bash
# Revert to previous commit
git revert HEAD
git push origin main

# GitHub Actions will automatically redeploy the reverted version
```

## Maintenance

### Regular Tasks

1. **Weekly**: Monitor GitHub Actions for failed builds
2. **Monthly**: Update dependencies and security patches
3. **Quarterly**: Review and optimize bundle size

### Updates

1. **Code Updates**: Push to GitHub (auto-deploys via GitHub Actions)
2. **Dependency Updates**: Update package.json and push to trigger rebuild
3. **Configuration Updates**: Modify vite.config.ts or workflow files as needed

## Support and Resources

- **GitHub Pages Documentation**: [GitHub Pages Guide](https://docs.github.com/en/pages)
- **GitHub Actions Documentation**: [GitHub Actions Guide](https://docs.github.com/en/actions)
- **Vite Documentation**: [Vite Build Guide](https://vitejs.dev/guide/build.html)

For issues or questions, check the GitHub Actions logs first, then consult the GitHub Pages documentation.