# HR Platform Frontend

A modern Next.js 14+ TypeScript frontend for the HR Platform, featuring cookie-based authentication, location-based job matching, and comprehensive API integration.

## Features

- ✅ **Landing Page** - Beautiful landing page with Framer Motion animations
- ✅ **Authentication** - Cookie-based auth with automatic token refresh
- ✅ **OTP Verification** - Complete OTP flow with resend functionality
- ✅ **Toast Notifications** - Smooth toast notifications for user feedback
- ✅ **Confetti Animation** - Celebration animations on successful actions
- ✅ **Dynamic Data** - All content fetched from production API
- ✅ **Location-Based** - Ready for location-based features
- ✅ **Responsive Design** - Mobile-first responsive design

## Tech Stack

- **Framework**: Next.js 14+ (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS v4
- **Animations**: Framer Motion
- **HTTP Client**: Axios with interceptors
- **State Management**: React Context
- **Form Handling**: React Hook Form + Zod
- **Notifications**: react-hot-toast
- **Confetti**: canvas-confetti

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn

### Installation

1. Install dependencies:
```bash
npm install
```

2. Set up environment variables:
```bash
cp .env.local.example .env.local
```

The `.env.local` file should contain:
```
NEXT_PUBLIC_API_URL=https://hr-backend-rlth.onrender.com
NEXT_PUBLIC_APP_URL=http://localhost:3001
```

3. Run the development server:
```bash
npm run dev
```

4. Open [http://localhost:3001](http://localhost:3001) in your browser.

## Project Structure

```
frontend/
├── app/                    # Next.js App Router pages
│   ├── auth/              # Authentication pages
│   ├── dashboard/         # Dashboard page
│   ├── kyc/               # KYC pages (placeholder)
│   └── page.tsx           # Landing page
├── components/            # React components
│   ├── auth/             # Auth components (OTP, Resend)
│   ├── landing/          # Landing page components
│   ├── layout/           # Layout components (Navbar)
│   └── ui/               # Reusable UI components
├── context/              # React Context providers
├── hooks/                # Custom React hooks
├── lib/                  # Utility functions and API client
└── types/                # TypeScript type definitions
```

## API Integration

The frontend integrates with the production backend at `https://hr-backend-rlth.onrender.com`.

### Authentication Flow

1. **Register** → User registers with email/password
2. **OTP Verification** → User verifies email with OTP
3. **Login** → User logs in (may require OTP if enabled)
4. **Token Refresh** → Automatic token refresh on 401 errors
5. **Logout** → User logs out and cookies are cleared

### Cookie-Based Auth

- Access tokens stored in httpOnly cookies
- Automatic token refresh on expiration
- Secure cookie handling with credentials: 'include'

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint

## Color Theme

- **Teal**: #14b8a6 (Primary)
- **Purple**: #a855f7 (Primary)
- **Pink**: #ec4899
- **Blue**: #3b82f6
- **Orange**: #f59e0b
- **Background**: #0a0a0a (Dark)
- **Card Background**: #1a1a1a

## Next Steps

- [ ] Implement KYC forms (Individual & Industrial)
- [ ] Add job listing and detail pages
- [ ] Implement location-based filtering
- [ ] Add skill matching features
- [ ] Create dashboard with analytics

## License

ISC
# hr-kaji-frontend
