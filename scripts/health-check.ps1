# Harvest Hope Health Check Script (PowerShell)
# This script validates the deployment and checks system health

$ErrorActionPreference = "Continue"

Write-Host "🏥 Starting Harvest Hope Health Check..." -ForegroundColor Green

# Counters
$PASSED = 0
$FAILED = 0

# Function to check status
function Check-Status {
    param($Success, $Message)
    if ($Success) {
        Write-Host "✅ $Message" -ForegroundColor Green
        $script:PASSED++
    } else {
        Write-Host "❌ $Message" -ForegroundColor Red
        $script:FAILED++
    }
}

# Function to check optional status
function Check-Optional {
    param($Success, $Message)
    if ($Success) {
        Write-Host "✅ $Message" -ForegroundColor Green
        $script:PASSED++
    } else {
        Write-Host "⚠️  $Message (Optional)" -ForegroundColor Yellow
    }
}

Write-Host "🔍 Checking AWS Configuration..." -ForegroundColor Cyan

# Check AWS CLI
try {
    aws sts get-caller-identity | Out-Null
    Check-Status $true "AWS CLI configured and authenticated"
} catch {
    Check-Status $false "AWS CLI configured and authenticated"
}

# Get AWS account and region
try {
    $AWS_ACCOUNT = (aws sts get-caller-identity --query Account --output text)
    $AWS_REGION = (aws configure get region)
    Write-Host "📍 Account: $AWS_ACCOUNT, Region: $AWS_REGION" -ForegroundColor Cyan
} catch {
    Write-Host "❌ Could not retrieve AWS account information" -ForegroundColor Red
}

Write-Host ""
Write-Host "🏗️  Checking Infrastructure..." -ForegroundColor Cyan

# Check CloudFormation stack
try {
    aws cloudformation describe-stacks --stack-name HarvestHopeStack | Out-Null
    Check-Status $true "CloudFormation stack exists and is healthy"
    
    # Get stack outputs
    $API_URL = (aws cloudformation describe-stacks --stack-name HarvestHopeStack --query "Stacks[0].Outputs[?OutputKey=='APIGatewayURL'].OutputValue" --output text)
    $CLOUDFRONT_URL = (aws cloudformation describe-stacks --stack-name HarvestHopeStack --query "Stacks[0].Outputs[?OutputKey=='CloudFrontURL'].OutputValue" --output text)
    $ASSETS_BUCKET = (aws cloudformation describe-stacks --stack-name HarvestHopeStack --query "Stacks[0].Outputs[?OutputKey=='AssetsBucketName'].OutputValue" --output text)
    
    Write-Host "🔗 API Gateway URL: $API_URL" -ForegroundColor Cyan
    Write-Host "🔗 CloudFront URL: $CLOUDFRONT_URL" -ForegroundColor Cyan
    Write-Host "🪣 Assets Bucket: $ASSETS_BUCKET" -ForegroundColor Cyan
} catch {
    Check-Status $false "CloudFormation stack exists and is healthy"
}

Write-Host ""
Write-Host "🗄️  Checking DynamoDB Tables..." -ForegroundColor Cyan

# Check DynamoDB tables
$TABLES = @("harvest-hope-game-states", "harvest-hope-npc-templates", "harvest-hope-market-data", "harvest-hope-player-stats", "harvest-hope-loans", "harvest-hope-government-schemes", "harvest-hope-transactions")

foreach ($table in $TABLES) {
    try {
        aws dynamodb describe-table --table-name $table | Out-Null
        Check-Status $true "DynamoDB table: $table"
    } catch {
        Check-Status $false "DynamoDB table: $table"
    }
}

Write-Host ""
Write-Host "⚡ Checking Lambda Functions..." -ForegroundColor Cyan

# Check Lambda functions
$FUNCTIONS = @("harvest-hope-weather", "harvest-hope-market", "harvest-hope-npc", "harvest-hope-event", "harvest-hope-gamestate", "harvest-hope-financial")

foreach ($function in $FUNCTIONS) {
    try {
        aws lambda get-function --function-name $function | Out-Null
        Check-Status $true "Lambda function: $function"
    } catch {
        Check-Status $false "Lambda function: $function"
    }
}

Write-Host ""
Write-Host "🌐 Checking API Gateway..." -ForegroundColor Cyan

if ($API_URL) {
    # Test API Gateway health
    try {
        $response = Invoke-WebRequest -Uri $API_URL -Method GET -UseBasicParsing -TimeoutSec 10
        if ($response.StatusCode -eq 200 -or $response.StatusCode -eq 403) {
            Check-Status $true "API Gateway is responding"
        } else {
            Check-Status $false "API Gateway is responding (HTTP $($response.StatusCode))"
        }
    } catch {
        Check-Status $false "API Gateway is responding"
    }
    
    # Test specific endpoints
    $endpoints = @("weather", "market", "npc", "events/generate", "financial")
    foreach ($endpoint in $endpoints) {
        try {
            $response = Invoke-WebRequest -Uri "$API_URL$endpoint" -Method GET -UseBasicParsing -TimeoutSec 5
            Check-Status $true "API endpoint /$endpoint is accessible"
        } catch {
            if ($_.Exception.Response.StatusCode -match "^[2-5][0-9][0-9]$") {
                Check-Status $true "API endpoint /$endpoint is accessible"
            } else {
                Check-Status $false "API endpoint /$endpoint is not accessible"
            }
        }
    }
}

Write-Host ""
Write-Host "🪣 Checking S3 Buckets..." -ForegroundColor Cyan

# Check S3 buckets
if ($ASSETS_BUCKET) {
    try {
        aws s3 ls "s3://$ASSETS_BUCKET" | Out-Null
        Check-Status $true "S3 Assets bucket is accessible"
    } catch {
        Check-Status $false "S3 Assets bucket is accessible"
    }
}

try {
    aws s3 ls s3://harvest-hope-data | Out-Null
    Check-Optional $true "S3 Data bucket is accessible"
} catch {
    Check-Optional $false "S3 Data bucket is accessible"
}

try {
    aws s3 ls s3://harvest-hope-configs | Out-Null
    Check-Optional $true "S3 Configs bucket is accessible"
} catch {
    Check-Optional $false "S3 Configs bucket is accessible"
}

Write-Host ""
Write-Host "📊 Checking CloudWatch..." -ForegroundColor Cyan

# Check CloudWatch dashboard
try {
    aws cloudwatch get-dashboard --dashboard-name HarvestHope-Performance | Out-Null
    Check-Status $true "CloudWatch dashboard exists"
} catch {
    Check-Status $false "CloudWatch dashboard exists"
}

# Check log groups
foreach ($function in $FUNCTIONS) {
    try {
        $logGroups = aws logs describe-log-groups --log-group-name-prefix "/aws/lambda/$function" | ConvertFrom-Json
        if ($logGroups.logGroups.Count -gt 0) {
            Check-Status $true "Log group for $function exists"
        } else {
            Check-Status $false "Log group for $function exists"
        }
    } catch {
        Check-Status $false "Log group for $function exists"
    }
}

Write-Host ""
Write-Host "🚨 Checking CloudWatch Alarms..." -ForegroundColor Cyan

# Check alarms
$ALARMS = @("WeatherServiceErrors", "MarketServiceErrors", "NPCServiceErrors", "GameStateServiceErrors", "APILatencyAlarm", "API4xxErrors", "API5xxErrors")

foreach ($alarm in $ALARMS) {
    try {
        aws cloudwatch describe-alarms --alarm-names "HarvestHopeStack-$alarm" | Out-Null
        Check-Status $true "CloudWatch alarm: $alarm"
    } catch {
        Check-Status $false "CloudWatch alarm: $alarm"
    }
}

Write-Host ""
Write-Host "🔍 Checking Amplify (Optional)..." -ForegroundColor Cyan

# Check Amplify app (optional)
try {
    $amplifyApps = aws amplify list-apps | ConvertFrom-Json
    $harvestHopeApp = $amplifyApps.apps | Where-Object { $_.name -eq "harvest-hope-frontend" }
    if ($harvestHopeApp) {
        Check-Optional $true "Amplify app exists"
    } else {
        Check-Optional $false "Amplify app exists"
    }
} catch {
    Check-Optional $false "Amplify app exists"
}

Write-Host ""
Write-Host "🧪 Running Basic Functionality Tests..." -ForegroundColor Cyan

if ($API_URL) {
    # Test weather endpoint with POST
    try {
        $weatherBody = @{
            region = "maharashtra"
            season = "kharif"
        } | ConvertTo-Json
        
        $weatherResponse = Invoke-WebRequest -Uri "$API_URL/weather" -Method POST -Body $weatherBody -ContentType "application/json" -UseBasicParsing -TimeoutSec 10
        if ($weatherResponse.StatusCode -ge 200 -and $weatherResponse.StatusCode -lt 300) {
            Check-Status $true "Weather API functional test"
        } else {
            Check-Status $false "Weather API functional test (HTTP $($weatherResponse.StatusCode))"
        }
    } catch {
        Check-Status $false "Weather API functional test"
    }
    
    # Test market endpoint with POST
    try {
        $marketBody = @{
            crop = "rice"
            region = "maharashtra"
        } | ConvertTo-Json
        
        $marketResponse = Invoke-WebRequest -Uri "$API_URL/market" -Method POST -Body $marketBody -ContentType "application/json" -UseBasicParsing -TimeoutSec 10
        if ($marketResponse.StatusCode -ge 200 -and $marketResponse.StatusCode -lt 300) {
            Check-Status $true "Market API functional test"
        } else {
            Check-Status $false "Market API functional test (HTTP $($marketResponse.StatusCode))"
        }
    } catch {
        Check-Status $false "Market API functional test"
    }
}

Write-Host ""
Write-Host "📈 Performance Check..." -ForegroundColor Cyan

if ($API_URL) {
    # Check API response time
    try {
        $stopwatch = [System.Diagnostics.Stopwatch]::StartNew()
        Invoke-WebRequest -Uri $API_URL -Method GET -UseBasicParsing -TimeoutSec 10 | Out-Null
        $stopwatch.Stop()
        $responseTime = $stopwatch.Elapsed.TotalSeconds
        
        if ($responseTime -lt 2.0) {
            Check-Status $true "API response time acceptable ($responseTime seconds)"
        } else {
            Check-Status $false "API response time too slow ($responseTime seconds)"
        }
    } catch {
        Check-Status $false "API response time check failed"
    }
}

Write-Host ""
Write-Host "📋 Health Check Summary" -ForegroundColor Cyan
Write-Host "======================"
Write-Host "Passed: $PASSED" -ForegroundColor Green
Write-Host "Failed: $FAILED" -ForegroundColor Red

if ($FAILED -eq 0) {
    Write-Host "🎉 All critical checks passed! Harvest Hope is healthy." -ForegroundColor Green
    exit 0
} else {
    Write-Host "⚠️  Some checks failed. Please review the issues above." -ForegroundColor Red
    exit 1
}