# MySlotMate - Book Unique Experiences with Amazing Hosts

[![Next.js](https://img.shields.io/badge/Next.js-15.5-black?logo=next.js)](https://nextjs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue?logo=typescript)](https://www.typescriptlang.org)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind%20CSS-3.0-38B2AC?logo=tailwind-css)](https://tailwindcss.com)
[![React](https://img.shields.io/badge/React-19-61dafb?logo=react)](https://react.dev)

## 🎯 About MySlotMate

MySlotMate is a modern platform that connects people with unique experiences and skilled hosts. Whether you're looking to learn a new skill, meet interesting people, or share your expertise, MySlotMate makes it easy to book and host meaningful experiences.

### Key Features

- **Experience Discovery** - Browse and filter unique activities by location, mood, and category
- **Easy Booking** - Seamless booking flow with instant confirmation
- **Host Dashboard** - Comprehensive tools for managing experiences, bookings, and earnings
- **Real-time Messaging** - Communicate directly with guests and hosts
- **Secure Payments** - Integrated payment processing with wallet support
- **Detailed Profiles** - Showcase your expertise and gather reviews
- **Meeting Links & Maps** - Support for online experiences with meeting links and offline events with Google Maps integration
- **Advanced Analytics** - Track earnings, ratings, and performance metrics

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ 
- pnpm 8+ (or npm/yarn)
- Firebase account
- Database setup (PostgreSQL recommended)

### Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/myslotmate.git
cd myslotmate

# Install dependencies
pnpm install

# Set up environment variables
cp .env.example .env.local

# Configure your Firebase and database credentials in .env.local

# Run development server
pnpm dev

# Build for production
pnpm build
pnpm start
```

Visit `http://localhost:3000` to see the application.

## 📁 Project Structure

```
myslotmate/
├── src/
│   ├── app/                          # Next.js app router pages
│   │   ├── (auth)/                   # Authentication pages
│   │   ├── host-dashboard/           # Host management hub
│   │   ├── experience/[id]/          # Experience detail pages
│   │   ├── experiences/              # Browse experiences
│   │   └── ...
│   ├── components/                   # Reusable React components
│   │   ├── host/                     # Host-specific components
│   │   ├── home/                     # Homepage components
│   │   ├── activities/               # Activities/bookings components
│   │   └── ...
│   ├── hooks/                        # Custom React hooks
│   │   └── useApi.ts                 # API integration hooks
│   ├── lib/
│   │   ├── api.ts                    # API type definitions
│   │   └── socket.ts                 # WebSocket configuration
│   ├── styles/                       # Global styles
│   ├── utils/
│   │   └── firebase.ts               # Firebase initialization
│   ├── data/                         # Static data files
│   └── env.js                        # Environment configuration
├── public/                           # Static assets
│── prisma/                          # Database schema (if using Prisma)
└── package.json
```

## 🛠 Tech Stack

- **Framework**: [Next.js 15](https://nextjs.org) - React framework with App Router
- **Language**: [TypeScript](https://www.typescriptlang.org) - Type-safe JavaScript
- **Styling**: [Tailwind CSS](https://tailwindcss.com) - Utility-first CSS
- **Authentication**: [Firebase Auth](https://firebase.google.com/docs/auth) - Secure user management
- **Data Fetching**: [TanStack Query](https://tanstack.com/query) - Server state management
- **Real-time**: WebSocket - Live messaging and updates
- **Icons**: [react-icons](https://react-icons.github.io/react-icons) - Icon library
- **UI Feedback**: [sonner](https://sonner.emilkowal.ski) - Toast notifications
- **Code Quality**: ESLint, Prettier - Code standards

## 🎨 Features in Detail

### For Guests

- **Smart Search** - Discover experiences by mood, location, and availability
- **Detailed Listings** - High-quality photos, descriptions, and host information
- **Easy Booking** - Simple 3-step booking process
- **Reviews** - Read authentic reviews and ratings from other guests
- **Support** - 24/7 support for any questions or issues
- **Saved Experiences** - Bookmark your favorite experiences

### For Hosts

- **Experience Creation** - Easy setup wizard for creating new experiences
- **Calendar Management** - Set availability and manage your schedule
- **Booking Management** - Track and manage incoming bookings
- **Earnings Dashboard** - Monitor your income and payout history
- **Guest Management** - Send messages and build relationships with guests
- **Performance Analytics** - Track ratings and performance metrics
- **Secure Payments** - Integrated payout system with wallet support

## 🔒 Security Features

- Firebase Authentication for secure user management
- JWT tokens for API authentication
- Rate limiting on API endpoints
- Data validation and sanitization
- HTTPS enforced in production
- Environment variable protection
- SQL injection prevention
- XSS protection with React's built-in escaping

## 📱 Responsive Design

MySlotMate is fully responsive and works seamlessly on:
- Desktop (1920px and above)
- Laptop (1024px - 1919px)
- Tablet (768px - 1023px)
- Mobile (320px - 767px)

## 🌐 SEO & Performance

- **Server-Side Rendering** - Pages are server-rendered for better SEO
- **Dynamic Meta Tags** - Each page has unique meta descriptions and titles
- **Open Graph Tags** - Rich sharing on social media
- **Sitemap** - Auto-generated sitemap for search engines
- **Core Web Vitals** - Optimized for speed and performance
- **Mobile First** - Mobile-optimized experience
- **Structured Data** - JSON-LD schema markup for rich results

## 🚀 Performance Optimizations

- Image optimization with Next.js Image component
- Code splitting and lazy loading
- CSS-in-JS with Tailwind for minimal bundle size
- Caching strategies with React Query
- Edge runtime for faster responses
- Database query optimization

## 📊 Analytics & Monitoring

- User engagement tracking
- Error logging and monitoring
- Performance metrics collection
- Conversion tracking
- User behavior analysis

## 🔧 Development

### Available Scripts

```bash
# Development server
pnpm dev

# Build for production
pnpm build

# Start production server
pnpm start

# Run linter
pnpm lint

# Format code
pnpm format

# Type checking
pnpm type-check
```

### Environment Variables

Create a `.env.local` file with the following variables:

```env
# Firebase Configuration
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=

# API Configuration
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_SOCKET_URL=ws://localhost:8000

# Application Settings
NEXT_PUBLIC_APP_NAME=MySlotMate
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

## 🤝 Contributing

We welcome contributions! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 Code Standards

- Follow TypeScript strict mode
- Use functional components with hooks
- Keep components small and focused
- Extract reusable logic into custom hooks
- Use semantic HTML
- Follow Tailwind CSS conventions
- Write meaningful commit messages

## 🐛 Bug Reports

Found a bug? Please open an issue on GitHub with:
- Description of the bug
- Steps to reproduce
- Expected vs actual behavior
- Screenshots (if applicable)
- Environment details

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.


## 🗺️ Roadmap

- [ ] Mobile app (React Native)
- [ ] Video calls for online experiences
- [ ] Group experiences support
- [ ] Advanced filtering and search
- [ ] AI-powered recommendations
- [ ] Multi-language support
- [ ] Live streaming capabilities

---

**Made with ❤️ by the MySlotMate Team**
