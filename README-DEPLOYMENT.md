# Harvest Hope: Deployment Guide

## Quick Start

### 1. Prerequisites
```bash
# Install AWS CLI
curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
unzip awscliv2.zip
sudo ./aws/install

# Configure AWS CLI
aws configure

# Install AWS CDK
npm install -g aws-cdk

# Verify installation
aws --version
cdk --version
```

### 2. Deploy Infrastructure
```bash
# Clone repository
git clone <your-repo-url>
cd harvest-hope

# Deploy everything
./deploy.sh
```

### 3. Verify Deployment
```bash
# Run health checks
./scripts/health-check.sh
```

## Manual Deployment Steps

### Step 1: Infrastructure
```bash
cd infrastructure
npm install
cdk bootstrap
cdk deploy
```

### Step 2: Frontend
```bash
cd frontend
npm install
npm run build

# Deploy to Amplify (see DEPLOYMENT.md for details)
```

### Step 3: Monitoring
```bash
# Check CloudWatch Dashboard
# https://console.aws.amazon.com/cloudwatch/home#dashboards:name=HarvestHope-Performance
```

## Environment Variables

### Production Frontend (.env.production)
```env
VITE_API_BASE_URL=https://your-api-gateway-url
VITE_ASSETS_BASE_URL=https://your-cloudfront-url
VITE_AWS_REGION=us-east-1
VITE_NODE_ENV=production
VITE_ENABLE_ANALYTICS=true
VITE_ENABLE_ERROR_REPORTING=true
VITE_ENABLE_PERFORMANCE_MONITORING=true
VITE_GAME_VERSION=1.0.0
VITE_MAX_SAVE_SLOTS=5
VITE_AUTO_SAVE_INTERVAL=30000
```

### Lambda Environment Variables (Auto-configured)
- `GAME_STATES_TABLE`: DynamoDB table for game saves
- `MARKET_DATA_TABLE`: DynamoDB table for market data
- `NPC_TEMPLATES_TABLE`: DynamoDB table for NPC templates
- `DATA_BUCKET`: S3 bucket for game data
- `LOG_LEVEL`: Logging level (INFO/DEBUG)

## Infrastructure Components

### AWS Services Used
- **AWS Amplify**: Frontend hosting and CI/CD
- **AWS Lambda**: Serverless backend functions
- **Amazon DynamoDB**: NoSQL database for game data
- **Amazon S3**: Object storage for assets and data
- **Amazon CloudFront**: CDN for asset delivery
- **Amazon API Gateway**: REST API management
- **Amazon CloudWatch**: Monitoring and logging
- **AWS Bedrock**: AI model integration

### Cost Estimation
- **Development**: $20-50/month
- **Production (low traffic)**: $50-150/month
- **Production (high traffic)**: $200-500/month

## Monitoring and Alerts

### CloudWatch Dashboard
Monitor key metrics:
- Lambda function performance
- API Gateway latency and errors
- DynamoDB capacity utilization
- Player activity metrics

### Alarms Configured
- Lambda function errors (>5 in 10 minutes)
- API Gateway latency (>5 seconds)
- API Gateway error rates (4xx/5xx)
- DynamoDB throttling

### Log Analysis
```bash
# View Lambda logs
aws logs tail /aws/lambda/harvest-hope-weather --follow
aws logs tail /aws/lambda/harvest-hope-market --follow
aws logs tail /aws/lambda/harvest-hope-npc --follow
```

## Troubleshooting

### Common Issues

1. **CDK Bootstrap Error**
   ```bash
   cdk bootstrap --force
   ```

2. **Lambda Timeout**
   - Check CloudWatch logs
   - Increase timeout in CDK stack
   - Optimize function code

3. **DynamoDB Throttling**
   - Monitor consumed capacity
   - Optimize query patterns
   - Consider provisioned capacity

4. **API Gateway CORS Issues**
   - Verify CORS configuration in CDK
   - Check preflight requests

### Health Check Commands
```bash
# Full system health check
./scripts/health-check.sh

# Check specific components
aws cloudformation describe-stacks --stack-name HarvestHopeStack
aws lambda list-functions --query 'Functions[?starts_with(FunctionName, `harvest-hope`)]'
aws dynamodb list-tables --query 'TableNames[?starts_with(@, `harvest-hope`)]'
```

## Security Best Practices

### IAM Permissions
- Lambda functions have minimal required permissions
- DynamoDB access limited to specific tables
- S3 access restricted to game buckets
- Bedrock access limited to specific models

### Data Protection
- DynamoDB encryption at rest
- S3 server-side encryption
- API Gateway HTTPS only
- CloudWatch log encryption

### Network Security
- API Gateway throttling enabled
- CloudFront security headers
- CORS properly configured
- No public database access

## Performance Optimization

### Lambda Optimizations
- Reserved concurrency to prevent cold starts
- Appropriate memory allocation
- Connection pooling for DynamoDB
- Efficient error handling

### DynamoDB Optimizations
- Pay-per-request billing for variable workloads
- Global Secondary Indexes for query patterns
- TTL for temporary data
- Batch operations where possible

### Frontend Optimizations
- CloudFront CDN for global delivery
- Asset compression and caching
- Code splitting and lazy loading
- Performance monitoring enabled

## Backup and Recovery

### Automated Backups
- DynamoDB point-in-time recovery enabled
- S3 versioning for critical assets
- CloudFormation stack templates stored

### Disaster Recovery
1. **Infrastructure**: Redeploy CDK stack
2. **Data**: Restore from DynamoDB backups
3. **Assets**: Restore from S3 versioning
4. **Frontend**: Redeploy from Git repository

## Maintenance

### Regular Tasks
- **Weekly**: Review CloudWatch metrics
- **Monthly**: Update dependencies
- **Quarterly**: Security audit
- **Annually**: Cost optimization review

### Updates
```bash
# Update infrastructure
cd infrastructure
npm update
cdk diff
cdk deploy

# Update frontend
cd frontend
npm update
npm run build
# Redeploy via Amplify
```

## Support

### Documentation
- [AWS CDK Documentation](https://docs.aws.amazon.com/cdk/)
- [AWS Amplify Documentation](https://docs.amplify.aws/)
- [DynamoDB Best Practices](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/best-practices.html)

### Monitoring URLs
- CloudWatch Dashboard: `https://console.aws.amazon.com/cloudwatch/home#dashboards:name=HarvestHope-Performance`
- Lambda Functions: `https://console.aws.amazon.com/lambda/home#/functions`
- DynamoDB Tables: `https://console.aws.amazon.com/dynamodb/home#tables:`
- API Gateway: `https://console.aws.amazon.com/apigateway/home#/apis`

### Emergency Contacts
- AWS Support: [AWS Support Center](https://console.aws.amazon.com/support/)
- Development Team: [Your team contact information]

---

For detailed deployment instructions, see [DEPLOYMENT.md](./DEPLOYMENT.md)