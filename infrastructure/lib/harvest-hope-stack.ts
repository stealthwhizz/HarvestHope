import * as cdk from 'aws-cdk-lib';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as origins from 'aws-cdk-lib/aws-cloudfront-origins';
import * as cloudwatch from 'aws-cdk-lib/aws-cloudwatch';
import * as amplify from 'aws-cdk-lib/aws-amplify';
import * as logs from 'aws-cdk-lib/aws-logs';
import { Construct } from 'constructs';

export class HarvestHopeStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Create Lambda Layer for shared dependencies
    const sharedLayer = new lambda.LayerVersion(this, 'HarvestHopeSharedLayer', {
      code: lambda.Code.fromAsset('../backend/shared'),
      compatibleRuntimes: [lambda.Runtime.PYTHON_3_11],
      description: 'Shared utilities and dependencies for Harvest Hope Lambda functions',
    });

    // DynamoDB Tables with proper indexes and TTL settings
    const gameStatesTable = new dynamodb.Table(this, 'GameStatesTable', {
      tableName: 'harvest-hope-game-states',
      partitionKey: { name: 'playerId', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'saveSlot', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      timeToLiveAttribute: 'ttl',
      removalPolicy: cdk.RemovalPolicy.DESTROY, // For development
      pointInTimeRecovery: true,
      encryption: dynamodb.TableEncryption.AWS_MANAGED,
    });

    // Add GSI for querying by last modified date
    gameStatesTable.addGlobalSecondaryIndex({
      indexName: 'LastModifiedIndex',
      partitionKey: { name: 'playerId', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'lastModified', type: dynamodb.AttributeType.STRING },
      projectionType: dynamodb.ProjectionType.ALL,
    });

    const npcTemplatesTable = new dynamodb.Table(this, 'NPCTemplatesTable', {
      tableName: 'harvest-hope-npc-templates',
      partitionKey: { name: 'templateId', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      pointInTimeRecovery: true,
      encryption: dynamodb.TableEncryption.AWS_MANAGED,
    });

    // Add GSI for querying by crisis type
    npcTemplatesTable.addGlobalSecondaryIndex({
      indexName: 'CrisisTypeIndex',
      partitionKey: { name: 'crisisType', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'severity', type: dynamodb.AttributeType.NUMBER },
      projectionType: dynamodb.ProjectionType.ALL,
    });

    const marketDataTable = new dynamodb.Table(this, 'MarketDataTable', {
      tableName: 'harvest-hope-market-data',
      partitionKey: { name: 'crop', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'date', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      timeToLiveAttribute: 'ttl', // Market data expires after 90 days
      pointInTimeRecovery: true,
      encryption: dynamodb.TableEncryption.AWS_MANAGED,
    });

    // Add GSI for querying by region
    marketDataTable.addGlobalSecondaryIndex({
      indexName: 'RegionDateIndex',
      partitionKey: { name: 'region', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'date', type: dynamodb.AttributeType.STRING },
      projectionType: dynamodb.ProjectionType.ALL,
    });

    const playerStatsTable = new dynamodb.Table(this, 'PlayerStatsTable', {
      tableName: 'harvest-hope-player-stats',
      partitionKey: { name: 'playerId', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      pointInTimeRecovery: true,
      encryption: dynamodb.TableEncryption.AWS_MANAGED,
    });

    // Add GSI for leaderboards
    playerStatsTable.addGlobalSecondaryIndex({
      indexName: 'ScoreIndex',
      partitionKey: { name: 'gameMode', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'totalScore', type: dynamodb.AttributeType.NUMBER },
      projectionType: dynamodb.ProjectionType.ALL,
    });

    // Financial system tables
    const loansTable = new dynamodb.Table(this, 'LoansTable', {
      tableName: 'harvest-hope-loans',
      partitionKey: { name: 'playerId', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'loanId', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      pointInTimeRecovery: true,
      encryption: dynamodb.TableEncryption.AWS_MANAGED,
    });

    // Add GSI for querying by loan status
    loansTable.addGlobalSecondaryIndex({
      indexName: 'StatusIndex',
      partitionKey: { name: 'playerId', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'status', type: dynamodb.AttributeType.STRING },
      projectionType: dynamodb.ProjectionType.ALL,
    });

    const governmentSchemesTable = new dynamodb.Table(this, 'GovernmentSchemesTable', {
      tableName: 'harvest-hope-government-schemes',
      partitionKey: { name: 'schemeId', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      pointInTimeRecovery: true,
      encryption: dynamodb.TableEncryption.AWS_MANAGED,
    });

    // Add GSI for querying by eligibility criteria
    governmentSchemesTable.addGlobalSecondaryIndex({
      indexName: 'CategoryIndex',
      partitionKey: { name: 'category', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'priority', type: dynamodb.AttributeType.NUMBER },
      projectionType: dynamodb.ProjectionType.ALL,
    });

    const transactionsTable = new dynamodb.Table(this, 'TransactionsTable', {
      tableName: 'harvest-hope-transactions',
      partitionKey: { name: 'playerId', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'transactionId', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      timeToLiveAttribute: 'ttl', // Transactions expire after 1 year
      pointInTimeRecovery: true,
      encryption: dynamodb.TableEncryption.AWS_MANAGED,
    });

    // Add GSI for querying by date range
    transactionsTable.addGlobalSecondaryIndex({
      indexName: 'DateIndex',
      partitionKey: { name: 'playerId', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'timestamp', type: dynamodb.AttributeType.STRING },
      projectionType: dynamodb.ProjectionType.ALL,
    });

    // S3 Buckets with performance optimizations
    const assetsBucket = new s3.Bucket(this, 'AssetsBucket', {
      bucketName: `harvest-hope-assets-${this.account}`,
      publicReadAccess: false,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      cors: [
        {
          allowedMethods: [s3.HttpMethods.GET],
          allowedOrigins: ['*'],
          allowedHeaders: ['*'],
        },
      ],
      transferAcceleration: true, // Enable transfer acceleration
    });

    // CloudFront distribution for asset delivery
    const distribution = new cloudfront.Distribution(this, 'AssetsDistribution', {
      defaultBehavior: {
        origin: new origins.S3Origin(assetsBucket),
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        cachePolicy: cloudfront.CachePolicy.CACHING_OPTIMIZED,
        compress: true,
        allowedMethods: cloudfront.AllowedMethods.ALLOW_GET_HEAD,
      },
      additionalBehaviors: {
        '/api/*': {
          origin: new origins.HttpOrigin('api.example.com'), // Will be updated with actual API Gateway
          viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
          cachePolicy: cloudfront.CachePolicy.CACHING_DISABLED,
          originRequestPolicy: cloudfront.OriginRequestPolicy.CORS_S3_ORIGIN,
        },
      },
      priceClass: cloudfront.PriceClass.PRICE_CLASS_100,
      enableIpv6: true,
    });

    const dataBucket = new s3.Bucket(this, 'DataBucket', {
      bucketName: 'harvest-hope-data',
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    const configsBucket = new s3.Bucket(this, 'ConfigsBucket', {
      bucketName: 'harvest-hope-configs',
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    // Enhanced IAM Role for Lambda functions with proper permissions
    const lambdaRole = new iam.Role(this, 'LambdaExecutionRole', {
      assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSLambdaBasicExecutionRole'),
        iam.ManagedPolicy.fromAwsManagedPolicyName('AWSXRayDaemonWriteAccess'), // For tracing
      ],
      inlinePolicies: {
        DynamoDBAccess: new iam.PolicyDocument({
          statements: [
            new iam.PolicyStatement({
              effect: iam.Effect.ALLOW,
              actions: [
                'dynamodb:GetItem',
                'dynamodb:PutItem',
                'dynamodb:UpdateItem',
                'dynamodb:DeleteItem',
                'dynamodb:Query',
                'dynamodb:Scan',
                'dynamodb:BatchGetItem',
                'dynamodb:BatchWriteItem',
              ],
              resources: [
                gameStatesTable.tableArn,
                `${gameStatesTable.tableArn}/index/*`,
                npcTemplatesTable.tableArn,
                `${npcTemplatesTable.tableArn}/index/*`,
                marketDataTable.tableArn,
                `${marketDataTable.tableArn}/index/*`,
                playerStatsTable.tableArn,
                `${playerStatsTable.tableArn}/index/*`,
                loansTable.tableArn,
                `${loansTable.tableArn}/index/*`,
                governmentSchemesTable.tableArn,
                `${governmentSchemesTable.tableArn}/index/*`,
                transactionsTable.tableArn,
                `${transactionsTable.tableArn}/index/*`,
              ],
            }),
          ],
        }),
        S3Access: new iam.PolicyDocument({
          statements: [
            new iam.PolicyStatement({
              effect: iam.Effect.ALLOW,
              actions: [
                's3:GetObject',
                's3:PutObject',
                's3:DeleteObject',
                's3:ListBucket',
              ],
              resources: [
                dataBucket.bucketArn,
                `${dataBucket.bucketArn}/*`,
                configsBucket.bucketArn,
                `${configsBucket.bucketArn}/*`,
                assetsBucket.bucketArn,
                `${assetsBucket.bucketArn}/*`,
              ],
            }),
          ],
        }),
        BedrockAccess: new iam.PolicyDocument({
          statements: [
            new iam.PolicyStatement({
              effect: iam.Effect.ALLOW,
              actions: [
                'bedrock:InvokeModel',
                'bedrock:InvokeModelWithResponseStream',
                'bedrock:ListFoundationModels',
              ],
              resources: [
                'arn:aws:bedrock:*::foundation-model/anthropic.claude-3-5-sonnet-20241022-v2:0',
                'arn:aws:bedrock:*::foundation-model/anthropic.claude-3-haiku-20240307-v1:0',
              ],
            }),
          ],
        }),
        CloudWatchLogs: new iam.PolicyDocument({
          statements: [
            new iam.PolicyStatement({
              effect: iam.Effect.ALLOW,
              actions: [
                'logs:CreateLogGroup',
                'logs:CreateLogStream',
                'logs:PutLogEvents',
                'logs:DescribeLogStreams',
                'logs:DescribeLogGroups',
              ],
              resources: ['*'],
            }),
          ],
        }),
      },
    });

    // CloudWatch Log Groups for Lambda functions
    const weatherLogGroup = new logs.LogGroup(this, 'WeatherLogGroup', {
      logGroupName: '/aws/lambda/harvest-hope-weather',
      retention: logs.RetentionDays.ONE_MONTH,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    const marketLogGroup = new logs.LogGroup(this, 'MarketLogGroup', {
      logGroupName: '/aws/lambda/harvest-hope-market',
      retention: logs.RetentionDays.ONE_MONTH,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    const npcLogGroup = new logs.LogGroup(this, 'NPCLogGroup', {
      logGroupName: '/aws/lambda/harvest-hope-npc',
      retention: logs.RetentionDays.ONE_MONTH,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    const eventLogGroup = new logs.LogGroup(this, 'EventLogGroup', {
      logGroupName: '/aws/lambda/harvest-hope-event',
      retention: logs.RetentionDays.ONE_MONTH,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    const gameStateLogGroup = new logs.LogGroup(this, 'GameStateLogGroup', {
      logGroupName: '/aws/lambda/harvest-hope-gamestate',
      retention: logs.RetentionDays.ONE_MONTH,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    const financialLogGroup = new logs.LogGroup(this, 'FinancialLogGroup', {
      logGroupName: '/aws/lambda/harvest-hope-financial',
      retention: logs.RetentionDays.ONE_MONTH,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    // Performance-optimized Lambda Functions with enhanced monitoring
    const weatherLambda = new lambda.Function(this, 'WeatherFunction', {
      functionName: 'harvest-hope-weather',
      runtime: lambda.Runtime.PYTHON_3_11,
      handler: 'weather.handler',
      code: lambda.Code.fromAsset('../backend/weather'),
      role: lambdaRole,
      layers: [sharedLayer],
      environment: {
        GAME_STATES_TABLE: gameStatesTable.tableName,
        DATA_BUCKET: dataBucket.bucketName,
        LOG_LEVEL: 'INFO',
        AWS_LAMBDA_EXEC_WRAPPER: '/opt/otel-instrument', // OpenTelemetry tracing
      },
      timeout: cdk.Duration.seconds(30),
      memorySize: 512,
      reservedConcurrentExecutions: 10,
      logGroup: weatherLogGroup,
      tracing: lambda.Tracing.ACTIVE, // Enable X-Ray tracing
      insightsVersion: lambda.LambdaInsightsVersion.VERSION_1_0_229_0, // Enable Lambda Insights
    });

    const marketLambda = new lambda.Function(this, 'MarketFunction', {
      functionName: 'harvest-hope-market',
      runtime: lambda.Runtime.PYTHON_3_11,
      handler: 'market.lambda_handler',
      code: lambda.Code.fromAsset('../backend/market'),
      role: lambdaRole,
      layers: [sharedLayer],
      environment: {
        MARKET_DATA_TABLE: marketDataTable.tableName,
        PRICE_HISTORY_TABLE: marketDataTable.tableName,
        DATA_BUCKET: dataBucket.bucketName,
        LOG_LEVEL: 'INFO',
        AWS_LAMBDA_EXEC_WRAPPER: '/opt/otel-instrument',
      },
      timeout: cdk.Duration.seconds(30),
      memorySize: 512,
      reservedConcurrentExecutions: 10,
      logGroup: marketLogGroup,
      tracing: lambda.Tracing.ACTIVE,
      insightsVersion: lambda.LambdaInsightsVersion.VERSION_1_0_229_0,
    });

    const npcLambda = new lambda.Function(this, 'NPCFunction', {
      functionName: 'harvest-hope-npc',
      runtime: lambda.Runtime.PYTHON_3_11,
      handler: 'npc.handler',
      code: lambda.Code.fromAsset('../backend/npc'),
      role: lambdaRole,
      layers: [sharedLayer],
      environment: {
        NPC_TEMPLATES_TABLE: npcTemplatesTable.tableName,
        LOG_LEVEL: 'INFO',
        AWS_LAMBDA_EXEC_WRAPPER: '/opt/otel-instrument',
      },
      timeout: cdk.Duration.seconds(60),
      memorySize: 1024, // Increased for AI processing
      reservedConcurrentExecutions: 5, // Lower concurrency for AI-heavy function
      logGroup: npcLogGroup,
      tracing: lambda.Tracing.ACTIVE,
      insightsVersion: lambda.LambdaInsightsVersion.VERSION_1_0_229_0,
    });

    const eventLambda = new lambda.Function(this, 'EventFunction', {
      functionName: 'harvest-hope-event',
      runtime: lambda.Runtime.PYTHON_3_11,
      handler: 'event.handler',
      code: lambda.Code.fromAsset('../backend/events'),
      role: lambdaRole,
      layers: [sharedLayer],
      environment: {
        GAME_STATES_TABLE: gameStatesTable.tableName,
        DATA_BUCKET: dataBucket.bucketName,
        LOG_LEVEL: 'INFO',
        AWS_LAMBDA_EXEC_WRAPPER: '/opt/otel-instrument',
      },
      timeout: cdk.Duration.seconds(60),
      memorySize: 1024,
      reservedConcurrentExecutions: 5,
      logGroup: eventLogGroup,
      tracing: lambda.Tracing.ACTIVE,
      insightsVersion: lambda.LambdaInsightsVersion.VERSION_1_0_229_0,
    });

    const gameStateLambda = new lambda.Function(this, 'GameStateFunction', {
      functionName: 'harvest-hope-gamestate',
      runtime: lambda.Runtime.PYTHON_3_11,
      handler: 'gamestate.handler',
      code: lambda.Code.fromAsset('../backend/gamestate'),
      role: lambdaRole,
      layers: [sharedLayer],
      environment: {
        GAME_STATES_TABLE: gameStatesTable.tableName,
        PLAYER_STATS_TABLE: playerStatsTable.tableName,
        LOG_LEVEL: 'INFO',
        AWS_LAMBDA_EXEC_WRAPPER: '/opt/otel-instrument',
      },
      timeout: cdk.Duration.seconds(30),
      memorySize: 512,
      reservedConcurrentExecutions: 20, // Higher concurrency for game state
      logGroup: gameStateLogGroup,
      tracing: lambda.Tracing.ACTIVE,
      insightsVersion: lambda.LambdaInsightsVersion.VERSION_1_0_229_0,
    });

    const financialLambda = new lambda.Function(this, 'FinancialFunction', {
      functionName: 'harvest-hope-financial',
      runtime: lambda.Runtime.PYTHON_3_11,
      handler: 'financial.lambda_handler',
      code: lambda.Code.fromAsset('../backend/financial'),
      role: lambdaRole,
      layers: [sharedLayer],
      environment: {
        LOANS_TABLE: loansTable.tableName,
        GOVERNMENT_SCHEMES_TABLE: governmentSchemesTable.tableName,
        TRANSACTIONS_TABLE: transactionsTable.tableName,
        LOG_LEVEL: 'INFO',
        AWS_LAMBDA_EXEC_WRAPPER: '/opt/otel-instrument',
      },
      timeout: cdk.Duration.seconds(30),
      memorySize: 512,
      reservedConcurrentExecutions: 15,
      logGroup: financialLogGroup,
      tracing: lambda.Tracing.ACTIVE,
      insightsVersion: lambda.LambdaInsightsVersion.VERSION_1_0_229_0,
    });

    // API Gateway with caching and throttling
    const api = new apigateway.RestApi(this, 'HarvestHopeAPI', {
      restApiName: 'Harvest Hope Game API',
      description: 'API for Harvest Hope farming simulation game',
      defaultCorsPreflightOptions: {
        allowOrigins: apigateway.Cors.ALL_ORIGINS,
        allowMethods: apigateway.Cors.ALL_METHODS,
        allowHeaders: ['Content-Type', 'X-Amz-Date', 'Authorization', 'X-Api-Key'],
      },
      deployOptions: {
        stageName: 'prod',
        cachingEnabled: true,
        cacheClusterEnabled: true,
        cacheClusterSize: '0.5',
        cacheTtl: cdk.Duration.minutes(5),
        throttleSettings: {
          rateLimit: 1000,
          burstLimit: 2000,
        },
        loggingLevel: apigateway.MethodLoggingLevel.INFO,
        dataTraceEnabled: true,
        metricsEnabled: true,
      },
    });

    // API Routes
    const weatherResource = api.root.addResource('weather');
    weatherResource.addMethod('POST', new apigateway.LambdaIntegration(weatherLambda));

    const marketResource = api.root.addResource('market');
    marketResource.addMethod('POST', new apigateway.LambdaIntegration(marketLambda));

    const npcResource = api.root.addResource('npc');
    npcResource.addMethod('POST', new apigateway.LambdaIntegration(npcLambda));

    const eventResource = api.root.addResource('events');
    const generateEventResource = eventResource.addResource('generate');
    generateEventResource.addMethod('POST', new apigateway.LambdaIntegration(eventLambda));
    const resolveEventResource = eventResource.addResource('resolve');
    resolveEventResource.addMethod('POST', new apigateway.LambdaIntegration(eventLambda));

    const gameStateResource = api.root.addResource('gamestate');
    const playerResource = gameStateResource.addResource('{playerId}');
    playerResource.addMethod('GET', new apigateway.LambdaIntegration(gameStateLambda));
    playerResource.addMethod('POST', new apigateway.LambdaIntegration(gameStateLambda));
    playerResource.addMethod('DELETE', new apigateway.LambdaIntegration(gameStateLambda));

    const financialResource = api.root.addResource('financial');
    financialResource.addMethod('POST', new apigateway.LambdaIntegration(financialLambda));

    // AWS Amplify App for Frontend Deployment
    const amplifyApp = new amplify.App(this, 'HarvestHopeApp', {
      appName: 'harvest-hope-frontend',
      sourceCodeProvider: new amplify.GitHubSourceCodeProvider({
        owner: 'your-github-username', // Replace with actual GitHub username
        repository: 'harvest-hope', // Replace with actual repository name
        oauthToken: cdk.SecretValue.secretsManager('github-token'), // Store GitHub token in Secrets Manager
      }),
      buildSpec: amplify.BuildSpec.fromObjectToYaml({
        version: '1',
        applications: [
          {
            frontend: {
              phases: {
                preBuild: {
                  commands: ['cd frontend', 'npm ci'],
                },
                build: {
                  commands: ['npm run build'],
                },
              },
              artifacts: {
                baseDirectory: 'frontend/dist',
                files: ['**/*'],
              },
              cache: {
                paths: ['frontend/node_modules/**/*'],
              },
            },
            appRoot: 'frontend',
          },
        ],
      }),
      environmentVariables: {
        VITE_API_BASE_URL: api.url,
        VITE_ASSETS_BASE_URL: `https://${distribution.distributionDomainName}`,
        VITE_AWS_REGION: this.region,
        VITE_NODE_ENV: 'production',
        VITE_ENABLE_ANALYTICS: 'true',
        VITE_ENABLE_ERROR_REPORTING: 'true',
        VITE_ENABLE_PERFORMANCE_MONITORING: 'true',
        VITE_GAME_VERSION: '1.0.0',
        VITE_MAX_SAVE_SLOTS: '5',
        VITE_AUTO_SAVE_INTERVAL: '30000',
      },
    });

    // Add production branch
    const prodBranch = amplifyApp.addBranch('main', {
      branchName: 'main',
      stage: 'PRODUCTION',
      autoBuild: true,
    });

    // Add domain (optional - uncomment and configure if you have a custom domain)
    // const domain = amplifyApp.addDomain('harvest-hope.com', {
    //   enableAutoSubdomain: true,
    //   autoSubdomainCreationPatterns: ['*', 'pr*'],
    // });
    // domain.mapRoot(prodBranch);

    // Enhanced CloudWatch Alarms for comprehensive monitoring
    const weatherErrorAlarm = new cloudwatch.Alarm(this, 'WeatherServiceErrors', {
      metric: weatherLambda.metricErrors(),
      threshold: 5,
      evaluationPeriods: 2,
      treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
      alarmDescription: 'Weather service error rate too high',
    });

    const marketErrorAlarm = new cloudwatch.Alarm(this, 'MarketServiceErrors', {
      metric: marketLambda.metricErrors(),
      threshold: 5,
      evaluationPeriods: 2,
      treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
      alarmDescription: 'Market service error rate too high',
    });

    const npcErrorAlarm = new cloudwatch.Alarm(this, 'NPCServiceErrors', {
      metric: npcLambda.metricErrors(),
      threshold: 3,
      evaluationPeriods: 2,
      treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
      alarmDescription: 'NPC service error rate too high',
    });

    const gameStateErrorAlarm = new cloudwatch.Alarm(this, 'GameStateServiceErrors', {
      metric: gameStateLambda.metricErrors(),
      threshold: 10,
      evaluationPeriods: 2,
      treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
      alarmDescription: 'Game state service error rate too high',
    });

    const apiLatencyAlarm = new cloudwatch.Alarm(this, 'APILatencyAlarm', {
      metric: api.metricLatency(),
      threshold: 5000, // 5 seconds
      evaluationPeriods: 3,
      treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
      alarmDescription: 'API Gateway latency too high',
    });

    const api4xxErrorAlarm = new cloudwatch.Alarm(this, 'API4xxErrors', {
      metric: api.metricClientError(),
      threshold: 50,
      evaluationPeriods: 2,
      treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
      alarmDescription: 'API Gateway 4xx error rate too high',
    });

    const api5xxErrorAlarm = new cloudwatch.Alarm(this, 'API5xxErrors', {
      metric: api.metricServerError(),
      threshold: 10,
      evaluationPeriods: 2,
      treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
      alarmDescription: 'API Gateway 5xx error rate too high',
    });

    // DynamoDB throttling alarms
    const gameStateThrottleAlarm = new cloudwatch.Alarm(this, 'GameStateThrottleAlarm', {
      metric: gameStatesTable.metricThrottledRequestsForOperations({
        operations: [dynamodb.Operation.PUT_ITEM, dynamodb.Operation.GET_ITEM],
      }),
      threshold: 5,
      evaluationPeriods: 2,
      treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
      alarmDescription: 'Game states table throttling detected',
    });

    // Comprehensive Performance Dashboard
    const dashboard = new cloudwatch.Dashboard(this, 'HarvestHopeDashboard', {
      dashboardName: 'HarvestHope-Performance',
      widgets: [
        [
          new cloudwatch.GraphWidget({
            title: 'Lambda Function Durations',
            left: [
              weatherLambda.metricDuration(),
              marketLambda.metricDuration(),
              npcLambda.metricDuration(),
              eventLambda.metricDuration(),
              gameStateLambda.metricDuration(),
              financialLambda.metricDuration(),
            ],
            width: 12,
            height: 6,
          }),
        ],
        [
          new cloudwatch.GraphWidget({
            title: 'Lambda Function Errors',
            left: [
              weatherLambda.metricErrors(),
              marketLambda.metricErrors(),
              npcLambda.metricErrors(),
              eventLambda.metricErrors(),
              gameStateLambda.metricErrors(),
              financialLambda.metricErrors(),
            ],
            width: 12,
            height: 6,
          }),
        ],
        [
          new cloudwatch.GraphWidget({
            title: 'Lambda Function Invocations',
            left: [
              weatherLambda.metricInvocations(),
              marketLambda.metricInvocations(),
              npcLambda.metricInvocations(),
              eventLambda.metricInvocations(),
              gameStateLambda.metricInvocations(),
              financialLambda.metricInvocations(),
            ],
            width: 12,
            height: 6,
          }),
        ],
        [
          new cloudwatch.GraphWidget({
            title: 'API Gateway Metrics',
            left: [api.metricCount(), api.metricLatency()],
            right: [api.metricClientError(), api.metricServerError()],
            width: 12,
            height: 6,
          }),
        ],
        [
          new cloudwatch.GraphWidget({
            title: 'DynamoDB Consumed Capacity',
            left: [
              gameStatesTable.metricConsumedReadCapacityUnits(),
              gameStatesTable.metricConsumedWriteCapacityUnits(),
            ],
            right: [
              marketDataTable.metricConsumedReadCapacityUnits(),
              marketDataTable.metricConsumedWriteCapacityUnits(),
            ],
            width: 12,
            height: 6,
          }),
        ],
        [
          new cloudwatch.SingleValueWidget({
            title: 'Active Players (Last 24h)',
            metrics: [gameStateLambda.metricInvocations({ statistic: 'Sum' })],
            width: 6,
            height: 6,
          }),
          new cloudwatch.SingleValueWidget({
            title: 'Total API Requests (Last 24h)',
            metrics: [api.metricCount({ statistic: 'Sum' })],
            width: 6,
            height: 6,
          }),
        ],
      ],
    });

    // Outputs for deployment and monitoring
    new cdk.CfnOutput(this, 'APIGatewayURL', {
      value: api.url,
      description: 'API Gateway URL',
      exportName: 'HarvestHope-API-URL',
    });

    new cdk.CfnOutput(this, 'CloudFrontURL', {
      value: `https://${distribution.distributionDomainName}`,
      description: 'CloudFront distribution URL for assets',
      exportName: 'HarvestHope-CloudFront-URL',
    });

    new cdk.CfnOutput(this, 'AmplifyAppURL', {
      value: `https://${prodBranch.branchName}.${amplifyApp.defaultDomain}`,
      description: 'Amplify App URL',
      exportName: 'HarvestHope-Frontend-URL',
    });

    new cdk.CfnOutput(this, 'AssetsBucketName', {
      value: assetsBucket.bucketName,
      description: 'S3 Assets Bucket Name',
      exportName: 'HarvestHope-Assets-Bucket',
    });

    new cdk.CfnOutput(this, 'DashboardURL', {
      value: `https://console.aws.amazon.com/cloudwatch/home?region=${this.region}#dashboards:name=${dashboard.dashboardName}`,
      description: 'CloudWatch Dashboard URL',
      exportName: 'HarvestHope-Dashboard-URL',
    });

    new cdk.CfnOutput(this, 'GameStatesTableName', {
      value: gameStatesTable.tableName,
      description: 'DynamoDB Game States Table Name',
      exportName: 'HarvestHope-GameStates-Table',
    });

    new cdk.CfnOutput(this, 'MarketDataTableName', {
      value: marketDataTable.tableName,
      description: 'DynamoDB Market Data Table Name',
      exportName: 'HarvestHope-MarketData-Table',
    });

    new cdk.CfnOutput(this, 'NPCTemplatesTableName', {
      value: npcTemplatesTable.tableName,
      description: 'DynamoDB NPC Templates Table Name',
      exportName: 'HarvestHope-NPCTemplates-Table',
    });
  }
}