# Technology Stack Overview

This document provides a comprehensive overview of all technologies, tools, and services used across the three main applications in this policy research platform.

## Architecture Overview

The platform consists of three main components:
- **webApi**: Backend API server with AI agents and research capabilities
- **resource-watch**: Next.js frontend application for data visualization
- **webApp**: Lit-based web components for live research interface

## AI/ML Services & Tools

### OpenAI GPT-4
- **Models**: `gpt-4-turbo`, `gpt-4-0125-preview`
- **Usage**: Chat completions, policy research, content generation
- **Integration**: Direct API calls with streaming responses
- **Configuration**: Environment variable `OPENAI_API_KEY`

### LangChain
- **Package**: `@langchain/openai`
- **Purpose**: Structured AI agent workflows and OpenAI integration
- **Features**: Agent orchestration, prompt management

## Databases & Storage

### PostgreSQL
- **Version**: 17 (Alpine Docker image)
- **Connection**: `postgresql://policysynth:policysynth123@localhost:5432/policysynth`
- **Usage**: Primary relational database for persistent data
- **Docker**: `postgres:17-alpine`

### Redis
- **Version**: 6.2.13 (Alpine)
- **Multiple Instances**:
  - Session storage and management
  - Memory caching for chat logs
  - Agent communication and coordination
- **Ports**: 6379
- **Docker**: `redis:6.2.13-alpine`

### Weaviate (Vector Database)
- **Version**: 1.24.1
- **Purpose**: RAG (Retrieval Augmented Generation) system
- **Features**:
  - Document embeddings storage
  - Semantic search capabilities
  - OpenAI text2vec integration
- **Port**: 8080
- **Authentication**: API key-based

## Web Frameworks & Frontend

### Next.js (Resource Watch)
- **Version**: 12.1.6
- **Features**:
  - Server-side rendering (SSR)
  - Static site generation (SSG)
  - API routes
  - Image optimization
- **Build Tool**: Webpack integration

### React (Resource Watch)
- **Version**: 17.0.2
- **Ecosystem**:
  - Redux for state management
  - React Query for data fetching
  - Material-UI components
  - React Router for navigation

### Lit (WebApp)
- **Purpose**: Web components framework
- **Features**:
  - TypeScript-based custom elements
  - Material Design 3 integration
  - Reactive properties and lifecycle
- **Build**: Rollup bundler

### Express.js
- **Usage**: RESTful API server framework
- **Features**:
  - Middleware support
  - CORS configuration
  - WebSocket integration
  - Session management

## Mapping & Visualization

### Mapbox GL JS
- **Purpose**: Interactive mapping and geospatial visualization
- **Features**:
  - Vector tile rendering
  - Custom styling
  - Real-time data updates
- **Authentication**: API token required

### Deck.gl
- **Version**: 8.7.8
- **Purpose**: WebGL-powered data visualization
- **Features**:
  - High-performance rendering
  - Layer-based architecture
  - Geospatial data support

### D3.js
- **Usage**: Data visualization and manipulation
- **Features**:
  - Format utilities
  - Chart generation
  - Data transformation

## Development & Build Tools

### TypeScript
- **Version**: ~4.9.5 / ^5.8.3
- **Usage**: Primary development language across all applications
- **Configuration**: Strict type checking enabled

### Build Tools
- **Webpack**: Module bundling for Next.js application
- **Rollup**: ES module bundling for Lit components
- **Babel**: JavaScript transpilation
- **PostCSS**: CSS processing and optimization

### Package Management
- **Yarn**: Version 3.1.1
- **Features**:
  - Workspace management
  - Zero-installs capability
  - Plugin system

## Web Scraping & Research

### Puppeteer
- **Version**: 24.16.1
- **Purpose**: Headless browser automation
- **Features**:
  - Web scraping
  - Content extraction
  - Screenshot generation

### Puppeteer Extra
- **Plugins**:
  - Stealth plugin for detection avoidance
  - Enhanced scraping capabilities
- **Usage**: Policy research and web content analysis

## Testing & Quality Assurance

### End-to-End Testing
- **Cypress**: Version 8.5.0
- **Features**:
  - Browser automation
  - Visual testing
  - API testing

### Unit Testing
- **Mocha**: Test runner for backend
- **Jest**: JavaScript testing framework
- **Chai**: Assertion library

### Code Quality
- **ESLint**: Code linting and style enforcement
- **Prettier**: Code formatting
- **Husky**: Git hooks for pre-commit checks

## Infrastructure & Deployment

### Containerization
- **Docker**: Container runtime
- **Docker Compose**: Multi-container orchestration
- **Base Images**: Node.js Alpine, PostgreSQL, Redis

### Orchestration
- **Kubernetes**: Container orchestration (k8s configurations)
- **Features**:
  - Service discovery
  - Load balancing
  - Auto-scaling

### CI/CD
- **Jenkins**: Continuous integration and deployment
- **Pipeline**: Automated testing and deployment

## Cloud Services & APIs

### AWS Services
- **S3**: Static asset storage and CDN
- **Usage**: Image hosting, file storage

### Third-Party APIs
- **Google Analytics**: Web analytics and user tracking
- **Google Maps**: Additional mapping services
- **Bitly**: URL shortening service
- **reCAPTCHA**: Bot protection and security

## Real-Time Communication

### WebSocket
- **Purpose**: Real-time chat and updates
- **Features**:
  - Bidirectional communication
  - Live cost updates
  - Agent status broadcasting

## Policy Synth Framework

### Custom Packages
- **@policysynth/agents**: AI agent framework
  - Web research agents
  - Search query generation and ranking
  - Content analysis and summarization

- **@policysynth/api**: Custom API framework
  - Base chat bot implementation
  - Memory management
  - Cost tracking

- **@policysynth/webapp**: Shared web components
  - Reusable UI components
  - Common utilities
  - Theme management

## Environment Configuration

### Development
```bash
NODE_ENV=development
PORT=3000 (resource-watch) / 5029 (webApi) / 2990 (webApp)
OPENAI_API_KEY=sk-...
DATABASE_URL=postgresql://...
REDIS_URL=redis://localhost:6379
WEAVIATE_APIKEY=...
```

### Production
- Environment-specific configurations
- Secure API key management
- Optimized build settings
- CDN integration

## Performance & Optimization

### Frontend Optimization
- **Code Splitting**: Dynamic imports and lazy loading
- **Bundle Analysis**: Webpack Bundle Analyzer
- **Image Optimization**: Next.js Image component
- **CSS Optimization**: Tailwind CSS with purging

### Backend Optimization
- **Caching**: Redis-based caching strategies
- **Database**: Connection pooling and query optimization
- **API**: Rate limiting and response compression

## Security Features

- **CORS**: Comprehensive cross-origin resource sharing
- **Authentication**: API key-based authentication
- **Input Validation**: Request sanitization
- **Environment Variables**: Secure configuration management

## Monitoring & Analytics

- **Cost Tracking**: Real-time LLM usage monitoring
- **Performance Metrics**: Response time tracking
- **Error Logging**: Comprehensive error handling
- **User Analytics**: Google Analytics integration

---

## Getting Started

Each application has its own setup requirements:

1. **webApi**: Requires PostgreSQL, Redis, and Weaviate setup
2. **resource-watch**: Standard Next.js development environment
3. **webApp**: Lit-based development with Rollup bundling

Refer to individual README files in each directory for specific setup instructions.