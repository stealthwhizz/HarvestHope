# ☁️ AWS S3 + CloudFront Deployment Guide

## 📋 Overview

Deploy Harvest Hope to AWS S3 with CloudFront CDN for global, high-performance hosting with custom domain support.

## 🏗️ Architecture

```
User → CloudFront CDN → S3 Bucket → Static Files
                    ↓
              Route 53 (Custom Domain)
```

## 🔧 Prerequisites

- ✅ AWS Account with appropriate permissions
- ✅ AWS CLI installed and configured
- ✅ Production build working locally
- ✅ Domain name (optional, for custom domain)

## 🚀 Method 1: AWS CLI Deployment (Recommended)

### Step 1: Install AWS CLI

```bash
# Windows (using Chocolatey)
choco install awscli

# macOS (using Homebrew)
brew install awscli

# Linux (using pip)
pip install awscli

# Verify installation
aws --version
```

### Step 2: Configure AWS CLI

```bash
aws configure
# AWS Access Key ID: your-access-key
# AWS Secret Access Key: your-secret-key
# Default region name: us-east-1
# Default output format: json
```

### Step 3: Create S3 Bucket

```bash
# Create bucket (replace with your unique bucket name)
aws s3 mb s3://harvest-hope-game --region us-east-1

# Enable static website hosting
aws s3 website s3://harvest-hope-game \
  --index-document index.html \
  --error-document index.html
```

### Step 4: Configure Bucket Policy

Create `s3-bucket-policy.json`:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "PublicReadGetObject",
      "Effect": "Allow",
      "Principal": "*",
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::harvest-hope-game/*"
    }
  ]
}
```

Apply the policy:

```bash
aws s3api put-bucket-policy \
  --bucket harvest-hope-game \
  --policy file://s3-bucket-policy.json
```

### Step 5: Build and Deploy

```bash
# Build the application
cd frontend
npm run build

# Deploy to S3
aws s3 sync dist/ s3://harvest-hope-game \
  --delete \
  --cache-control "public, max-age=31536000" \
  --exclude "*.html" \
  --exclude "*.json"

# Deploy HTML files with shorter cache
aws s3 sync dist/ s3://harvest-hope-game \
  --delete \
  --cache-control "public, max-age=0, must-revalidate" \
  --include "*.html" \
  --include "*.json"
```

## 🌐 Method 2: CloudFront CDN Setup

### Step 1: Create CloudFront Distribution

Create `cloudfront-config.json`:

```json
{
  "CallerReference": "harvest-hope-2024-12-19",
  "Comment": "Harvest Hope Game CDN",
  "DefaultRootObject": "index.html",
  "Origins": {
    "Quantity": 1,
    "Items": [
      {
        "Id": "S3-harvest-hope-game",
        "DomainName": "harvest-hope-game.s3.amazonaws.com",
        "S3OriginConfig": {
          "OriginAccessIdentity": ""
        }
      }
    ]
  },
  "DefaultCacheBehavior": {
    "TargetOriginId": "S3-harvest-hope-game",
    "ViewerProtocolPolicy": "redirect-to-https",
    "TrustedSigners": {
      "Enabled": false,
      "Quantity": 0
    },
    "ForwardedValues": {
      "QueryString": false,
      "Cookies": {
        "Forward": "none"
      }
    },
    "MinTTL": 0,
    "DefaultTTL": 86400,
    "MaxTTL": 31536000
  },
  "Enabled": true,
  "PriceClass": "PriceClass_100"
}
```

Create distribution:

```bash
aws cloudfront create-distribution \
  --distribution-config file://cloudfront-config.json
```

### Step 2: Configure Custom Error Pages

```bash
# Update distribution for SPA routing
aws cloudfront update-distribution \
  --id YOUR_DISTRIBUTION_ID \
  --distribution-config '{
    "CustomErrorResponses": {
      "Quantity": 1,
      "Items": [
        {
          "ErrorCode": 404,
          "ResponsePagePath": "/index.html",
          "ResponseCode": "200",
          "ErrorCachingMinTTL": 300
        }
      ]
    }
  }'
```

## 🔧 Method 3: AWS CDK Deployment

### Step 1: Install AWS CDK

```bash
npm install -g aws-cdk
cdk --version
```

### Step 2: Create CDK Stack

Create `infrastructure/harvest-hope-stack.ts`:

```typescript
import * as cdk from 'aws-cdk-lib';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as origins from 'aws-cdk-lib/aws-cloudfront-origins';
import * as s3deploy from 'aws-cdk-lib/aws-s3-deployment';
import { Construct } from 'constructs';

export class HarvestHopeStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // S3 Bucket for static website
    const websiteBucket = new s3.Bucket(this, 'HarvestHopeBucket', {
      bucketName: 'harvest-hope-game',
      websiteIndexDocument: 'index.html',
      websiteErrorDocument: 'index.html',
      publicReadAccess: true,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
    });

    // CloudFront Distribution
    const distribution = new cloudfront.Distribution(this, 'HarvestHopeDistribution', {
      defaultBehavior: {
        origin: new origins.S3Origin(websiteBucket),
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        cachePolicy: cloudfront.CachePolicy.CACHING_OPTIMIZED,
      },
      defaultRootObject: 'index.html',
      errorResponses: [
        {
          httpStatus: 404,
          responseHttpStatus: 200,
          responsePagePath: '/index.html',
          ttl: cdk.Duration.minutes(5),
        },
      ],
    });

    // Deploy website files
    new s3deploy.BucketDeployment(this, 'DeployWebsite', {
      sources: [s3deploy.Source.asset('../frontend/dist')],
      destinationBucket: websiteBucket,
      distribution,
      distributionPaths: ['/*'],
    });

    // Outputs
    new cdk.CfnOutput(this, 'BucketName', {
      value: websiteBucket.bucketName,
    });

    new cdk.CfnOutput(this, 'DistributionDomainName', {
      value: distribution.distributionDomainName,
    });

    new cdk.CfnOutput(this, 'WebsiteURL', {
      value: `https://${distribution.distributionDomainName}`,
    });
  }
}
```

### Step 3: Deploy with CDK

```bash
cd infrastructure
cdk init app --language typescript
cdk bootstrap
cdk deploy
```

## 🌐 Custom Domain Setup

### Step 1: Request SSL Certificate

```bash
# Request certificate (must be in us-east-1 for CloudFront)
aws acm request-certificate \
  --domain-name harvesthope.com \
  --subject-alternative-names www.harvesthope.com \
  --validation-method DNS \
  --region us-east-1
```

### Step 2: Create Route 53 Hosted Zone

```bash
# Create hosted zone
aws route53 create-hosted-zone \
  --name harvesthope.com \
  --caller-reference harvest-hope-2024
```

### Step 3: Update CloudFront Distribution

```bash
# Update distribution with custom domain
aws cloudfront update-distribution \
  --id YOUR_DISTRIBUTION_ID \
  --distribution-config '{
    "Aliases": {
      "Quantity": 2,
      "Items": ["harvesthope.com", "www.harvesthope.com"]
    },
    "ViewerCertificate": {
      "ACMCertificateArn": "arn:aws:acm:us-east-1:ACCOUNT:certificate/CERT-ID",
      "SSLSupportMethod": "sni-only",
      "MinimumProtocolVersion": "TLSv1.2_2021"
    }
  }'
```

## 🔄 Automated Deployment with GitHub Actions

Create `.github/workflows/deploy-aws.yml`:

```yaml
name: Deploy to AWS S3 + CloudFront

on:
  push:
    branches: [ main ]

env:
  AWS_REGION: us-east-1
  S3_BUCKET: harvest-hope-game
  CLOUDFRONT_DISTRIBUTION_ID: ${{ secrets.CLOUDFRONT_DISTRIBUTION_ID }}

jobs:
  deploy:
    runs-on: ubuntu-latest
    
    steps:
    - name: Checkout
      uses: actions/checkout@v4
      
    - name: Setup Node.js
      uses: actions/setup-node@v4
      with:
        node-version: '18'
        cache: 'npm'
        cache-dependency-path: frontend/package-lock.json
        
    - name: Install dependencies
      run: |
        cd frontend
        npm ci
        
    - name: Build application
      run: |
        cd frontend
        npm run build
      env:
        VITE_GEMINI_API_KEY: ${{ secrets.VITE_GEMINI_API_KEY }}
        VITE_NODE_ENV: production
        
    - name: Configure AWS credentials
      uses: aws-actions/configure-aws-credentials@v4
      with:
        aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
        aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
        aws-region: ${{ env.AWS_REGION }}
        
    - name: Deploy to S3
      run: |
        # Deploy static assets with long cache
        aws s3 sync frontend/dist/ s3://${{ env.S3_BUCKET }} \
          --delete \
          --cache-control "public, max-age=31536000" \
          --exclude "*.html" \
          --exclude "*.json"
          
        # Deploy HTML files with short cache
        aws s3 sync frontend/dist/ s3://${{ env.S3_BUCKET }} \
          --cache-control "public, max-age=0, must-revalidate" \
          --include "*.html" \
          --include "*.json"
          
    - name: Invalidate CloudFront
      run: |
        aws cloudfront create-invalidation \
          --distribution-id ${{ env.CLOUDFRONT_DISTRIBUTION_ID }} \
          --paths "/*"
```

## 🔒 Environment Variables

### GitHub Secrets Required

```bash
# AWS Credentials
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key

# CloudFront
CLOUDFRONT_DISTRIBUTION_ID=E1234567890ABC

# Application
VITE_GEMINI_API_KEY=your-api-key
```

## 📊 Cost Optimization

### S3 Storage Classes

```bash
# Set lifecycle policy for cost optimization
aws s3api put-bucket-lifecycle-configuration \
  --bucket harvest-hope-game \
  --lifecycle-configuration '{
    "Rules": [
      {
        "ID": "OptimizeStorage",
        "Status": "Enabled",
        "Transitions": [
          {
            "Days": 30,
            "StorageClass": "STANDARD_IA"
          },
          {
            "Days": 90,
            "StorageClass": "GLACIER"
          }
        ]
      }
    ]
  }'
```

### CloudFront Price Classes

- **PriceClass_100**: US, Canada, Europe (cheapest)
- **PriceClass_200**: + Asia Pacific, Middle East, Africa
- **PriceClass_All**: All edge locations (most expensive)

## ✅ Verification Steps

### 1. Test S3 Website

```bash
# Get S3 website endpoint
aws s3api get-bucket-website --bucket harvest-hope-game

# Test direct S3 access
curl -I http://harvest-hope-game.s3-website-us-east-1.amazonaws.com
```

### 2. Test CloudFront Distribution

```bash
# Get distribution info
aws cloudfront get-distribution --id YOUR_DISTRIBUTION_ID

# Test CDN access
curl -I https://d1234567890abc.cloudfront.net
```

### 3. Verify Game Functionality

- ✅ Site loads at CloudFront URL
- ✅ All assets load correctly
- ✅ AI features work (with API key)
- ✅ Game saves persist
- ✅ SPA routing works (no 404s)

## 🐛 Troubleshooting

### Common Issues

#### 1. **403 Forbidden Errors**
**Problem**: Bucket policy not configured  
**Solution**: Apply public read policy

#### 2. **404 on SPA Routes**
**Problem**: CloudFront not configured for SPA  
**Solution**: Add custom error response for 404 → 200

#### 3. **Slow Updates**
**Problem**: CloudFront caching  
**Solution**: Create invalidation

#### 4. **SSL Certificate Issues**
**Problem**: Certificate not in us-east-1  
**Solution**: Request certificate in us-east-1 region

### Debug Commands

```bash
# Check S3 bucket policy
aws s3api get-bucket-policy --bucket harvest-hope-game

# List CloudFront distributions
aws cloudfront list-distributions

# Check certificate status
aws acm list-certificates --region us-east-1

# Create invalidation
aws cloudfront create-invalidation \
  --distribution-id YOUR_ID \
  --paths "/*"
```

## 💰 Cost Estimation

### Monthly Costs (Approximate)

- **S3 Storage**: $0.023/GB (first 50TB)
- **S3 Requests**: $0.0004/1000 GET requests
- **CloudFront**: $0.085/GB (first 10TB)
- **Route 53**: $0.50/hosted zone + $0.40/million queries

**Estimated Monthly Cost**: $5-20 for small to medium traffic

## 🎯 Final Checklist

- [ ] ✅ AWS CLI configured
- [ ] ✅ S3 bucket created and configured
- [ ] ✅ Bucket policy applied
- [ ] ✅ CloudFront distribution created
- [ ] ✅ Custom error pages configured
- [ ] ✅ SSL certificate requested (if custom domain)
- [ ] ✅ Route 53 configured (if custom domain)
- [ ] ✅ GitHub Actions workflow created
- [ ] ✅ Environment secrets configured
- [ ] ✅ Build and deployment successful
- [ ] ✅ Site accessible and functional
- [ ] ✅ Performance optimized

## 🔗 Useful Links

- **AWS S3 Static Hosting**: https://docs.aws.amazon.com/AmazonS3/latest/userguide/WebsiteHosting.html
- **CloudFront Documentation**: https://docs.aws.amazon.com/cloudfront/
- **AWS CDK Guide**: https://docs.aws.amazon.com/cdk/
- **Route 53 Documentation**: https://docs.aws.amazon.com/route53/

---

**🎉 Your Harvest Hope game will be live at: `https://your-distribution-domain.cloudfront.net`**