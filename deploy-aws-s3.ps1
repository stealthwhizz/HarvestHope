# Deploy Harvest Hope to AWS S3 + CloudFront
# PowerShell deployment script

param(
    [string]$BucketName = "harvest-hope-game",
    [string]$Region = "us-east-1",
    [string]$DistributionId = "",
    [switch]$CreateBucket = $false,
    [switch]$Help = $false
)

if ($Help) {
    Write-Host "🚀 AWS S3 + CloudFront Deployment Script" -ForegroundColor Green
    Write-Host ""
    Write-Host "Usage:" -ForegroundColor Yellow
    Write-Host "  .\deploy-aws-s3.ps1 [-BucketName <name>] [-Region <region>] [-DistributionId <id>] [-CreateBucket]" -ForegroundColor White
    Write-Host ""
    Write-Host "Parameters:" -ForegroundColor Yellow
    Write-Host "  -BucketName      S3 bucket name (default: harvest-hope-game)" -ForegroundColor White
    Write-Host "  -Region          AWS region (default: us-east-1)" -ForegroundColor White
    Write-Host "  -DistributionId  CloudFront distribution ID (optional)" -ForegroundColor White
    Write-Host "  -CreateBucket    Create S3 bucket if it doesn't exist" -ForegroundColor White
    Write-Host "  -Help            Show this help message" -ForegroundColor White
    Write-Host ""
    Write-Host "Examples:" -ForegroundColor Yellow
    Write-Host "  .\deploy-aws-s3.ps1 -CreateBucket" -ForegroundColor White
    Write-Host "  .\deploy-aws-s3.ps1 -BucketName my-game-bucket -DistributionId E1234567890ABC" -ForegroundColor White
    exit 0
}

Write-Host "🚀 Deploying Harvest Hope to AWS S3 + CloudFront..." -ForegroundColor Green

# Check prerequisites
Write-Host "🔍 Checking prerequisites..." -ForegroundColor Cyan

# Check if AWS CLI is installed
try {
    $awsVersion = aws --version 2>$null
    Write-Host "✅ AWS CLI found: $awsVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ AWS CLI not found! Please install AWS CLI first." -ForegroundColor Red
    Write-Host "   Download from: https://aws.amazon.com/cli/" -ForegroundColor Yellow
    exit 1
}

# Check if AWS is configured
try {
    $awsIdentity = aws sts get-caller-identity 2>$null | ConvertFrom-Json
    Write-Host "✅ AWS configured for account: $($awsIdentity.Account)" -ForegroundColor Green
} catch {
    Write-Host "❌ AWS not configured! Please run 'aws configure' first." -ForegroundColor Red
    exit 1
}

# Check if we're in the right directory
if (-not (Test-Path "frontend/package.json")) {
    Write-Host "❌ Error: Please run this script from the project root directory" -ForegroundColor Red
    exit 1
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
$env:VITE_API_BASE_URL = "https://api.harvesthope.app"
npm run build

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Build failed!" -ForegroundColor Red
    Set-Location ..
    exit 1
}

Write-Host "✅ Build successful!" -ForegroundColor Green
Set-Location ..

# Create S3 bucket if requested
if ($CreateBucket) {
    Write-Host "🪣 Creating S3 bucket: $BucketName..." -ForegroundColor Cyan
    
    # Create bucket
    aws s3 mb "s3://$BucketName" --region $Region
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Bucket created successfully!" -ForegroundColor Green
        
        # Enable static website hosting
        Write-Host "🌐 Enabling static website hosting..." -ForegroundColor Cyan
        aws s3 website "s3://$BucketName" --index-document index.html --error-document index.html
        
        # Create and apply bucket policy
        $bucketPolicy = @"
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "PublicReadGetObject",
      "Effect": "Allow",
      "Principal": "*",
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::$BucketName/*"
    }
  ]
}
"@
        
        $bucketPolicy | Out-File -FilePath "temp-bucket-policy.json" -Encoding UTF8
        aws s3api put-bucket-policy --bucket $BucketName --policy file://temp-bucket-policy.json
        Remove-Item "temp-bucket-policy.json"
        
        Write-Host "✅ Bucket policy applied!" -ForegroundColor Green
    } else {
        Write-Host "⚠️  Bucket might already exist or creation failed" -ForegroundColor Yellow
    }
}

# Deploy to S3
Write-Host "📤 Deploying to S3 bucket: $BucketName..." -ForegroundColor Cyan

# Deploy static assets with long cache
Write-Host "📁 Uploading static assets..." -ForegroundColor Cyan
aws s3 sync frontend/dist/ "s3://$BucketName" --delete --cache-control "public, max-age=31536000, immutable" --exclude "*.html" --exclude "*.json" --exclude "*.txt" --exclude "*.xml"

# Deploy HTML and config files with short cache
Write-Host "📄 Uploading HTML and config files..." -ForegroundColor Cyan
aws s3 sync frontend/dist/ "s3://$BucketName" --cache-control "public, max-age=300, must-revalidate" --include "*.html" --include "*.json" --include "*.txt" --include "*.xml"

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ S3 deployment failed!" -ForegroundColor Red
    exit 1
}

Write-Host "✅ S3 deployment successful!" -ForegroundColor Green

# Get S3 website URL
$s3WebsiteUrl = "http://$BucketName.s3-website-$Region.amazonaws.com"
Write-Host "🔗 S3 Website URL: $s3WebsiteUrl" -ForegroundColor Cyan

# Invalidate CloudFront if distribution ID provided
if ($DistributionId) {
    Write-Host "🔄 Invalidating CloudFront cache..." -ForegroundColor Cyan
    aws cloudfront create-invalidation --distribution-id $DistributionId --paths "/*"
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ CloudFront invalidation initiated!" -ForegroundColor Green
        
        # Get CloudFront URL
        $distributionInfo = aws cloudfront get-distribution --id $DistributionId | ConvertFrom-Json
        $cloudfrontUrl = "https://$($distributionInfo.Distribution.DomainName)"
        Write-Host "🔗 CloudFront URL: $cloudfrontUrl" -ForegroundColor Cyan
    } else {
        Write-Host "⚠️  CloudFront invalidation failed" -ForegroundColor Yellow
    }
}

Write-Host ""
Write-Host "🎉 Deployment completed successfully!" -ForegroundColor Green
Write-Host ""
Write-Host "📋 Deployment Summary:" -ForegroundColor Yellow
Write-Host "  S3 Bucket: $BucketName" -ForegroundColor White
Write-Host "  Region: $Region" -ForegroundColor White
Write-Host "  S3 URL: $s3WebsiteUrl" -ForegroundColor White
if ($DistributionId) {
    Write-Host "  CloudFront ID: $DistributionId" -ForegroundColor White
    Write-Host "  CloudFront URL: $cloudfrontUrl" -ForegroundColor White
}
Write-Host ""
Write-Host "⏱️  Note: CloudFront updates may take 5-15 minutes to propagate globally." -ForegroundColor Yellow

# Show next steps if no CloudFront
if (-not $DistributionId) {
    Write-Host ""
    Write-Host "📋 Next Steps (Optional):" -ForegroundColor Yellow
    Write-Host "1. Create CloudFront distribution for better performance" -ForegroundColor White
    Write-Host "2. Configure custom domain with Route 53" -ForegroundColor White
    Write-Host "3. Set up SSL certificate with ACM" -ForegroundColor White
    Write-Host ""
    Write-Host "💡 See docs/DEPLOYMENT_AWS_S3.md for detailed CloudFront setup" -ForegroundColor Cyan
}