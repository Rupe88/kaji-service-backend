# 📝 Complete Exam System Flow - Full Implementation Guide

## 🎯 Overview

The exam system allows **job seekers (INDIVIDUAL users)** to book and take skill validation exams. The system supports both **physical** and **online** exam modes, with video/photo evidence collection and result management.

---

## 👥 Who Can Use Exams?

### ✅ **Can Book & Take Exams:**
- **Job Seekers (INDIVIDUAL role)** - Must have completed Individual KYC
- Users must be verified/active

### ❌ **Cannot Book Exams:**
- Employers (INDUSTRIAL role)
- Admins (ADMIN role)
- Users without Individual KYC

---

## 🔄 Complete Exam Flow (Step by Step)

### **Step 1: Admin/System Creates Exam** 
*(Currently manual - can be automated later)*

**Who:** Admin or System Administrator

**What happens:**
1. Admin creates an exam via `POST /api/exams`
2. Exam details include:
   - Title & Description
   - Category (Technical, Soft Skills, Certification, Language)
   - Mode: `PHYSICAL`, `ONLINE`, or `HYBRID`
   - Duration (in minutes)
   - Passing Score (percentage)
   - Total Marks
   - Exam Fee
   - Active status

**Example:**
```json
{
  "title": "Flutter Developer Certification",
  "description": "Test your Flutter and Dart skills",
  "category": "TECHNICAL",
  "mode": "ONLINE",
  "duration": 120,
  "passingScore": 70,
  "totalMarks": 100,
  "examFee": 50.00
}
```

---

### **Step 2: Job Seeker Browses Available Exams**

**Who:** Job Seeker (INDIVIDUAL user)

**What happens:**
1. User navigates to `/dashboard/exams`
2. Sees list of active exams
3. Can filter by category
4. Views exam details:
   - Title, description, category
   - Duration, questions count
   - Passing score requirement
   - Exam fee
   - Exam date (if scheduled)

**Frontend:** `frontend/app/dashboard/exams/page.tsx`

---

### **Step 3: Job Seeker Books an Exam**

**Who:** Job Seeker

**What happens:**
1. User clicks "Book Exam" button
2. System validates:
   - User has Individual KYC ✅
   - Exam is active ✅
   - User is authenticated ✅
3. User provides:
   - `examDate` - When they want to take the exam
   - `interviewDate` (optional) - For follow-up interview
4. System creates `ExamBooking` record with status `SCHEDULED`

**API Call:**
```typescript
POST /api/exams/book
{
  "examId": "uuid",
  "userId": "uuid",
  "examDate": "2024-01-15T10:00:00Z",
  "interviewDate": "2024-01-20T14:00:00Z" // optional
}
```

**Backend:** `src/controllers/exam.controller.ts::bookExam()`

**Database:**
- Creates `ExamBooking` record
- Status: `SCHEDULED`
- Stores booking date, exam date, interview date

---

### **Step 4: Exam Day - Taking the Exam**

**Who:** Job Seeker + Exam Administrator/Proctor

**What happens:**

#### **For ONLINE Exams:**
1. User logs in on exam date
2. Exam administrator/proctor monitors
3. User takes exam (external system or manual)
4. **Evidence Collection:**
   - User uploads exam videos/photos
   - System stores in `examVideos` and `examPhotos` (JSON fields)
   - Files uploaded to Cloudinary

#### **For PHYSICAL Exams:**
1. User attends exam at physical location
2. Exam administrator conducts exam
3. **Evidence Collection:**
   - Administrator uploads exam videos/photos
   - System stores evidence

**API Call (Update Booking with Evidence):**
```typescript
PATCH /api/exams/bookings/:id
Content-Type: multipart/form-data

// Option 1: Upload files directly
FormData:
  - files: [video1.mp4, photo1.jpg, ...]
  - status: "COMPLETED"

// Option 2: Provide URLs
{
  "status": "COMPLETED",
  "score": 85, // Optional - can be added later
  "examVideos": ["url1", "url2"], // Array of video URLs
  "examPhotos": ["url1", "url2"]  // Array of photo URLs
}
```

**Note:** Files are automatically uploaded to Cloudinary and URLs are stored in the database.

**Backend:** `src/controllers/exam.controller.ts::updateExamBooking()`

**File Upload:**
- Supports multiple video/photo uploads
- Files stored in Cloudinary under `hr-platform/exams/`
- URLs stored in JSON fields

---

### **Step 5: Scoring & Results**

**Who:** Exam Administrator/Proctor

**What happens:**
1. Administrator reviews exam evidence
2. Scores the exam
3. Updates booking with:
   - `score` (numeric)
   - `status`: `PASSED` or `FAILED`
   - `resultDate` (automatically set)

**API Call:**
```typescript
PATCH /api/exams/bookings/:id
{
  "status": "PASSED", // or "FAILED"
  "score": 85
}
```

**System Logic:**
- If `status` is `PASSED` or `FAILED`, `resultDate` is automatically set
- Score is compared against exam's `passingScore`
- Status determines if user passed or failed

---

### **Step 6: Interview (Optional)**

**Who:** Job Seeker + Interviewer

**What happens:**
1. If exam passed, interview may be scheduled
2. Interview happens on `interviewDate`
3. **Evidence Collection:**
   - Interview videos/photos uploaded
   - Stored in `interviewVideos` and `interviewPhotos`

**API Call:**
```typescript
PATCH /api/exams/bookings/:id
{
  "interviewVideos": ["url1", "url2"],
  "interviewPhotos": ["url1", "url2"]
}
```

---

### **Step 7: Retotaling Request (Optional)**

**Who:** Job Seeker (if they disagree with score)

**What happens:**
1. User requests retotaling
2. System updates:
   - `retotalingRequested: true`
   - `status: RETOTALING_REQUESTED`
3. Administrator reviews and updates:
   - `retotalingScore` (new score)
   - `retotalingDate`
   - `status: RETOTALING_COMPLETED`

**API Call:**
```typescript
PATCH /api/exams/bookings/:id/retotaling
```

**Backend:** `src/controllers/exam.controller.ts::requestRetotaling()`

---

### **Step 8: Certification Generation (If Passed)**

**Who:** System (automatic or manual)

**What happens:**
1. If exam status is `PASSED`
2. System can generate certification via `POST /api/certifications`
3. Certification includes:
   - Certificate number (auto-generated)
   - Verification code (unique)
   - Links to exam evidence
   - Issued date
   - Expiry date (optional)

**Certification appears in:**
- User's profile page (`/dashboard/profile`)
- Can be verified by anyone using verification code

---

## 📊 Exam Status Flow

```
SCHEDULED (default when booked)
  ↓
COMPLETED (exam taken, evidence uploaded)
  ↓
PASSED / FAILED (scored by administrator)
  ↓
[Optional] RETOTALING_REQUESTED (user disputes score)
  ↓
[Optional] RETOTALING_COMPLETED (administrator reviews)
```

**Available Statuses:**
- `SCHEDULED` - Exam is booked, waiting to be taken
- `COMPLETED` - Exam has been taken, evidence uploaded
- `PASSED` - User passed the exam (score >= passingScore)
- `FAILED` - User failed the exam (score < passingScore)
- `RETOTALING_REQUESTED` - User requested score review
- `RETOTALING_COMPLETED` - Retotaling process finished

---

## 🗄️ Database Schema

### **Exam Model:**
```prisma
model Exam {
  id           String        @id
  title        String
  description  String
  category     String        // TECHNICAL, SOFT_SKILLS, etc.
  mode         TrainingMode  // PHYSICAL, ONLINE, HYBRID
  duration     Int           // minutes
  passingScore Int           // percentage
  totalMarks   Int
  examFee      Decimal
  isActive     Boolean
  bookings     ExamBooking[]
}
```

### **ExamBooking Model:**
```prisma
model ExamBooking {
  id                  String        @id
  examId              String
  userId              String        // Must have IndividualKYC
  bookedDate          DateTime
  examDate            DateTime
  interviewDate       DateTime?
  status              ExamStatus    // SCHEDULED, COMPLETED, PASSED, FAILED, etc.
  score               Int?
  resultDate          DateTime?
  retotalingRequested Boolean
  retotalingDate      DateTime?
  retotalingScore     Int?
  examVideos          Json?         // Array of video URLs
  examPhotos          Json?         // Array of photo URLs
  interviewVideos     Json?
  interviewPhotos     Json?
}
```

---

## 🔌 API Endpoints

### **For Job Seekers:**

1. **Browse Exams:**
   ```
   GET /api/exams?category=TECHNICAL&page=1&limit=20
   ```

2. **View Exam Details:**
   ```
   GET /api/exams/:id
   ```

3. **Book Exam:**
   ```
   POST /api/exams/book
   Body: { examId, userId, examDate, interviewDate? }
   ```

4. **View My Bookings:**
   ```
   GET /api/exams/bookings?userId=xxx
   ```

5. **Request Retotaling:**
   ```
   PATCH /api/exams/bookings/:id/retotaling
   ```

### **For Administrators/Proctors:**

1. **Create Exam:**
   ```
   POST /api/exams
   Body: { title, description, category, mode, duration, passingScore, totalMarks, examFee }
   ```

2. **Update Booking (Score/Evidence):**
   ```
   PATCH /api/exams/bookings/:id
   Body: { status, score, examVideos?, examPhotos?, interviewVideos?, interviewPhotos? }
   Files: multipart/form-data (videos/photos)
   ```

3. **View All Bookings:**
   ```
   GET /api/exams/bookings?examId=xxx&status=PASSED
   ```

---

## 🎨 Frontend Implementation

### **Pages Created:**

1. **`/dashboard/exams`** - Browse and book exams
   - Lists all active exams
   - Filter by category
   - Shows booking status
   - "Book Exam" button

2. **`/dashboard/profile`** - View certifications
   - Shows all earned certifications
   - Displays verification codes
   - Links to certificate PDFs

### **Features:**
- ✅ Exam listing with filters
- ✅ Booking functionality
- ✅ Shows booked status
- ✅ Category filtering
- ✅ Pagination
- ✅ Type-safe API integration

---

## 🔐 Security & Validation

### **Validations:**
- ✅ User must have Individual KYC to book
- ✅ Exam must be active
- ✅ Exam date must be in future
- ✅ Interview date must be after exam date
- ✅ Score cannot exceed total marks
- ✅ Passing score cannot exceed total marks

### **File Upload:**
- ✅ Supports multiple files
- ✅ Videos and photos
- ✅ Stored in Cloudinary
- ✅ Secure file handling

---

## 📈 Future Enhancements (Not Yet Implemented)

### **Potential Additions:**
1. **Online Exam Platform Integration**
   - Real-time exam taking interface
   - Timer functionality
   - Auto-submission
   - Question bank system

2. **Automated Scoring**
   - MCQ auto-grading
   - Programming test evaluation
   - AI-powered essay scoring

3. **Proctoring System**
   - Live video monitoring
   - Screen recording
   - Plagiarism detection

4. **Exam Scheduling**
   - Calendar integration
   - Time slot booking
   - Reminder notifications

5. **My Exam Bookings Page**
   - Detailed booking view
   - Upload evidence interface
   - View results
   - Request retotaling UI

6. **Payment Integration**
   - Exam fee payment
   - Refund handling
   - Payment verification

---

## 🎯 Current Status Summary

### ✅ **Fully Implemented:**
- Exam creation (admin)
- Exam listing (job seekers)
- Exam booking
- Booking status tracking
- Evidence upload (videos/photos)
- Scoring system
- Result management
- Retotaling requests
- Certification generation (linked)

### 🔄 **Partially Implemented:**
- My Bookings page (API ready, UI can be enhanced)
- Evidence upload UI (API ready, needs dedicated page)

### ❌ **Not Yet Implemented:**
- Online exam taking interface
- Automated proctoring
- Payment processing
- Email notifications
- Exam scheduling calendar

---

## 💡 How It Works in Practice

### **Example Scenario:**

1. **Admin creates exam:**
   - "Flutter Developer Certification"
   - Online mode, 120 minutes
   - Passing: 70%, Fee: $50

2. **Job Seeker books:**
   - Sees exam in `/dashboard/exams`
   - Clicks "Book Exam"
   - Selects exam date: Jan 15, 2024
   - Booking created with status `SCHEDULED`

3. **Exam day (Jan 15):**
   - User takes exam (external platform or physical)
   - Administrator uploads evidence:
     - Exam videos showing user taking test
     - Photos of exam environment
   - Status updated to `COMPLETED`

4. **Scoring:**
   - Administrator reviews evidence
   - Scores: 85/100
   - Updates status to `PASSED`
   - Result date set automatically

5. **Certification:**
   - System generates certification
   - Appears in user's profile
   - Verification code: `ABC123XYZ`
   - User can share code for verification

6. **User views:**
   - Goes to `/dashboard/profile`
   - Sees "Flutter Developer Certification"
   - Can copy verification code
   - Can view/download certificate

---

## 🎓 Key Points

1. **Only Individual users** (job seekers) can book exams
2. **Must have KYC** completed to book
3. **Evidence is required** - videos/photos of exam taking
4. **Administrator scores** - not automated (yet)
5. **Certifications are generated** after passing
6. **Retotaling available** if user disputes score
7. **Full audit trail** - all evidence stored in database

---

This system provides a complete exam management flow from booking to certification, with proper evidence collection and result management! 🚀

