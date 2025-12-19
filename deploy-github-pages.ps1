# Deploy Harvest Hope to GitHub Pages
# PowerShell deployment script

Write-Host "🚀 Deploying Harvest Hope to GitHub Pages..." -ForegroundColor Green

# Check if we're in the right directory
if (-not (Test-Path "frontend/package.json")) {
    Write-Host "❌ Error: Please run this script from the project root directory" -ForegroundColor Red
    exit 1
}

# Check if git is clean
$gitStatus = git status --porcelain
if ($gitStatus) {
    Write-Host "⚠️  Warning: You have uncommitted changes. Consider committing them first." -ForegroundColor Yellow
    $continue = Read-Host "Continue anyway? (y/N)"
    if ($continue -ne "y" -and $continue -ne "Y") {
        Write-Host "❌ Deployment cancelled" -ForegroundColor Red
        exit 1
    }
}

# Build the application
Write-Host "📦 Building application..." -ForegroundColor Cyan
Set-Location frontend

# Install dependencies if needed
if (-not (Test-Path "node_modules")) {
    Write-Host "📥 Installing dependencies..." -ForegroundColor Cyan
    npm install
}

# Build for production
Write-Host "🔨 Building for production..." -ForegroundColor Cyan
$env:VITE_NODE_ENV = "production"
$env:VITE_ENABLE_DEBUG_LOGGING = "false"
npm run build

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Build failed!" -ForegroundColor Red
    Set-Location ..
    exit 1
}

Write-Host "✅ Build successful!" -ForegroundColor Green

# Go back to root
Set-Location ..

# Check if GitHub Pages is configured
Write-Host "🔍 Checking GitHub Pages configuration..." -ForegroundColor Cyan

# Add and commit the workflow file if it doesn't exist
if (-not (Test-Path ".github/workflows/deploy-github-pages.yml")) {
    Write-Host "❌ GitHub Actions workflow not found!" -ForegroundColor Red
    Write-Host "Please ensure .github/workflows/deploy-github-pages.yml exists" -ForegroundColor Red
    exit 1
}

# Commit and push
Write-Host "📤 Pushing to GitHub..." -ForegroundColor Cyan
git add .
git commit -m "feat: deploy to GitHub Pages

- Add GitHub Actions workflow for automatic deployment
- Configure production build settings
- Update environment configuration for deployment"

git push origin main

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Failed to push to GitHub!" -ForegroundColor Red
    exit 1
}

Write-Host "🎉 Deployment initiated!" -ForegroundColor Green
Write-Host ""
Write-Host "📋 Next Steps:" -ForegroundColor Yellow
Write-Host "1. Go to your GitHub repository" -ForegroundColor White
Write-Host "2. Navigate to Settings > Pages" -ForegroundColor White
Write-Host "3. Set Source to 'GitHub Actions'" -ForegroundColor White
Write-Host "4. Add repository secrets:" -ForegroundColor White
Write-Host "   - VITE_GEMINI_API_KEY: your-actual-api-key" -ForegroundColor White
Write-Host ""
Write-Host "🔗 Your site will be available at:" -ForegroundColor Cyan
$repoName = (git remote get-url origin) -replace '.*github\.com[:/]([^/]+)/([^/]+)\.git.*', '$1/$2'
Write-Host "   https://$($repoName.Split('/')[0]).github.io/$($repoName.Split('/')[1])/" -ForegroundColor Cyan
Write-Host ""
Write-Host "⏱️  Deployment usually takes 2-5 minutes to complete." -ForegroundColor Yellow