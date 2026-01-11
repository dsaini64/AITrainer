# AI Longevity Coach - Personal Health & Wellness Platform

<div align="center">

![Next.js](https://img.shields.io/badge/Next.js-15.5-black?style=for-the-badge&logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue?style=for-the-badge&logo=typescript)
![Supabase](https://img.shields.io/badge/Supabase-3.0-green?style=for-the-badge&logo=supabase)
![OpenAI](https://img.shields.io/badge/OpenAI-GPT--4o--mini-412991?style=for-the-badge&logo=openai)

**An intelligent, AI-powered personal longevity coach that provides personalized health guidance, tracks progress, and helps users achieve their wellness goals through evidence-based recommendations.**

[Features](#key-features) • [Tech Stack](#tech-stack) • [Getting Started](#getting-started) • [Architecture](#architecture) • [Demo](#demo)

</div>

---

## Table of Contents

- [Overview](#overview)
- [Key Features](#key-features)
- [Tech Stack](#tech-stack)
- [Architecture](#architecture)
- [Getting Started](#getting-started)
- [Project Structure](#project-structure)
- [API Documentation](#api-documentation)
- [Deployment](#deployment)
- [Contributing](#contributing)
- [License](#license)

## Overview

AI Longevity Coach is a full-stack web application that combines **artificial intelligence**, **real-time data analytics**, and **personalized coaching** to help users improve their health and longevity. Built with modern web technologies, it features:

- **AI-Powered Coaching** with GPT-4o-mini integration
- **Real-Time Analytics** with correlation analysis and predictive insights
- **RAG (Retrieval-Augmented Generation)** for evidence-based responses
- **MCP (Model Context Protocol)** for dynamic tool integration
- **Responsive Design** optimized for mobile and desktop
- **Secure Authentication** with Supabase Auth
- **Health Metrics Tracking** with visualization dashboards
- **Goal Management** with habit tracking and adherence monitoring

## Key Features

### Intelligent AI Coach
- **Conversational Interface**: Natural language chat with streaming responses
- **Context-Aware**: Understands user goals, metrics, and preferences
- **Multiple Modes**: Explain, Plan, Motivate, and Check-in modes
- **RAG Integration**: Retrieves relevant health information from knowledge base
- **MCP Tools**: Dynamic tool execution for real-time data access
- **Safety Guardrails**: Medical emergency detection and professional guidance

### Advanced Analytics
- **Correlation Analysis**: Identifies relationships between health metrics
- **Predictive Insights**: Forecasts trends and potential health outcomes
- **Risk Assessment**: Calculates health risk scores based on multiple factors
- **Interactive Dashboards**: Real-time data visualization with Recharts
- **Weekly Reports**: Comprehensive health summaries and recommendations

### Goal & Habit Tracking
- **SMART Goals**: Specific, measurable goals across 6 categories
- **Habit Ladders**: Progressive habit building with starter/solid/stretch levels
- **Adherence Tracking**: Real-time progress monitoring with streak tracking
- **Next Best Action**: AI-suggested optimal next steps

### Device Integrations
- **Apple Health**: Seamless data synchronization
- **Google Fit**: Activity and health data import
- **Fitbit**: Wearable device integration
- **Manual Entry**: Flexible data input options

### Proactive Coaching
- **Smart Notifications**: Context-aware reminders and nudges
- **Quiet Hours**: Respects user-defined notification preferences
- **Pattern Recognition**: Identifies behavioral patterns and suggests improvements
- **Celebration Messages**: Recognizes achievements and milestones

### Security & Privacy
- **Row-Level Security**: Database-level access control
- **Encrypted Storage**: All sensitive data encrypted at rest
- **Privacy Controls**: User-controlled data sharing and export
- **GDPR Compliant**: Easy data export and account deletion

## Tech Stack

### Frontend
- **Framework**: Next.js 15.5 with App Router
- **Language**: TypeScript 5.0
- **Styling**: Tailwind CSS 4.0
- **UI Components**: Radix UI primitives
- **Charts**: Recharts for data visualization
- **Icons**: Lucide React
- **State Management**: React Context API

### Backend
- **Runtime**: Node.js 18+
- **API**: Next.js API Routes
- **Database**: Supabase (PostgreSQL with pgvector)
- **Authentication**: Supabase Auth
- **Vector Store**: pgvector for semantic search
- **AI**: OpenAI GPT-4o-mini

### Infrastructure
- **Containerization**: Docker with multi-stage builds
- **Reverse Proxy**: Nginx
- **Orchestration**: Kubernetes (optional)
- **CI/CD**: GitHub Actions ready
- **Deployment**: Vercel, Docker, or Kubernetes

### AI & ML
- **LLM**: OpenAI GPT-4o-mini
- **RAG**: Retrieval-Augmented Generation with vector embeddings
- **MCP**: Model Context Protocol for tool integration
- **Embeddings**: OpenAI text-embedding-3-small

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        Frontend Layer                        │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐   │
│  │ Dashboard│  │  Coach   │  │  Goals   │  │ Insights │   │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘   │
│       └─────────────┴─────────────┴─────────────┘          │
│                        Next.js App Router                    │
└────────────────────────────┬────────────────────────────────┘
                             │
┌────────────────────────────┴────────────────────────────────┐
│                      API Layer (Next.js)                     │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐   │
│  │   Chat   │  │ Analytics│  │  Coach   │  │ Dashboard│   │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘   │
│       │             │              │              │          │
│  ┌────┴─────────────┴──────────────┴──────────────┴─────┐  │
│  │         AI Engine (OpenAI + RAG + MCP)                │  │
│  └───────────────────────────────────────────────────────┘  │
└────────────────────────────┬────────────────────────────────┘
                             │
┌────────────────────────────┴────────────────────────────────┐
│                    Data Layer (Supabase)                     │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐   │
│  │  Users   │  │ Metrics  │  │  Goals   │  │Knowledge │   │
│  │          │  │          │  │          │  │   Base   │   │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘   │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐                 │
│  │ Check-ins│  │ Messages │  │ Devices  │                 │
│  └──────────┘  └──────────┘  └──────────┘                 │
│                    PostgreSQL + pgvector                    │
└─────────────────────────────────────────────────────────────┘
```

### Key Architectural Decisions

1. **Server-Side Rendering**: Next.js App Router for optimal performance
2. **Streaming Responses**: Server-Sent Events for real-time AI responses
3. **Vector Search**: pgvector for semantic search in knowledge base
4. **Tool Integration**: MCP protocol for dynamic AI tool execution
5. **Type Safety**: Full TypeScript coverage with strict mode
6. **Security**: Row-Level Security policies for data access control

## Getting Started

### Prerequisites

- **Node.js** 18+ and npm
- **Supabase** account (free tier works)
- **OpenAI API key** (for AI features)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/ai-longevity-coach.git
   cd ai-longevity-coach
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp env.example .env.local
   ```
   
   Edit `.env.local` with your credentials:
   ```env
   # Supabase Configuration
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

   # OpenAI API Key
   OPENAI_API_KEY=your_openai_api_key

   # Application URL
   NEXT_PUBLIC_APP_URL=http://localhost:3000
   ```

4. **Set up the database**
   
   Run the migrations in `supabase/migrations/`:
   - `seed.sql` - Main schema
   - `add_vector_store.sql` - Vector search setup
   - `add_notifications_table.sql` - Notifications
   - `add_completed_actions_table.sql` - Action tracking

5. **Initialize the knowledge base**
   ```bash
   curl -X POST http://localhost:3000/api/ai/init-knowledge-base
   ```

6. **Start the development server**
   ```bash
   npm run dev
   ```

7. **Open your browser**
   
   Navigate to [http://localhost:3000](http://localhost:3000)

### Quick Start Script

For a complete setup, use the provided script:

```bash
./scripts/setup-supabase.sh
./scripts/setup-mcp-rag.sh
```

## Project Structure

```
ai-longevity-coach/
├── src/
│   ├── app/                    # Next.js App Router pages
│   │   ├── api/               # API routes
│   │   │   ├── ai/           # AI endpoints (RAG, MCP)
│   │   │   ├── chat/         # Chat API
│   │   │   ├── coach/        # Coach endpoints
│   │   │   ├── analytics/    # Analytics API
│   │   │   └── dashboard/    # Dashboard data
│   │   ├── coach/            # AI Coach page
│   │   ├── goals/            # Goals management
│   │   ├── insights/         # Analytics dashboard
│   │   └── profile/          # User profile
│   ├── components/           # React components
│   │   ├── ai/              # AI-related components
│   │   ├── coach/           # Coach UI components
│   │   ├── dashboard/       # Dashboard components
│   │   └── ui/              # Reusable UI components
│   ├── lib/                 # Utility libraries
│   │   ├── ai/             # AI logic (OpenAI, RAG, MCP)
│   │   ├── analytics/      # Analytics engines
│   │   ├── api/            # API client functions
│   │   └── supabase/       # Supabase client
│   ├── hooks/              # Custom React hooks
│   ├── contexts/           # React contexts
│   └── types/              # TypeScript types
├── supabase/
│   ├── migrations/         # Database migrations
│   └── seed.sql           # Initial schema
├── public/                # Static assets
├── scripts/               # Setup scripts
└── kubernetes/           # K8s deployment configs
```

## API Documentation

### Chat API

**POST** `/api/chat`

Streams AI coach responses with context awareness.

```typescript
{
  message: string;
  userId: string;
  mode?: 'explain' | 'plan' | 'motivate' | 'checkin';
}
```

### Analytics API

**GET** `/api/analytics/correlations`

Returns correlation matrix between health metrics.

**GET** `/api/analytics/predictions`

Returns predictive insights based on user data.

### Dashboard API

**GET** `/api/dashboard`

Returns comprehensive dashboard data including KPIs, progress, and next actions.

See [API Documentation](./docs/API.md) for complete details.

## Deployment

### Vercel (Recommended)

```bash
npm run deploy:production
```

### Docker

```bash
docker build -t ai-longevity-coach .
docker run -p 3000:3000 ai-longevity-coach
```

### Kubernetes

```bash
kubectl apply -f kubernetes/
```

See [DEPLOYMENT.md](./docs/DEPLOYMENT.md) for detailed instructions.

## Testing

```bash
# Run tests
npm run test

# Type checking
npm run type-check

# Linting
npm run lint

# E2E tests
npm run test:e2e
```

## Performance

- **Lighthouse Score**: 95+ Performance
- **First Contentful Paint**: < 1.5s
- **Time to Interactive**: < 3s
- **API Response Time**: < 200ms average

## Security

- ✅ Row-Level Security (RLS) policies
- ✅ SQL injection prevention
- ✅ XSS protection
- ✅ CSRF protection
- ✅ Rate limiting
- ✅ Input validation
- ✅ Secure authentication

## Contributing

Contributions are welcome! Please see [CONTRIBUTING.md](./CONTRIBUTING.md) for guidelines.

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](./LICENSE) file for details.

## Acknowledgments

- OpenAI for GPT-4o-mini API
- Supabase for backend infrastructure
- Next.js team for the amazing framework
- Radix UI for accessible components

## Contact

**Your Name** - [your.email@example.com](mailto:your.email@example.com)

Project Link: [https://github.com/yourusername/ai-longevity-coach](https://github.com/yourusername/ai-longevity-coach)

---

<div align="center">

**Built with Next.js, TypeScript, and OpenAI**

⭐ Star this repo if you find it helpful!

</div>
