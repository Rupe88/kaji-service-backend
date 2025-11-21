# Socket.io Implementation Guide

This document outlines all the places where Socket.io real-time updates can be added to enhance user experience.

## ✅ Already Implemented

1. **Coin Updates** - Real-time coin balance updates when courses are completed
   - Location: `src/services/coinReward.service.ts`
   - Event: `coin:update`
   - Frontend: `WalletBalance` component and wallet page

---

## 🎯 High Priority - Recommended to Implement

### 1. **Job Application Notifications** ⭐⭐⭐
**When:** Someone applies to a job posting
**Who gets notified:** The employer (job poster)

**Backend:**
- File: `src/controllers/jobApplication.controller.ts`
- Function: `createJobApplication`
- Emit to: Employer's userId (from `job.employerId`)

**Frontend:**
- Employer dashboard showing new applications
- Real-time badge count for pending applications
- Toast notification when new application arrives

**Event Name:** `job:application:new`
```typescript
// In createJobApplication after application is created
emitNotification(io, job.employerId, {
  type: 'JOB_APPLICATION',
  title: 'New Job Application',
  message: `${applicant.fullName} applied for ${job.title}`,
  data: { applicationId: application.id, jobId: job.id }
});
```

---

### 2. **KYC Status Updates** ⭐⭐⭐
**When:** KYC status changes (APPROVED, REJECTED, RESUBMITTED)
**Who gets notified:** The user whose KYC was updated

**Backend:**
- Files: 
  - `src/controllers/individualKYC.controller.ts` → `updateKYCStatus`
  - `src/controllers/industrialKYC.controller.ts` → `updateKYCStatus`
  - `src/controllers/bulkOperations.controller.ts` → `bulkUpdateKYCStatus`

**Frontend:**
- KYC status page showing real-time updates
- Toast notification when status changes
- Auto-refresh KYC dashboard

**Event Name:** `kyc:status:update`
```typescript
emitNotification(io, userId, {
  type: 'KYC_STATUS',
  title: 'KYC Status Updated',
  message: `Your KYC has been ${status}`,
  data: { status, kycType: 'INDIVIDUAL' | 'INDUSTRIAL' }
});
```

---

### 3. **Application Status Updates** ⭐⭐
**When:** Employer updates application status (interview scheduled, accepted, rejected)
**Who gets notified:** The applicant

**Backend:**
- File: `src/controllers/jobApplication.controller.ts`
- Function: `updateApplicationStatus`

**Frontend:**
- Applicant's application dashboard
- Real-time status updates
- Interview date notifications

**Event Name:** `application:status:update`
```typescript
emitNotification(io, applicantId, {
  type: 'APPLICATION_STATUS',
  title: 'Application Status Updated',
  message: `Your application for ${job.title} is now ${status}`,
  data: { applicationId, status, interviewDate }
});
```

---

### 4. **Job Posting Verification** ⭐⭐
**When:** Admin verifies/rejects a job posting
**Who gets notified:** The employer who posted the job

**Backend:**
- File: `src/controllers/jobPosting.controller.ts`
- Function: `updateJobPosting` (when `isVerified` changes)

**Frontend:**
- Employer's job posting dashboard
- Real-time verification status

**Event Name:** `job:verification:update`
```typescript
emitNotification(io, employerId, {
  type: 'JOB_VERIFICATION',
  title: 'Job Posting Verified',
  message: `Your job posting "${job.title}" has been ${isVerified ? 'verified' : 'rejected'}`,
  data: { jobId, isVerified }
});
```

---

## 🔶 Medium Priority

### 5. **New Job Recommendations** ⭐
**When:** New job postings match user's skills/preferences
**Who gets notified:** Users with job alerts enabled

**Backend:**
- File: `src/services/jobRecommendation.service.ts`
- Function: `sendJobRecommendationsToUser`
- Emit when: New job matches user's profile

**Frontend:**
- Job recommendations sidebar/panel
- Real-time job alerts

**Event Name:** `job:recommendation:new`
```typescript
emitNotification(io, userId, {
  type: 'JOB_RECOMMENDATION',
  title: 'New Job Match',
  message: `We found ${jobCount} new job(s) matching your profile`,
  data: { jobIds, matchScores }
});
```

---

### 6. **Interview Scheduled** ⭐
**When:** Interview date is set for an application
**Who gets notified:** Both applicant and employer

**Backend:**
- File: `src/controllers/jobApplication.controller.ts`
- Function: `updateApplicationStatus` (when `interviewDate` is set)

**Event Name:** `interview:scheduled`
```typescript
// Notify applicant
emitNotification(io, applicantId, {
  type: 'INTERVIEW_SCHEDULED',
  title: 'Interview Scheduled',
  message: `Interview scheduled for ${job.title} on ${interviewDate}`,
  data: { applicationId, interviewDate, jobId }
});

// Notify employer
emitNotification(io, employerId, {
  type: 'INTERVIEW_SCHEDULED',
  title: 'Interview Scheduled',
  message: `Interview with ${applicant.fullName} scheduled`,
  data: { applicationId, interviewDate, applicantId }
});
```

---

### 7. **Training Course Updates** ⭐
**When:** New training courses are added or existing ones are updated
**Who gets notified:** Users interested in training

**Backend:**
- File: `src/controllers/training.controller.ts`
- Functions: `createTrainingCourse`, `updateTrainingCourse`

**Event Name:** `training:course:new` or `training:course:update`

---

### 8. **Exam Results** ⭐
**When:** Exam results are published
**Who gets notified:** The exam taker

**Backend:**
- File: `src/controllers/exam.controller.ts` (if exists)
- When exam status changes to PASSED/FAILED

**Event Name:** `exam:result:published`

---

## 🔵 Low Priority (Future Enhancements)

### 9. **Certification Issued**
**When:** Certification is generated after exam completion
**Event Name:** `certification:issued`

### 10. **Event Registration**
**When:** User registers for an event
**Event Name:** `event:registered`

### 11. **Profile Views**
**When:** Someone views your profile
**Event Name:** `profile:viewed`

### 12. **Connection Requests** (if implemented)
**When:** Someone sends a connection request
**Event Name:** `connection:request`

---

## 📝 Implementation Steps

### Step 1: Create Notification Helper Function

Add to `src/config/socket.ts`:

```typescript
export interface NotificationData {
  type: string;
  title: string;
  message: string;
  data?: any;
  timestamp?: string;
}

/**
 * Emit notification to a specific user
 */
export const emitNotification = (
  io: SocketIOServer,
  userId: string,
  notification: NotificationData
): void => {
  io.to(`user:${userId}`).emit('notification', {
    ...notification,
    timestamp: notification.timestamp || new Date().toISOString(),
  });
  console.log(`📬 Socket.io: Notification sent to user ${userId}: ${notification.title}`);
};
```

### Step 2: Update Controllers

In each controller where you want real-time updates:

```typescript
import { getSocketIOInstance, emitNotification } from '../config/socket';

// After the database operation
const io = getSocketIOInstance();
if (io) {
  emitNotification(io, userId, {
    type: 'YOUR_EVENT_TYPE',
    title: 'Notification Title',
    message: 'Notification message',
    data: { /* relevant data */ }
  });
}
```

### Step 3: Update Frontend Hook

Extend `frontend/hooks/useSocket.ts`:

```typescript
interface NotificationData {
  type: string;
  title: string;
  message: string;
  data?: any;
  timestamp: string;
}

// Add to useSocket hook
const [notifications, setNotifications] = useState<NotificationData[]>([]);

// Listen for notifications
newSocket.on('notification', (data: NotificationData) => {
  console.log('📬 Notification received:', data);
  setNotifications(prev => [data, ...prev]);
  
  // Show toast
  toast.success(data.message, {
    duration: 5000,
  });
});
```

### Step 4: Create Notification Component

Create `frontend/components/notifications/NotificationCenter.tsx`:

```typescript
'use client';

import { useSocket } from '@/hooks/useSocket';
import { motion, AnimatePresence } from 'framer-motion';

export const NotificationCenter = () => {
  const { notifications } = useSocket();
  
  // Display notifications in a dropdown/bell icon
  // Show unread count badge
};
```

---

## 🎨 Frontend Components to Create

1. **Notification Bell** - Header component with notification count
2. **Notification Dropdown** - List of recent notifications
3. **Notification Toast** - Auto-dismissing toast for important events
4. **Real-time Badge Counters** - For applications, messages, etc.

---

## 📊 Priority Matrix

| Feature | Impact | Effort | Priority |
|---------|--------|--------|----------|
| Job Application Notifications | High | Low | ⭐⭐⭐ |
| KYC Status Updates | High | Low | ⭐⭐⭐ |
| Application Status Updates | Medium | Low | ⭐⭐ |
| Job Verification | Medium | Low | ⭐⭐ |
| Job Recommendations | Medium | Medium | ⭐ |
| Interview Scheduled | Medium | Low | ⭐ |

---

## 🔧 Testing

For each Socket.io event:
1. Test with multiple browser tabs (same user)
2. Test with different users
3. Test reconnection after disconnect
4. Test authentication failures
5. Test with slow network (throttling)

---

## 📚 Example: Job Application Notification

### Backend (`src/controllers/jobApplication.controller.ts`):

```typescript
import { getSocketIOInstance, emitNotification } from '../config/socket';

export const createJobApplication = async (req: AuthRequest & Request, res: Response) => {
  // ... existing code ...
  
  const application = await prisma.jobApplication.create({
    // ... application data ...
    include: {
      job: {
        include: {
          employer: true, // Get employer info
        },
      },
      applicant: true,
    },
  });

  // Emit notification to employer
  const io = getSocketIOInstance();
  if (io && application.job.employer) {
    emitNotification(io, application.job.employer.userId, {
      type: 'JOB_APPLICATION',
      title: 'New Job Application',
      message: `${application.applicant.fullName} applied for "${application.job.title}"`,
      data: {
        applicationId: application.id,
        jobId: application.job.id,
        applicantId: application.applicantId,
      },
    });
  }

  res.status(201).json({
    success: true,
    data: application,
  });
};
```

### Frontend (`frontend/hooks/useSocket.ts`):

```typescript
// Add notification state
const [notifications, setNotifications] = useState<NotificationData[]>([]);

// Listen for notifications
newSocket.on('notification', (data: NotificationData) => {
  setNotifications(prev => [data, ...prev]);
  
  // Show toast based on notification type
  if (data.type === 'JOB_APPLICATION') {
    toast.success(data.message, { duration: 5000 });
  }
});

return {
  socket,
  isConnected,
  coinUpdate,
  notifications, // Add this
};
```

---

## 🚀 Quick Start

To implement the highest priority features:

1. **Add notification helper** to `src/config/socket.ts`
2. **Update job application controller** for new applications
3. **Update KYC controllers** for status changes
4. **Create notification component** in frontend
5. **Update useSocket hook** to handle notifications
6. **Add notification bell** to dashboard header

This will give you real-time notifications for the most important user actions!

