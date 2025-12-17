#!/bin/bash

# Harvest Hope Deployment Script
# This script deploys the complete Harvest Hope infrastructure and frontend

set -e

echo "🌾 Starting Harvest Hope Deployment..."

# Check if AWS CLI is configured
if ! aws sts get-caller-identity > /dev/null 2>&1; then
    echo "❌ AWS CLI not configured. Please run 'aws configure' first."
    exit 1
fi

# Check if CDK is installed
if ! command -v cdk &> /dev/null; then
    echo "❌ AWS CDK not found. Installing..."
    npm install -g aws-cdk
fi

# Get current AWS account and region
AWS_ACCOUNT=$(aws sts get-caller-identity --query Account --output text)
AWS_REGION=$(aws configure get region)

echo "📍 Deploying to Account: $AWS_ACCOUNT, Region: $AWS_REGION"

# Step 1: Bootstrap CDK (if not already done)
echo "🔧 Bootstrapping CDK..."
cd infrastructure
cdk bootstrap aws://$AWS_ACCOUNT/$AWS_REGION

# Step 2: Install dependencies
echo "📦 Installing infrastructure dependencies..."
npm install

# Step 3: Build and deploy CDK stack
echo "🏗️  Building and deploying infrastructure..."
npm run build
cdk deploy --require-approval never

# Step 4: Get outputs from CDK deployment
echo "📋 Retrieving deployment outputs..."
API_URL=$(aws cloudformation describe-stacks --stack-name HarvestHopeStack --query "Stacks[0].Outputs[?OutputKey=='APIGatewayURL'].OutputValue" --output text)
CLOUDFRONT_URL=$(aws cloudformation describe-stacks --stack-name HarvestHopeStack --query "Stacks[0].Outputs[?OutputKey=='CloudFrontURL'].OutputValue" --output text)
ASSETS_BUCKET=$(aws cloudformation describe-stacks --stack-name HarvestHopeStack --query "Stacks[0].Outputs[?OutputKey=='AssetsBucketName'].OutputValue" --output text)

echo "✅ Infrastructure deployed successfully!"
echo "🔗 API Gateway URL: $API_URL"
echo "🔗 CloudFront URL: $CLOUDFRONT_URL"
echo "🪣 Assets Bucket: $ASSETS_BUCKET"

# Step 5: Upload sample data and assets (if they exist)
cd ..
if [ -d "assets" ]; then
    echo "📤 Uploading game assets..."
    aws s3 sync assets/ s3://$ASSETS_BUCKET/assets/ --delete
fi

if [ -d "data" ]; then
    echo "📤 Uploading game data..."
    DATA_BUCKET=$(aws cloudformation describe-stacks --stack-name HarvestHopeStack --query "Stacks[0].Outputs[?OutputKey=='DataBucketName'].OutputValue" --output text 2>/dev/null || echo "harvest-hope-data")
    aws s3 sync data/ s3://$DATA_BUCKET/data/ --delete
fi

# Step 6: Update frontend environment variables
echo "🔧 Updating frontend environment variables..."
cd frontend
cat > .env.production << EOF
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
EOF

# Step 7: Build frontend
echo "🏗️  Building frontend..."
npm install
npm run build

echo "✅ Frontend built successfully!"

# Step 8: Instructions for Amplify deployment
echo ""
echo "🚀 Next Steps for Amplify Deployment:"
echo "1. Go to AWS Amplify Console: https://console.aws.amazon.com/amplify/"
echo "2. Connect your GitHub repository"
echo "3. Use the amplify.yml build specification"
echo "4. Set the following environment variables in Amplify:"
echo "   VITE_API_BASE_URL=$API_URL"
echo "   VITE_ASSETS_BASE_URL=$CLOUDFRONT_URL"
echo "   VITE_AWS_REGION=$AWS_REGION"
echo ""
echo "📊 Monitor your deployment:"
echo "   CloudWatch Dashboard: https://console.aws.amazon.com/cloudwatch/home?region=$AWS_REGION#dashboards:name=HarvestHope-Performance"
echo ""
echo "🌾 Harvest Hope deployment completed successfully! 🎉"