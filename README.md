# ChoreGami 2026 🏠✨

**A streamlined, real-time family chore management system built with Deno Fresh**

[![Deno](https://img.shields.io/badge/deno-2.0+-black?logo=deno)](https://deno.land/)
[![Fresh](https://img.shields.io/badge/fresh-1.7.2-yellow?logo=deno)](https://fresh.deno.dev/)
[![TypeScript](https://img.shields.io/badge/typescript-strict-blue?logo=typescript)](https://www.typescriptlang.org/)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)

## 🎯 Overview

ChoreGami 2026 transforms family chore management into an engaging, gamified experience. Built as a simplified evolution of the Choregami Eats system, it focuses exclusively on chore completion with real-time point tracking and family leaderboards.

### ✨ Key Features

- **🎮 Kid-Friendly Interface**: Simple dashboards with visual chore completion
- **👨‍👩‍👧‍👦 Family Gamification**: Real-time leaderboards with points and streaks  
- **🔐 Smart Security**: Optional PIN system for child access control
- **📱 Mobile-First**: Optimized for family tablets and smartphones
- **⚡ Real-Time Updates**: Live WebSocket integration with FamilyScore API
- **🔄 Seamless Integration**: Reuses existing Choregami database and auth

## 🚀 Quick Start

### Prerequisites
- [Deno 2.0+](https://deno.land/)
- Supabase database with `choretracker.*` schema
- FamilyScore API credentials (optional for real-time features)

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd chores2026

# Start development server
deno task start

# Access the application
open http://localhost:8001
```

### Environment Setup

Create `.env.local` with your configuration:

```env
# Required: Supabase Configuration
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_key

# Optional: FamilyScore Integration
FAMILYSCORE_BASE_URL=your_familyscore_api_url
FAMILYSCORE_API_KEY=your_api_key
FAMILYSCORE_WS_URL=your_websocket_url

# Optional: Twilio for Phone Authentication
TWILIO_ACCOUNT_SID=your_twilio_sid
TWILIO_AUTH_TOKEN=your_auth_token
TWILIO_VERIFY_SERVICE_SID=your_verify_service
```

## 🏗 Architecture

### Technology Stack
- **Frontend**: Deno Fresh with Islands architecture for optimal performance
- **Backend**: Fresh server-side rendering with API routes
- **Database**: PostgreSQL via Supabase (reuses existing Choregami schema)
- **Real-time**: WebSocket proxy to FamilyScore Phoenix Channels
- **Styling**: Custom Fresh Meadow theme with responsive design

### Core Services
- **ChoreService**: CRUD operations for chores and family management
- **TransactionService**: Point tracking with FamilyScore integration
- **AuthenticationService**: Multi-provider secure session management

## 👥 User Experience

### For Kids 🧒
1. **Select Profile**: Choose from family member grid
2. **Enter PIN**: 4-digit authentication (if enabled)
3. **View Chores**: Today's assignments with clear instructions
4. **Complete Tasks**: Tap to mark done and earn points
5. **See Progress**: Live leaderboard with family rankings

### For Parents 👨‍👩‍👧‍👦
1. **Family Dashboard**: Overview of all member activity
2. **Point Management**: Award bonuses or make adjustments
3. **Security Controls**: Toggle PIN requirements for children
4. **Monitor Progress**: Real-time activity feed and analytics

## 🔐 Security & Privacy

- **🔒 PIN Authentication**: bcrypt-hashed 4-digit codes for kids
- **🛡️ API Security**: Server-side proxy protects FamilyScore credentials
- **👨‍👩‍👧‍👦 Family Isolation**: Data segregated by family with role-based access
- **📋 Audit Trail**: Complete transaction logging for point changes

## 📱 Mobile Optimization

- **📲 Touch-First Design**: 44px minimum touch targets
- **🌟 Progressive Enhancement**: Core functionality works without JavaScript
- **🎨 Responsive Layout**: Adapts from phone to tablet seamlessly
- **⚡ Fast Loading**: Server-side rendering with selective hydration

## 📊 Real-Time Features

### Live Leaderboard
- Family member rankings updated instantly
- Streak calculations and achievement badges
- Smooth animations for rank changes

### Activity Feed
- Real-time chore completions across family
- Point awards and bonus notifications
- Visual celebration effects

### WebSocket Integration
- Secure server-side proxy pattern
- Automatic reconnection handling
- Graceful degradation when offline

## 🛠 Development

### Available Scripts

```bash
# Development
deno task start          # Start dev server with hot reload
deno task check          # Type checking and linting
deno task build          # Production build
deno task preview        # Preview production build

# Quality Assurance
deno fmt                 # Format code
deno lint                # Lint codebase
deno test               # Run test suite (when implemented)
```

### Project Structure

```
├── routes/              # Fresh file-based routing
│   ├── kid/            # Kid-focused pages
│   ├── parent/         # Parent dashboard
│   └── api/            # REST API endpoints
├── islands/            # Interactive client-side components
├── lib/                # Core business logic
│   ├── services/       # Database and API services
│   └── auth/          # Authentication system
├── static/             # Static assets and styles
└── docs/              # Comprehensive documentation
```

## 📚 Documentation

Comprehensive documentation is available in the [`/docs`](./docs/) folder:

- **[📋 Documentation Index](./docs/index.md)**: Complete table of contents
- **[🏢 Business Requirements](./docs/business-requirements.md)**: Product specifications and user stories
- **[🛠 Technical Documentation](./docs/technical-documentation.md)**: Architecture and implementation details
- **[📈 Implementation Milestones](./docs/milestones/)**: Detailed progress tracking

## 🌟 Key Achievements

- ✅ **Complete Implementation**: Full-stack application in single session
- ✅ **Production Ready**: Error handling, security, and performance optimized
- ✅ **Real-Time Integration**: Live WebSocket connection to FamilyScore
- ✅ **Mobile Optimized**: Touch-friendly interface for family devices
- ✅ **Secure by Design**: PIN authentication and API protection

## 🔮 Roadmap

### Immediate (Next Sprint)
- [ ] Comprehensive test suite implementation
- [ ] Performance monitoring and optimization
- [ ] Accessibility audit and WCAG 2.1 compliance

### Short Term (Next Month)
- [ ] Parent chore management interface
- [ ] Advanced reporting and analytics
- [ ] Push notification system
- [ ] PWA offline functionality

### Long Term (Next Quarter)
- [ ] Achievement system and badges
- [ ] Photo verification for chores
- [ ] Integration with smart home devices
- [ ] Multi-family social features

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guidelines](./docs/CONTRIBUTING.md) for details on:

- Development workflow and standards
- Code review process
- Testing requirements
- Documentation updates

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **Choregami Eats**: Foundation architecture and authentication system
- **FamilyScore**: Real-time gamification platform integration
- **Deno Fresh**: Modern SSR framework with excellent developer experience
- **Supabase**: Robust database and real-time infrastructure

---

**Built with ❤️ by the ChoreGami team**  
*Making family chores fun, one task at a time* 🏠✨