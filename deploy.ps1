# Harvest Hope Deployment Script (PowerShell)
# This script deploys the complete Harvest Hope infrastructure and frontend

$ErrorActionPreference = "Stop"

Write-Host "🌾 Starting Harvest Hope Deployment..." -ForegroundColor Green

# Check if AWS CLI is configured
try {
    aws sts get-caller-identity | Out-Null
} catch {
    Write-Host "❌ AWS CLI not configured. Please run 'aws configure' first." -ForegroundColor Red
    exit 1
}

# Check if CDK is installed
if (!(Get-Command cdk -ErrorAction SilentlyContinue)) {
    Write-Host "❌ AWS CDK not found. Installing..." -ForegroundColor Yellow
    npm install -g aws-cdk
}

# Get current AWS account and region
$AWS_ACCOUNT = (aws sts get-caller-identity --query Account --output text)
$AWS_REGION = (aws configure get region)

Write-Host "📍 Deploying to Account: $AWS_ACCOUNT, Region: $AWS_REGION" -ForegroundColor Cyan

# Step 1: Bootstrap CDK (if not already done)
Write-Host "🔧 Bootstrapping CDK..." -ForegroundColor Yellow
Set-Location infrastructure
cdk bootstrap "aws://$AWS_ACCOUNT/$AWS_REGION"

# Step 2: Install dependencies
Write-Host "📦 Installing infrastructure dependencies..." -ForegroundColor Yellow
npm install

# Step 3: Build and deploy CDK stack
Write-Host "🏗️  Building and deploying infrastructure..." -ForegroundColor Yellow
npm run build
cdk deploy --require-approval never

# Step 4: Get outputs from CDK deployment
Write-Host "📋 Retrieving deployment outputs..." -ForegroundColor Yellow
$API_URL = (aws cloudformation describe-stacks --stack-name HarvestHopeStack --query "Stacks[0].Outputs[?OutputKey=='APIGatewayURL'].OutputValue" --output text)
$CLOUDFRONT_URL = (aws cloudformation describe-stacks --stack-name HarvestHopeStack --query "Stacks[0].Outputs[?OutputKey=='CloudFrontURL'].OutputValue" --output text)
$ASSETS_BUCKET = (aws cloudformation describe-stacks --stack-name HarvestHopeStack --query "Stacks[0].Outputs[?OutputKey=='AssetsBucketName'].OutputValue" --output text)

Write-Host "✅ Infrastructure deployed successfully!" -ForegroundColor Green
Write-Host "🔗 API Gateway URL: $API_URL" -ForegroundColor Cyan
Write-Host "🔗 CloudFront URL: $CLOUDFRONT_URL" -ForegroundColor Cyan
Write-Host "🪣 Assets Bucket: $ASSETS_BUCKET" -ForegroundColor Cyan

# Step 5: Upload sample data and assets (if they exist)
Set-Location ..
if (Test-Path "assets") {
    Write-Host "📤 Uploading game assets..." -ForegroundColor Yellow
    aws s3 sync assets/ "s3://$ASSETS_BUCKET/assets/" --delete
}

if (Test-Path "data") {
    Write-Host "📤 Uploading game data..." -ForegroundColor Yellow
    try {
        $DATA_BUCKET = (aws cloudformation describe-stacks --stack-name HarvestHopeStack --query "Stacks[0].Outputs[?OutputKey=='DataBucketName'].OutputValue" --output text 2>$null)
    } catch {
        $DATA_BUCKET = "harvest-hope-data"
    }
    aws s3 sync data/ "s3://$DATA_BUCKET/data/" --delete
}

# Step 6: Update frontend environment variables
Write-Host "🔧 Updating frontend environment variables..." -ForegroundColor Yellow
Set-Location frontend
@"
VITE_API_BASE_URL=$API_URL
VITE_ASSETS_BASE_URL=$CLOUDFRONT_URL
VITE_AWS_REGION=$AWS_REGION
VITE_NODE_ENV=production
VITE_ENABLE_ANALYTICS=true
VITE_ENABLE_ERROR_REPORTING=true
VITE_ENABLE_PERFORMANCE_MONITORING=true
VITE_GAME_VERSION=1.0.0
VITE_MAX_SAVE_SLOTS=5
VITE_AUTO_SAVE_INTERVAL=30000
"@ | Out-File -FilePath ".env.production" -Encoding UTF8

# Step 7: Build frontend
Write-Host "🏗️  Building frontend..." -ForegroundColor Yellow
npm install
npm run build

Write-Host "✅ Frontend built successfully!" -ForegroundColor Green

# Step 8: Instructions for Amplify deployment
Write-Host ""
Write-Host "🚀 Next Steps for Amplify Deployment:" -ForegroundColor Green
Write-Host "1. Go to AWS Amplify Console: https://console.aws.amazon.com/amplify/" -ForegroundColor White
Write-Host "2. Connect your GitHub repository" -ForegroundColor White
Write-Host "3. Use the amplify.yml build specification" -ForegroundColor White
Write-Host "4. Set the following environment variables in Amplify:" -ForegroundColor White
Write-Host "   VITE_API_BASE_URL=$API_URL" -ForegroundColor Cyan
Write-Host "   VITE_ASSETS_BASE_URL=$CLOUDFRONT_URL" -ForegroundColor Cyan
Write-Host "   VITE_AWS_REGION=$AWS_REGION" -ForegroundColor Cyan
Write-Host ""
Write-Host "📊 Monitor your deployment:" -ForegroundColor Green
Write-Host "   CloudWatch Dashboard: https://console.aws.amazon.com/cloudwatch/home?region=$AWS_REGION#dashboards:name=HarvestHope-Performance" -ForegroundColor Cyan
Write-Host ""
Write-Host "🌾 Harvest Hope deployment completed successfully! 🎉" -ForegroundColor Green