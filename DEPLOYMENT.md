# Harvest Hope Deployment Guide

This guide covers the complete deployment process for Harvest Hope: The Last Farm, including infrastructure setup, frontend deployment, and monitoring configuration.

## Prerequisites

Before deploying, ensure you have:

- AWS CLI configured with appropriate permissions
- Node.js 18+ installed
- AWS CDK CLI installed (`npm install -g aws-cdk`)
- Git repository set up (for Amplify deployment)

## Architecture Overview

The deployment consists of:

- **Frontend**: React app deployed via AWS Amplify
- **Backend**: Serverless Lambda functions with API Gateway
- **Database**: DynamoDB tables with proper indexing
- **Storage**: S3 buckets for assets and data
- **Monitoring**: CloudWatch dashboards and alarms
- **CDN**: CloudFront for asset delivery

## Quick Deployment

### Option 1: Automated Script (Recommended)

```bash
# Linux/macOS
./deploy.sh

# Windows PowerShell
.\deploy.ps1
```

### Option 2: Manual Deployment

Follow the step-by-step process below for more control.

## Step-by-Step Deployment

### 1. Infrastructure Deployment

```bash
# Navigate to infrastructure directory
cd infrastructure

# Install dependencies
npm install

# Bootstrap CDK (first time only)
cdk bootstrap

# Deploy infrastructure
cdk deploy --require-approval never
```

### 2. Frontend Configuration

After infrastructure deployment, update frontend environment variables:

```bash
# Get API Gateway URL from CDK outputs
API_URL=$(aws cloudformation describe-stacks --stack-name HarvestHopeStack --query "Stacks[0].Outputs[?OutputKey=='APIGatewayURL'].OutputValue" --output text)

# Update frontend/.env.production
cd frontend
cat > .env.production << EOF
VITE_API_BASE_URL=$API_URL
VITE_ASSETS_BASE_URL=https://your-cloudfront-domain.cloudfront.net
VITE_AWS_REGION=us-east-1
VITE_NODE_ENV=production
VITE_ENABLE_ANALYTICS=true
VITE_ENABLE_ERROR_REPORTING=true
VITE_ENABLE_PERFORMANCE_MONITORING=true
VITE_GAME_VERSION=1.0.0
VITE_MAX_SAVE_SLOTS=5
VITE_AUTO_SAVE_INTERVAL=30000
EOF
```

### 3. AWS Amplify Setup

1. **Connect Repository**:
   - Go to [AWS Amplify Console](https://console.aws.amazon.com/amplify/)
   - Click "New app" → "Host web app"
   - Connect your GitHub repository

2. **Configure Build Settings**:
   - Use the provided `amplify.yml` build specification
   - Set app root to `frontend`

3. **Environment Variables**:
   Set these in Amplify Console → App Settings → Environment Variables:
   ```
   VITE_API_BASE_URL=<your-api-gateway-url>
   VITE_ASSETS_BASE_URL=<your-cloudfront-url>
   VITE_AWS_REGION=<your-aws-region>
   VITE_NODE_ENV=production
   ```

4. **Deploy**:
   - Save and deploy
   - Amplify will automatically build and deploy on code changes

### 4. Upload Game Assets

```bash
# Upload sprites, audio, and other assets
aws s3 sync assets/ s3://your-assets-bucket/assets/ --delete

# Upload game data (IMD weather data, MSP rates, etc.)
aws s3 sync data/ s3://harvest-hope-data/data/ --delete
```

## Infrastructure Components

### DynamoDB Tables

| Table Name | Purpose | Indexes |
|------------|---------|---------|
| `harvest-hope-game-states` | Player save data | LastModifiedIndex |
| `harvest-hope-npc-templates` | NPC character templates | CrisisTypeIndex |
| `harvest-hope-market-data` | Crop price history | RegionDateIndex |
| `harvest-hope-player-stats` | Player statistics | ScoreIndex |
| `harvest-hope-loans` | Loan tracking | StatusIndex |
| `harvest-hope-government-schemes` | Scheme information | CategoryIndex |
| `harvest-hope-transactions` | Financial transactions | DateIndex |

### Lambda Functions

| Function | Purpose | Memory | Timeout | Concurrency |
|----------|---------|--------|---------|-------------|
| `harvest-hope-weather` | Weather predictions | 512MB | 30s | 10 |
| `harvest-hope-market` | Market simulation | 512MB | 30s | 10 |
| `harvest-hope-npc` | NPC generation | 1024MB | 60s | 5 |
| `harvest-hope-event` | Event generation | 1024MB | 60s | 5 |
| `harvest-hope-gamestate` | Save/load operations | 512MB | 30s | 20 |
| `harvest-hope-financial` | Financial calculations | 512MB | 30s | 15 |

### API Endpoints

- `POST /weather` - Generate weather predictions
- `POST /market` - Simulate crop prices
- `POST /npc` - Generate NPC characters
- `POST /events/generate` - Create random events
- `POST /events/resolve` - Resolve event outcomes
- `GET/POST/DELETE /gamestate/{playerId}` - Game state operations
- `POST /financial` - Financial calculations

## Monitoring and Logging

### CloudWatch Dashboard

Access the performance dashboard at:
```
https://console.aws.amazon.com/cloudwatch/home?region=<region>#dashboards:name=HarvestHope-Performance
```

### Key Metrics

- **Lambda Performance**: Duration, errors, invocations
- **API Gateway**: Request count, latency, error rates
- **DynamoDB**: Consumed capacity, throttling
- **Player Activity**: Active players, API requests

### Alarms

Configured alarms for:
- Lambda function errors (threshold: 5 errors in 2 periods)
- API Gateway latency (threshold: 5 seconds)
- API Gateway 4xx/5xx errors
- DynamoDB throttling

### Log Groups

All Lambda functions log to CloudWatch with 1-month retention:
- `/aws/lambda/harvest-hope-weather`
- `/aws/lambda/harvest-hope-market`
- `/aws/lambda/harvest-hope-npc`
- `/aws/lambda/harvest-hope-event`
- `/aws/lambda/harvest-hope-gamestate`
- `/aws/lambda/harvest-hope-financial`

## Security Configuration

### IAM Permissions

Lambda functions have minimal required permissions:
- DynamoDB: Read/write access to specific tables and indexes
- S3: Read/write access to game data and assets
- Bedrock: Invoke specific AI models
- CloudWatch: Create logs and metrics

### Data Encryption

- DynamoDB tables use AWS-managed encryption
- S3 buckets use server-side encryption
- API Gateway uses HTTPS only
- Lambda functions support X-Ray tracing

### CORS Configuration

API Gateway configured for cross-origin requests from Amplify domain.

## Performance Optimizations

### Lambda Optimizations

- Reserved concurrency to prevent cold starts
- Lambda Insights enabled for performance monitoring
- X-Ray tracing for request analysis
- Shared layer for common dependencies

### DynamoDB Optimizations

- Pay-per-request billing for cost efficiency
- Global Secondary Indexes for query patterns
- TTL configured for temporary data
- Point-in-time recovery enabled

### Frontend Optimizations

- CloudFront CDN for asset delivery
- Vite build optimization
- Asset preloading and caching
- Performance monitoring enabled

## Cost Optimization

### Expected Costs (Monthly)

- **Lambda**: $10-50 (based on usage)
- **DynamoDB**: $5-25 (pay-per-request)
- **API Gateway**: $3-15 (per million requests)
- **S3**: $1-5 (storage and transfer)
- **CloudFront**: $1-10 (CDN usage)
- **Amplify**: $1-5 (build minutes and hosting)

**Total Estimated**: $20-110/month for moderate usage

### Cost Reduction Tips

1. Use DynamoDB on-demand pricing for variable workloads
2. Enable S3 Intelligent Tiering for assets
3. Set up CloudWatch billing alarms
4. Use Lambda provisioned concurrency only if needed
5. Optimize Lambda memory allocation based on performance metrics

## Troubleshooting

### Common Issues

1. **CDK Bootstrap Errors**:
   ```bash
   cdk bootstrap --force
   ```

2. **Lambda Timeout Issues**:
   - Check CloudWatch logs
   - Increase timeout in CDK stack
   - Optimize function code

3. **DynamoDB Throttling**:
   - Check consumed capacity metrics
   - Optimize query patterns
   - Consider provisioned capacity

4. **Amplify Build Failures**:
   - Check build logs in Amplify console
   - Verify environment variables
   - Check Node.js version compatibility

### Debugging Commands

```bash
# Check CDK stack status
cdk list
cdk diff

# View CloudFormation events
aws cloudformation describe-stack-events --stack-name HarvestHopeStack

# Check Lambda function logs
aws logs tail /aws/lambda/harvest-hope-gamestate --follow

# Test API endpoints
curl -X POST https://your-api-url/weather -d '{"region":"maharashtra"}'
```

## Rollback Procedures

### Infrastructure Rollback

```bash
# Rollback CDK deployment
cdk deploy --rollback

# Or destroy and redeploy
cdk destroy
cdk deploy
```

### Frontend Rollback

In Amplify Console:
1. Go to App → Hosting → Build history
2. Select previous successful build
3. Click "Redeploy this version"

## Maintenance

### Regular Tasks

1. **Weekly**: Review CloudWatch metrics and alarms
2. **Monthly**: Check cost reports and optimize resources
3. **Quarterly**: Update dependencies and security patches
4. **Annually**: Review and update disaster recovery procedures

### Updates

1. **Code Updates**: Push to GitHub (auto-deploys via Amplify)
2. **Infrastructure Updates**: Modify CDK stack and redeploy
3. **Dependency Updates**: Update package.json and redeploy

## Support and Resources

- **AWS Documentation**: [AWS CDK Guide](https://docs.aws.amazon.com/cdk/)
- **Amplify Documentation**: [AWS Amplify Guide](https://docs.amplify.aws/)
- **CloudWatch Monitoring**: [CloudWatch User Guide](https://docs.aws.amazon.com/cloudwatch/)
- **Cost Management**: [AWS Cost Management](https://aws.amazon.com/aws-cost-management/)

For issues or questions, check the CloudWatch logs and metrics first, then consult the AWS documentation for specific services.