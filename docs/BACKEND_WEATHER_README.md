# 🌦️ Harvest Hope Weather Predictor

AWS Lambda function powered by Bedrock Claude 3.5 Sonnet for AI-driven agricultural weather predictions.

## 🎯 Features

- **AI-Powered Predictions**: Uses AWS Bedrock Claude 3.5 Sonnet for intelligent weather forecasting
- **Indian Agriculture Focus**: Specialized prompts for Indian monsoon patterns and farming seasons
- **Regional Awareness**: Considers specific Indian regions (Maharashtra, Punjab, etc.)
- **Farming Advisory**: Provides actionable advice for farmers based on weather conditions
- **Fallback System**: Graceful degradation when AI service is unavailable

## 🏗️ Architecture

```
Frontend (React) → API Gateway → Lambda Function → AWS Bedrock → Claude 3.5 Sonnet
```

## 📋 Prerequisites

1. **AWS Account** with Bedrock access
2. **AWS CLI** configured with appropriate permissions
3. **Node.js 18+** for Lambda runtime
4. **Bedrock Model Access**: Enable Claude 3.5 Sonnet in your AWS region

## 🚀 Deployment

### 1. Enable Bedrock Model Access

```bash
# Request access to Claude 3.5 Sonnet in AWS Console
# Go to: AWS Bedrock → Model Access → Request Access
```

### 2. Create Lambda Function

```bash
# Create the Lambda function
aws lambda create-function \
    --function-name harvest-hope-weather-predictor \
    --runtime nodejs18.x \
    --role arn:aws:iam::YOUR-ACCOUNT:role/lambda-bedrock-role \
    --handler weather-predictor.handler \
    --zip-file fileb://weather-predictor.zip \
    --timeout 30 \
    --memory-size 512
```

### 3. Deploy Code

```bash
# Make deployment script executable
chmod +x deploy.sh

# Deploy the function
./deploy.sh
```

### 4. Create API Gateway

```bash
# Create REST API
aws apigateway create-rest-api --name harvest-hope-weather-api

# Create resource and method
# Configure CORS for frontend access
```

## 🔐 IAM Permissions

The Lambda function requires these permissions:

```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Action": [
                "bedrock:InvokeModel"
            ],
            "Resource": "arn:aws:bedrock:*:*:model/anthropic.claude-3-5-sonnet-*"
        },
        {
            "Effect": "Allow",
            "Action": [
                "logs:CreateLogGroup",
                "logs:CreateLogStream",
                "logs:PutLogEvents"
            ],
            "Resource": "arn:aws:logs:*:*:*"
        }
    ]
}
```

## 📊 API Usage

### Request Format

```json
{
    "region": "Maharashtra",
    "season": "Kharif",
    "day": 45,
    "currentWeather": "sunny"
}
```

### Response Format

```json
{
    "success": true,
    "data": {
        "forecast": [
            {
                "day": 1,
                "date": "Day 46",
                "condition": "heavy_rain",
                "icon": "🌧️",
                "temperature": {"min": 24, "max": 28},
                "rainfall": 45,
                "humidity": 85,
                "advisory": "Heavy monsoon rain expected. Avoid field operations."
            }
        ],
        "summary": "Southwest monsoon active over Maharashtra. Expect good rainfall for Kharif crops.",
        "farming_tips": [
            "Ensure proper drainage in rice fields",
            "Monitor for pest outbreaks due to high humidity"
        ]
    },
    "region": "Maharashtra",
    "season": "Kharif",
    "day": 45,
    "generatedAt": "2024-12-17T12:00:00.000Z"
}
```

## 🌾 Agricultural Context

### Indian Farming Seasons

- **Kharif** (June-October): Monsoon crops (rice, cotton, sugarcane)
- **Rabi** (November-April): Winter crops (wheat, mustard, peas)
- **Zaid** (April-June): Summer crops (fodder, vegetables)

### Regional Considerations

- **Maharashtra**: Western Ghats influence, varied rainfall patterns
- **Punjab**: Wheat belt, irrigation-dependent agriculture
- **Tamil Nadu**: Distinct monsoon patterns, rice cultivation
- **Rajasthan**: Arid climate, water conservation focus

## 🧪 Testing

```bash
# Test the Lambda function locally
npm test

# Test with sample payload
aws lambda invoke \
    --function-name harvest-hope-weather-predictor \
    --payload '{"region":"Maharashtra","season":"Kharif","day":45}' \
    response.json
```

## 📈 Monitoring

- **CloudWatch Logs**: Function execution logs
- **CloudWatch Metrics**: Invocation count, duration, errors
- **X-Ray Tracing**: Request tracing (if enabled)

## 💰 Cost Optimization

- **Bedrock Pricing**: ~$0.003 per 1K input tokens, ~$0.015 per 1K output tokens
- **Lambda Pricing**: ~$0.0000166667 per GB-second
- **Expected Cost**: ~$0.01-0.05 per weather prediction

## 🔧 Configuration

### Environment Variables

- `AWS_REGION`: AWS region for Bedrock service
- `NODE_ENV`: Environment (production/development)

### Model Configuration

- **Model**: `anthropic.claude-3-5-sonnet-20241022-v2:0`
- **Temperature**: 0.3 (for consistent weather data)
- **Max Tokens**: 2000
- **Timeout**: 30 seconds

## 🐛 Troubleshooting

### Common Issues

1. **Bedrock Access Denied**
   - Ensure model access is enabled in AWS Console
   - Check IAM permissions for bedrock:InvokeModel

2. **Lambda Timeout**
   - Increase timeout to 30+ seconds
   - Monitor CloudWatch logs for performance

3. **Invalid JSON Response**
   - AI responses are parsed and validated
   - Fallback data provided if parsing fails

### Debug Mode

Enable debug logging by setting `NODE_ENV=development`:

```javascript
console.log('Debug: AI Response:', aiResponse);
```

## 📚 Resources

- [AWS Bedrock Documentation](https://docs.aws.amazon.com/bedrock/)
- [Claude 3.5 Sonnet Model Guide](https://docs.anthropic.com/claude/docs)
- [Indian Meteorological Department](https://mausam.imd.gov.in/)
- [Agricultural Weather Advisory](https://www.imd.gov.in/pages/agrimet_new.php)