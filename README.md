# HR Platform Backend

A comprehensive HR platform backend similar to LinkedIn, built with TypeScript, Node.js, Express.js, Prisma, and PostgreSQL. Features location-based skill matching, hiring, learning, certifications, and more.

## Features

- **Individual KYC Management**: Complete profile management for job seekers
- **Industrial KYC Management**: Company/employer profile management
- **Job Posting & Applications**: Full job posting and application system
- **Location-based Skill Matching**: Intelligent matching of candidates to jobs based on skills and location
- **Training & Learning**: Course management and enrollment system
- **Exams & Certifications**: Exam booking and certification management
- **Events**: Webinar, seminar, and workshop management
- **Trending Jobs & Skills**: Analytics for trending jobs and skills
- **File Uploads**: Cloudinary integration for media and document uploads

## Tech Stack

- **Runtime**: Node.js
- **Framework**: Express.js
- **Language**: TypeScript
- **Database**: PostgreSQL
- **ORM**: Prisma
- **File Storage**: Cloudinary
- **File Upload**: Multer
- **Validation**: Zod

## Prerequisites

- Node.js (v18 or higher)
- Neon PostgreSQL database (or any PostgreSQL database)
  - Sign up at [neon.tech](https://neon.tech) (free tier available)
- Cloudinary account (for file uploads)
- npm or yarn

## Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd bt-baj
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env
```

Edit `.env` and fill in your configuration:
```env
# Neon Database (get from https://console.neon.tech)
DATABASE_URL="postgresql://user:password@ep-xxx-xxx.region.aws.neon.tech/neondb?sslmode=require"
SHADOW_DATABASE_URL="postgresql://user:password@ep-xxx-xxx.region.aws.neon.tech/neondb_shadow?sslmode=require"

# JWT Secrets (generate with: openssl rand -base64 32)
JWT_ACCESS_SECRET=your-access-token-secret-min-32-chars
JWT_REFRESH_SECRET=your-refresh-token-secret-min-32-chars
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# Email (Gmail App Password)
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password

# Cloudinary
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret

# Server
PORT=3000
NODE_ENV=development
FRONTEND_URL=http://localhost:3001
```

4. Set up the database:
```bash
# Generate Prisma Client
npm run prisma:generate

# Run migrations
npm run prisma:migrate

# Or push schema directly (for development)
npm run prisma:push
```

5. Start the development server:
```bash
npm run dev
```

The server will start on `http://localhost:3000`

## API Endpoints

### Individual KYC
- `POST /api/individual-kyc` - Create individual KYC profile
- `GET /api/individual-kyc` - Get all individual KYC profiles (with filters)
- `GET /api/individual-kyc/:userId` - Get individual KYC by user ID
- `PUT /api/individual-kyc/:userId` - Update individual KYC
- `PATCH /api/individual-kyc/:userId/status` - Update KYC status

### Industrial KYC
- `POST /api/industrial-kyc` - Create industrial KYC profile
- `GET /api/industrial-kyc` - Get all industrial KYC profiles
- `GET /api/industrial-kyc/:userId` - Get industrial KYC by user ID
- `PUT /api/industrial-kyc/:userId` - Update industrial KYC
- `PATCH /api/industrial-kyc/:userId/status` - Update KYC status

### Job Postings
- `POST /api/jobs` - Create job posting
- `GET /api/jobs` - Get all job postings (with filters)
- `GET /api/jobs/:id` - Get job posting by ID
- `PUT /api/jobs/:id` - Update job posting
- `DELETE /api/jobs/:id` - Deactivate job posting

### Job Applications
- `POST /api/applications` - Apply for a job (requires resume upload)
- `GET /api/applications` - Get all applications (with filters)
- `GET /api/applications/:id` - Get application by ID
- `PATCH /api/applications/:id/status` - Update application status

### Training
- `POST /api/training/courses` - Create training course
- `GET /api/training/courses` - Get all training courses
- `GET /api/training/courses/:id` - Get training course by ID
- `POST /api/training/enroll` - Enroll in a training course
- `GET /api/training/enrollments` - Get all enrollments
- `PATCH /api/training/enrollments/:id` - Update enrollment progress

### Exams
- `POST /api/exams` - Create exam
- `GET /api/exams` - Get all exams
- `GET /api/exams/:id` - Get exam by ID
- `POST /api/exams/book` - Book an exam
- `GET /api/exams/bookings` - Get all exam bookings
- `PATCH /api/exams/bookings/:id` - Update exam booking
- `PATCH /api/exams/bookings/:id/retotaling` - Request retotaling

### Certifications
- `POST /api/certifications` - Create certification
- `GET /api/certifications/:id` - Get certification by ID
- `GET /api/certifications/verify?verificationCode=xxx` - Verify certification
- `GET /api/certifications/user/:userId` - Get user certifications

### Events
- `POST /api/events` - Create event
- `GET /api/events` - Get all events
- `GET /api/events/:id` - Get event by ID
- `POST /api/events/register` - Register for an event
- `GET /api/events/registrations` - Get event registrations

### Skill Matching
- `GET /api/skill-matching/job/:jobId` - Match users to a job
- `GET /api/skill-matching/user/:userId` - Match jobs to a user
- `GET /api/skill-matching/search?skills=skill1,skill2&location=province,district` - Search by skills

### Trending
- `GET /api/trending/jobs` - Get trending jobs
- `GET /api/trending/skills` - Get trending skills
- `POST /api/trending/jobs` - Create trending job entry
- `POST /api/trending/skills` - Create trending skill entry

## Database Schema

The application uses Prisma with PostgreSQL. Key models include:

- `IndividualKYC` - Job seeker profiles
- `IndustrialKYC` - Employer/company profiles
- `JobPosting` - Job listings
- `JobApplication` - Job applications
- `TrainingCourse` - Training courses
- `TrainingEnrollment` - Course enrollments
- `Exam` - Exams
- `ExamBooking` - Exam bookings
- `Certification` - Certifications
- `Event` - Events (webinars, seminars, workshops)
- `EventRegistration` - Event registrations
- `EmploymentHistory` - Employment history
- `PlatformCoin` - Platform currency system
- `TrendingJob` - Trending jobs analytics
- `TrendingSkill` - Trending skills analytics

## Error Handling

The application includes comprehensive error handling:

- **Validation Errors**: Zod validation errors return 400 with detailed field errors
- **Prisma Errors**: Database errors are handled with appropriate status codes
- **Custom Errors**: Application-specific errors with custom status codes
- **404 Errors**: Route not found handler
- **500 Errors**: Internal server errors with stack traces in development

## File Uploads

File uploads are handled using Multer and Cloudinary:

- **Supported formats**: Images, videos, PDFs
- **Max file size**: 50MB
- **Storage**: Cloudinary cloud storage
- **Folders**: Organized by feature (kyc, resumes, certificates, etc.)

## Development

```bash
# Run in development mode with hot reload
npm run dev

# Build for production
npm run build

# Run production build
npm start

# Open Prisma Studio
npm run prisma:studio
```

## Project Structure

```
bt-baj/
├── src/
│   ├── config/
│   │   ├── database.ts
│   │   └── cloudinary.ts
│   ├── controllers/
│   │   ├── individualKYC.controller.ts
│   │   ├── industrialKYC.controller.ts
│   │   ├── jobPosting.controller.ts
│   │   ├── jobApplication.controller.ts
│   │   ├── training.controller.ts
│   │   ├── exam.controller.ts
│   │   ├── certification.controller.ts
│   │   ├── event.controller.ts
│   │   ├── skillMatching.controller.ts
│   │   └── trending.controller.ts
│   ├── middleware/
│   │   ├── errorHandler.ts
│   │   ├── notFoundHandler.ts
│   │   └── upload.ts
│   ├── routes/
│   │   ├── individualKYC.routes.ts
│   │   ├── industrialKYC.routes.ts
│   │   ├── jobPosting.routes.ts
│   │   ├── jobApplication.routes.ts
│   │   ├── training.routes.ts
│   │   ├── exam.routes.ts
│   │   ├── certification.routes.ts
│   │   ├── event.routes.ts
│   │   ├── skillMatching.routes.ts
│   │   └── trending.routes.ts
│   ├── utils/
│   │   ├── cloudinaryUpload.ts
│   │   └── skillMatching.ts
│   └── server.ts
├── prisma/
│   └── schema.prisma
├── package.json
├── tsconfig.json
└── README.md
```

## License

ISC

# hr-backend
