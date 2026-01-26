# Kaji Service Platform Backend

## Overview
This is the backend service for the Kaji Service Platform, built with Node.js, Express, and TypeScript. It utilizes Prisma for database ORM (PostgreSQL), and integrates with various third-party services including Cloudinary, SendGrid/Resend, and Sentry.

## Technology Stack
- **Runtime**: Node.js
- **Framework**: Express.js
- **Language**: TypeScript
- **Database**: PostgreSQL (Neon Serverless) via Prisma ORM
- **Validation**: Zod
- **Authentication**: JWT, bcryptjs
- **Real-time**: Socket.io
- **File Storage**: Cloudinary
- **Email**: SendGrid / Resend
- **Logging/Monitoring**: Sentry, Custom Logger
- **Scheduled Tasks**: node-cron

## Completed Features

### 1. Authentication & User Management
- **Auth**: Login, Register, OTP Verification, Password Reset, JWT-based session management.
- **User**: Profile management, Role-based access control (Admin, Seeker, Provider).
- **KYC**: 
    - Individual KYC verification.
    - Industrial/Company KYC verification.

### 2. Services & Jobs
- **Services**: CRUD operations for services, Category management.
- **Jobs**: Job posting, application management, and tracking.
- **Skill Matching**: Algorithms to match seekers with jobs/services.
- **Bookings**: Service booking and status tracking.

### 3. Dashboard & Admin
- **Admin Dashboard**: Comprehensive stats, user management, and platform oversight.
- **Provider Dashboard**: Analytics and management for service providers.
- **Seeker Dashboard**: Activity tracking for service seekers.
- **Bulk Operations**: Mass updates and management tools.
- **Data Export**: Export functionality for reporting.

### 4. Communication & Engagement
- **Messaging**: Real-time chat between users.
- **Notifications**: System and user-triggered notifications.
- **Reviews & Feedback**: Service reviews and platform feedback.
- **Entertainment**: Events and entertainment listings.
- **Learning**: Training and learning resources.

### 5. Financials
- **Payments**: 
    - Full integration with **eSewa** and **Khalti** for digital payments.
    - Transaction tracking and verification.
    - Automatic booking status updates upon payment completion.
- **Analytics**: Financial and operational analytics.

### 6. Infrastructure & Security
- **Security**: Helmet, Rate Limiting, CORS configuration.
- **Health Checks**: Database, Cloudinary, and Email service monitoring.
- **Error Handling**: Centralized error handling with Sentry integration.
- **Trending System**: Scheduled calculations for trending services/jobs.

## Project Structure
```
src/
├── config/         # Configuration (DB, Env, Sentry, etc.)
├── controllers/    # Request handlers
├── middleware/     # Express middleware (Auth, Error, Logger)
├── routes/         # API Route definitions
├── services/       # Business logic and external integrations
├── types/          # TypeScript definitions
├── utils/          # Utility functions
├── server.ts       # Application entry point
└── app.ts          # App setup
```

## Setup & specific instructions

### Prerequisites
- Node.js (v18+)
- PostgreSQL Database
- Cloudinary Account
- SendGrid/Resend Account

### Installation
1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Set up environment variables:
   Copy `.env.example` to `.env` and fill in the required values.
   ```bash
   cp .env.example .env
   ```

### Database Setup
1. Generate Prisma client:
   ```bash
   npm run prisma:generate
   ```
2. Run migrations:
   ```bash
   npm run prisma:migrate
   ```
3. Seed the database (optional):
   ```bash
   npm run prisma:seed
   ```

### Running the Server
- **Development**:
  ```bash
  npm run dev
  ```
- **Production**:
  ```bash
  npm run build
  npm start
  ```

## Pending Implementation / Future Improvements

While the core functionality is extensive, the following areas can be improved:

1.  **API Documentation**:
    -   Implement Swagger/OpenAPI (e.g., using `swagger-ui-express`) to document endpoints for frontend developers.
    -   Currently missing.

2.  **Containerization**:
    -   Add `Dockerfile` and `docker-compose.yml` for consistent development and deployment environments.
    -   Currently missing.

3.  **CI/CD**:
    -   Set up GitHub Actions or similar for automated testing and deployment pipelines.
    -   Currently `test_production_api.sh` exists but no workflow files.

4.  **Testing**:
    -   Expand unit test coverage (currently mostly E2E tests in `tests/` folder).
    -   Ensure tests can run in a CI environment with ephemeral databases.

5.  **Caching**:
    -   Implement Redis for caching frequent requests if scaling becomes an issue (currently relying on DB).
