# Harvest Hope Project Configuration

## Project Structure
```
harvest-hope/
├── frontend/          # React + TypeScript + Vite application
│   ├── src/
│   │   ├── components/    # React components
│   │   ├── services/      # API services and business logic
│   │   ├── store/         # Redux store configuration
│   │   ├── types/         # TypeScript type definitions
│   │   └── utils/         # Utility functions
│   ├── jest.config.cjs    # Jest testing configuration
│   └── package.json       # Frontend dependencies
├── backend/           # AWS Lambda functions (Python)
│   ├── weather/       # Weather prediction service
│   ├── market/        # Market simulation service
│   ├── npc/           # NPC generation service
│   ├── events/        # Event generation service
│   └── gamestate/     # Game state management service
├── infrastructure/    # AWS CDK infrastructure code
│   ├── lib/           # CDK stack definitions
│   ├── bin/           # CDK app entry point
│   └── cdk.json       # CDK configuration
├── shared/           # Common TypeScript interfaces
│   └── types/        # Shared type definitions
└── .kiro/           # Kiro specs and configuration
```

## Technology Stack

### Frontend
- **React 18** with TypeScript for component-based UI
- **PixiJS 8** for high-performance 2D rendering and pixel art
- **Redux Toolkit** for predictable state management
- **Tailwind CSS** for responsive UI styling
- **Howler.js** for 8-bit audio and spatial sound effects
- **Vite** for fast development and optimized builds

### Backend
- **AWS Lambda** (Python 3.11) for serverless compute
- **AWS API Gateway** for RESTful endpoints
- **AWS DynamoDB** for game state persistence
- **AWS S3** for static assets (sprites, audio, data files)
- **AWS Bedrock** (Claude 3.5 Sonnet) for AI content generation
- **AWS CloudWatch** for monitoring and logging

### Testing
- **Jest** for unit testing
- **fast-check** for property-based testing (minimum 100 iterations per property)
- **React Testing Library** for component testing
- **@testing-library/jest-dom** for DOM testing utilities

## Development Commands

### Frontend Development
```bash
cd frontend
npm run dev          # Start development server
npm run build        # Build for production
npm test             # Run Jest tests
npm run test:watch   # Run tests in watch mode
npm run test:coverage # Run tests with coverage report
```

### Infrastructure Management
```bash
cd infrastructure
npm run synth        # Synthesize CloudFormation template
npm run deploy       # Deploy to AWS
npm run destroy      # Destroy AWS resources
npm run diff         # Show differences
```

## Configuration Files

### Jest Configuration (frontend/jest.config.cjs)
- Configured for TypeScript and JSX
- Uses jsdom environment for DOM testing
- Includes fast-check for property-based testing
- Coverage collection from src/ directory

### CDK Configuration (infrastructure/cdk.json)
- TypeScript compilation with ts-node
- Watch mode for development
- Modern CDK feature flags enabled

### AWS Resources Created
- **DynamoDB Tables**: GameStates, NPCTemplates, MarketData, PlayerStats
- **S3 Buckets**: Assets, Data, Configs
- **Lambda Functions**: Weather, Market, NPC, Event, GameState
- **API Gateway**: RESTful API with CORS enabled
- **IAM Roles**: Lambda execution role with appropriate permissions

## Requirements Addressed
- **Requirement 1.1**: React + TypeScript + Vite project with proper configuration ✓
- **Requirement 10.1**: AWS CDK infrastructure for Lambda functions and DynamoDB ✓
- Testing frameworks (Jest, fast-check) configured ✓
- Basic project structure with folders for components, services, and types ✓