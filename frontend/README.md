# HR Platform Frontend

A modern, professional Next.js frontend for the HR Platform application.

## Features

- 🎨 Modern UI with Tailwind CSS
- 🔐 Authentication with OTP verification
- 📱 Responsive design
- 🚀 Production-ready
- 🎯 Type-safe with TypeScript
- 🔄 API integration with backend

## Getting Started

1. Install dependencies:
```bash
npm install
```

2. Set up environment variables:
```bash
cp .env.local.example .env.local
# Edit .env.local with your API URL
```

3. Run the development server:
```bash
npm run dev
```

4. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Environment Variables

- `NEXT_PUBLIC_API_URL` - Backend API URL (default: http://localhost:8000/api)
- `NEXT_PUBLIC_FRONTEND_URL` - Frontend URL (default: http://localhost:3000)

## Project Structure

```
frontend/
├── app/              # Next.js app router pages
├── components/       # React components
│   ├── ui/          # Reusable UI components
│   ├── auth/        # Authentication components
│   └── layout/      # Layout components
├── lib/             # Utilities and API client
└── public/          # Static assets
```

## Tech Stack

- Next.js 14+ (App Router)
- TypeScript
- Tailwind CSS
- React 18+
