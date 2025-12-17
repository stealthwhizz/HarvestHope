#!/bin/bash

# Harvest Hope Weather Predictor Lambda Deployment Script

echo "🌦️ Deploying Harvest Hope Weather Predictor Lambda..."

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Create deployment package
echo "📦 Creating deployment package..."
zip -r weather-predictor.zip . -x "*.git*" "deploy.sh" "README.md"

# Deploy to AWS Lambda
echo "🚀 Deploying to AWS Lambda..."
aws lambda update-function-code \
    --function-name harvest-hope-weather-predictor \
    --zip-file fileb://weather-predictor.zip

# Update function configuration
echo "⚙️ Updating function configuration..."
aws lambda update-function-configuration \
    --function-name harvest-hope-weather-predictor \
    --timeout 30 \
    --memory-size 512 \
    --environment Variables='{
        "AWS_REGION":"us-east-1",
        "NODE_ENV":"production"
    }'

# Add Bedrock permissions
echo "🔐 Adding Bedrock permissions..."
aws lambda add-permission \
    --function-name harvest-hope-weather-predictor \
    --statement-id bedrock-invoke \
    --action lambda:InvokeFunction \
    --principal bedrock.amazonaws.com

echo "✅ Weather Predictor Lambda deployed successfully!"
echo "🔗 Function ARN: $(aws lambda get-function --function-name harvest-hope-weather-predictor --query 'Configuration.FunctionArn' --output text)"