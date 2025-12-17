# Harvest Hope: The Last Farm

A retro 16-bit farming simulation game that addresses India's agricultural crisis through educational gameplay. The system combines classic farming simulation mechanics with AI-powered weather prediction, market simulation, and NPC generation to create an empathetic learning experience about farmer challenges, government schemes, and financial literacy.

## Project Structure

```
harvest-hope/
├── frontend/          # React + TypeScript + Vite application
├── backend/           # AWS Lambda functions (Python)
├── infrastructure/    # AWS CDK infrastructure code
├── shared/           # Common TypeScript interfaces
└── .kiro/           # Kiro specs and configuration
```

## Getting Started

### Frontend Development
```bash
cd frontend
npm install
npm run dev
```

### Infrastructure Deployment
```bash
cd infrastructure
npm install
npm run cdk deploy
```

### Testing
```bash
cd frontend
npm test              # Run Jest tests
npm run test:coverage # Run tests with coverage
```

## Technology Stack

**Frontend:**
- React 18 with TypeScript
- PixiJS 8 for 2D rendering
- Redux Toolkit for state management
- Tailwind CSS for styling
- Howler.js for audio

**Backend:**
- AWS Lambda (Python 3.11)
- AWS DynamoDB for data persistence
- AWS Bedrock for AI content generation
- AWS S3 for asset storage

**Testing:**
- Jest for unit testing
- fast-check for property-based testing
- React Testing Library for component testing
 AI-Powered Farm Manager for Indian Agriculture Crisis
