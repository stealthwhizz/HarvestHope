#!/bin/bash

# Harvest Hope Health Check Script
# This script validates the deployment and checks system health

set -e

echo "🏥 Starting Harvest Hope Health Check..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Counters
PASSED=0
FAILED=0

# Function to check status
check_status() {
    if [ $1 -eq 0 ]; then
        echo -e "${GREEN}✅ $2${NC}"
        ((PASSED++))
    else
        echo -e "${RED}❌ $2${NC}"
        ((FAILED++))
    fi
}

# Function to check optional status
check_optional() {
    if [ $1 -eq 0 ]; then
        echo -e "${GREEN}✅ $2${NC}"
        ((PASSED++))
    else
        echo -e "${YELLOW}⚠️  $2 (Optional)${NC}"
    fi
}

echo "🔍 Checking AWS Configuration..."

# Check AWS CLI
aws sts get-caller-identity > /dev/null 2>&1
check_status $? "AWS CLI configured and authenticated"

# Get AWS account and region
AWS_ACCOUNT=$(aws sts get-caller-identity --query Account --output text 2>/dev/null)
AWS_REGION=$(aws configure get region 2>/dev/null)

echo "📍 Account: $AWS_ACCOUNT, Region: $AWS_REGION"

echo ""
echo "🏗️  Checking Infrastructure..."

# Check CloudFormation stack
aws cloudformation describe-stacks --stack-name HarvestHopeStack > /dev/null 2>&1
check_status $? "CloudFormation stack exists and is healthy"

if [ $? -eq 0 ]; then
    # Get stack outputs
    API_URL=$(aws cloudformation describe-stacks --stack-name HarvestHopeStack --query "Stacks[0].Outputs[?OutputKey=='APIGatewayURL'].OutputValue" --output text 2>/dev/null)
    CLOUDFRONT_URL=$(aws cloudformation describe-stacks --stack-name HarvestHopeStack --query "Stacks[0].Outputs[?OutputKey=='CloudFrontURL'].OutputValue" --output text 2>/dev/null)
    ASSETS_BUCKET=$(aws cloudformation describe-stacks --stack-name HarvestHopeStack --query "Stacks[0].Outputs[?OutputKey=='AssetsBucketName'].OutputValue" --output text 2>/dev/null)
    
    echo "🔗 API Gateway URL: $API_URL"
    echo "🔗 CloudFront URL: $CLOUDFRONT_URL"
    echo "🪣 Assets Bucket: $ASSETS_BUCKET"
fi

echo ""
echo "🗄️  Checking DynamoDB Tables..."

# Check DynamoDB tables
TABLES=("harvest-hope-game-states" "harvest-hope-npc-templates" "harvest-hope-market-data" "harvest-hope-player-stats" "harvest-hope-loans" "harvest-hope-government-schemes" "harvest-hope-transactions")

for table in "${TABLES[@]}"; do
    aws dynamodb describe-table --table-name $table > /dev/null 2>&1
    check_status $? "DynamoDB table: $table"
done

echo ""
echo "⚡ Checking Lambda Functions..."

# Check Lambda functions
FUNCTIONS=("harvest-hope-weather" "harvest-hope-market" "harvest-hope-npc" "harvest-hope-event" "harvest-hope-gamestate" "harvest-hope-financial")

for function in "${FUNCTIONS[@]}"; do
    aws lambda get-function --function-name $function > /dev/null 2>&1
    check_status $? "Lambda function: $function"
done

echo ""
echo "🌐 Checking API Gateway..."

if [ ! -z "$API_URL" ]; then
    # Test API Gateway health
    curl -s -o /dev/null -w "%{http_code}" "$API_URL" | grep -q "403\|200"
    check_status $? "API Gateway is responding"
    
    # Test specific endpoints (if they have health checks)
    # Note: These might return 400/405 for GET requests, which is expected
    for endpoint in "weather" "market" "npc" "events/generate" "financial"; do
        HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$API_URL$endpoint" 2>/dev/null)
        if [[ "$HTTP_CODE" =~ ^[2-5][0-9][0-9]$ ]]; then
            check_status 0 "API endpoint /$endpoint is accessible"
        else
            check_status 1 "API endpoint /$endpoint is not accessible (HTTP $HTTP_CODE)"
        fi
    done
fi

echo ""
echo "🪣 Checking S3 Buckets..."

# Check S3 buckets
if [ ! -z "$ASSETS_BUCKET" ]; then
    aws s3 ls s3://$ASSETS_BUCKET > /dev/null 2>&1
    check_status $? "S3 Assets bucket is accessible"
fi

aws s3 ls s3://harvest-hope-data > /dev/null 2>&1
check_optional $? "S3 Data bucket is accessible"

aws s3 ls s3://harvest-hope-configs > /dev/null 2>&1
check_optional $? "S3 Configs bucket is accessible"

echo ""
echo "📊 Checking CloudWatch..."

# Check CloudWatch dashboard
aws cloudwatch get-dashboard --dashboard-name HarvestHope-Performance > /dev/null 2>&1
check_status $? "CloudWatch dashboard exists"

# Check log groups
for function in "${FUNCTIONS[@]}"; do
    aws logs describe-log-groups --log-group-name-prefix "/aws/lambda/$function" | grep -q "$function"
    check_status $? "Log group for $function exists"
done

echo ""
echo "🚨 Checking CloudWatch Alarms..."

# Check alarms
ALARMS=("WeatherServiceErrors" "MarketServiceErrors" "NPCServiceErrors" "GameStateServiceErrors" "APILatencyAlarm" "API4xxErrors" "API5xxErrors")

for alarm in "${ALARMS[@]}"; do
    aws cloudwatch describe-alarms --alarm-names "HarvestHopeStack-$alarm" > /dev/null 2>&1
    check_status $? "CloudWatch alarm: $alarm"
done

echo ""
echo "🔍 Checking Amplify (Optional)..."

# Check Amplify app (optional)
aws amplify list-apps | grep -q "harvest-hope-frontend"
check_optional $? "Amplify app exists"

echo ""
echo "🧪 Running Basic Functionality Tests..."

if [ ! -z "$API_URL" ]; then
    # Test weather endpoint with POST
    WEATHER_RESPONSE=$(curl -s -X POST "$API_URL/weather" \
        -H "Content-Type: application/json" \
        -d '{"region":"maharashtra","season":"kharif"}' \
        -w "%{http_code}" -o /tmp/weather_response.json 2>/dev/null)
    
    if [[ "$WEATHER_RESPONSE" =~ ^[2][0-9][0-9]$ ]]; then
        check_status 0 "Weather API functional test"
    else
        check_status 1 "Weather API functional test (HTTP $WEATHER_RESPONSE)"
    fi
    
    # Test market endpoint with POST
    MARKET_RESPONSE=$(curl -s -X POST "$API_URL/market" \
        -H "Content-Type: application/json" \
        -d '{"crop":"rice","region":"maharashtra"}' \
        -w "%{http_code}" -o /tmp/market_response.json 2>/dev/null)
    
    if [[ "$MARKET_RESPONSE" =~ ^[2][0-9][0-9]$ ]]; then
        check_status 0 "Market API functional test"
    else
        check_status 1 "Market API functional test (HTTP $MARKET_RESPONSE)"
    fi
fi

echo ""
echo "📈 Performance Check..."

if [ ! -z "$API_URL" ]; then
    # Check API response time
    RESPONSE_TIME=$(curl -s -o /dev/null -w "%{time_total}" "$API_URL" 2>/dev/null)
    if (( $(echo "$RESPONSE_TIME < 2.0" | bc -l) )); then
        check_status 0 "API response time acceptable ($RESPONSE_TIME seconds)"
    else
        check_status 1 "API response time too slow ($RESPONSE_TIME seconds)"
    fi
fi

echo ""
echo "📋 Health Check Summary"
echo "======================"
echo -e "${GREEN}Passed: $PASSED${NC}"
echo -e "${RED}Failed: $FAILED${NC}"

if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}🎉 All critical checks passed! Harvest Hope is healthy.${NC}"
    exit 0
else
    echo -e "${RED}⚠️  Some checks failed. Please review the issues above.${NC}"
    exit 1
fi