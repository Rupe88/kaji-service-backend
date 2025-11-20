# 🎯 Next Features to Implement - Priority Roadmap

**Date:** 2025-01-27  
**Status:** Ready for Implementation

---

## ✅ **Recently Completed**

1. ✅ Password Change API (`POST /api/auth/change-password`)
2. ✅ Notification Preferences API (`GET/PATCH /api/users/preferences`)
3. ✅ Privacy Settings API (`GET/PATCH /api/users/privacy`)
4. ✅ Removed firstName/lastName validation from registration

---

## 🚨 **Priority 1: Critical Missing Features**

### 1. **Forgot Password / Password Reset Flow** ⏱️ 3-4 hours
- **Status:** ❌ **NOT IMPLEMENTED**
- **What's Missing:**
  - `POST /api/auth/forgot-password` - Request password reset
  - `POST /api/auth/reset-password` - Reset password with OTP
- **Current State:**
  - Email service has `sendForgetPasswordEmail` method ✅
  - OTP system supports `PASSWORD_RESET` type ✅
  - But no endpoints to trigger it ❌
- **Implementation:**
  ```typescript
  // Add to auth.controller.ts
  POST /api/auth/forgot-password
  Body: { email: string }
  // Sends OTP via email
  
  POST /api/auth/reset-password
  Body: { email: string, code: string, newPassword: string }
  // Verifies OTP and resets password
  ```

### 2. **Job Alerts / Saved Jobs** ⏱️ 4-5 hours
- **Status:** ❌ **NOT IMPLEMENTED**
- **Features Needed:**
  - Save jobs for later
  - Create job alerts based on criteria
  - Email notifications for new matching jobs
- **Endpoints Needed:**
  ```
  POST   /api/jobs/:id/save
  GET    /api/jobs/saved
  DELETE /api/jobs/saved/:id
  POST   /api/job-alerts
  GET    /api/job-alerts
  PATCH  /api/job-alerts/:id
  DELETE /api/job-alerts/:id
  ```
- **Database:** Need `SavedJob` and `JobAlert` models

### 3. **Resume Builder & Management** ⏱️ 6-8 hours
- **Status:** ❌ **NOT IMPLEMENTED**
- **Features Needed:**
  - Multiple resume versions
  - Resume templates
  - Resume download (PDF generation)
  - Auto-generate from KYC profile
- **Endpoints Needed:**
  ```
  POST   /api/resumes
  GET    /api/resumes
  GET    /api/resumes/:id
  PUT    /api/resumes/:id
  DELETE /api/resumes/:id
  GET    /api/resumes/:id/download
  ```

---

## 📈 **Priority 2: Enhanced User Experience**

### 4. **Advanced Job Search** ⏱️ 3-4 hours
- **Status:** ⚠️ Basic search exists, needs enhancement
- **Enhancements:**
  - Search history
  - Saved searches
  - Advanced filters (multiple skills, salary ranges)
  - Search suggestions/autocomplete

### 5. **Application Status Notifications** ⏱️ 2-3 hours
- **Status:** ⚠️ Status update exists, notifications missing
- **Features:**
  - Email notification when application status changes
  - In-app notification system (future)
  - Status change history log

### 6. **Interview Scheduling Enhancement** ⏱️ 4-5 hours
- **Status:** ⚠️ Basic structure exists
- **Enhancements:**
  - Calendar integration
  - Time slot selection UI
  - Interview reminders
  - Video call links (Zoom/Meet integration)
  - Interview feedback forms

---

## 💡 **Priority 3: Nice to Have Features**

### 7. **Messaging System** ⏱️ 10-12 hours
- **Status:** ❌ **NOT IMPLEMENTED**
- **Features:**
  - Direct messaging between users
  - Employer-candidate messaging
  - Message notifications
  - File attachments in messages
- **Database:** Need `Message` and `Conversation` models

### 8. **Company Reviews & Ratings** ⏱️ 6-8 hours
- **Status:** ❌ **NOT IMPLEMENTED**
- **Features:**
  - Company rating system (1-5 stars)
  - Review submission
  - Review moderation
  - Company response to reviews
- **Database:** Need `CompanyReview` model

### 9. **Advanced Analytics Dashboard** ⏱️ 5-6 hours
- **Status:** ⚠️ Basic analytics exist
- **Enhancements:**
  - Visual charts and graphs
  - Export analytics reports (PDF/Excel)
  - Custom date ranges
  - Comparative analytics
  - Predictive analytics

### 10. **Email Notifications System** ⏱️ 4-5 hours
- **Status:** ⚠️ OTP emails work, but no general notifications
- **Features:**
  - Job application status change emails
  - New job matching alerts
  - KYC approval/rejection emails
  - Interview reminders
  - Weekly digest emails

---

## 🎯 **Recommended Implementation Order**

### **Sprint 1 (Week 1): Critical Features**
1. **Forgot Password Flow** (3-4 hours)
   - Most critical for user experience
   - Users can recover accounts
   
2. **Job Alerts** (4-5 hours)
   - High user value
   - Increases engagement

**Total:** ~8 hours

### **Sprint 2 (Week 2): User Experience**
3. **Saved Jobs** (2-3 hours)
4. **Application Status Notifications** (2-3 hours)
5. **Advanced Job Search** (3-4 hours)

**Total:** ~8-10 hours

### **Sprint 3 (Week 3): Professional Features**
6. **Resume Builder** (6-8 hours)
7. **Interview Scheduling Enhancement** (4-5 hours)

**Total:** ~10-13 hours

### **Sprint 4 (Week 4+): Advanced Features**
8. **Email Notifications System** (4-5 hours)
9. **Company Reviews** (6-8 hours)
10. **Messaging System** (10-12 hours)

**Total:** ~20-25 hours

---

## 📊 **Feature Completion Status**

| Category | Completed | In Progress | Not Started | Total |
|----------|-----------|-------------|-------------|-------|
| Authentication | 8/9 | 0 | 1 | 9 |
| Job Management | 6/8 | 1 | 1 | 8 |
| User Features | 4/6 | 0 | 2 | 6 |
| Communication | 0/2 | 0 | 2 | 2 |
| Analytics | 3/4 | 1 | 0 | 4 |
| **TOTAL** | **21/29** | **2** | **6** | **29** |

**Overall Completion:** ~72%

---

## 🚀 **Quick Start: Forgot Password**

This is the **most critical missing feature**. Here's how to implement it:

### Step 1: Add Forgot Password Endpoint
```typescript
// src/controllers/auth.controller.ts

export const forgotPasswordSchema = z.object({
  email: emailSchema,
});

export const forgotPassword = async (req: Request, res: Response) => {
  const body = forgotPasswordSchema.parse(req.body);
  
  const user = await prisma.user.findUnique({
    where: { email: body.email },
  });

  if (!user) {
    // Don't reveal if user exists (security best practice)
    res.json({
      success: true,
      message: 'If the email exists, a password reset OTP has been sent',
    });
    return;
  }

  // Generate OTP
  const otp = generateOTP();
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

  await prisma.oTP.create({
    data: {
      userId: user.id,
      email: user.email,
      code: otp,
      type: 'PASSWORD_RESET',
      expiresAt,
    },
  });

  // Send OTP email
  emailService
    .sendOTPEmail(
      { email: user.email, firstName: user.firstName },
      otp,
      'PASSWORD_RESET'
    )
    .catch(console.error);

  res.json({
    success: true,
    message: 'If the email exists, a password reset OTP has been sent',
  });
};
```

### Step 2: Add Reset Password Endpoint
```typescript
export const resetPasswordSchema = z.object({
  email: emailSchema,
  code: otpCodeSchema,
  newPassword: passwordSchema,
});

export const resetPassword = async (req: Request, res: Response) => {
  const body = resetPasswordSchema.parse(req.body);

  // Verify OTP (similar to verifyOTP but for password reset)
  // Then update password
};
```

### Step 3: Add Routes
```typescript
// src/routes/auth.routes.ts
router.post('/forgot-password', validate(forgotPasswordSchema), forgotPassword);
router.post('/reset-password', validate(resetPasswordSchema), resetPassword);
```

---

## 📝 **Summary**

**Most Critical:** Forgot Password Flow (users can't recover accounts)  
**High Value:** Job Alerts & Saved Jobs (increases engagement)  
**Professional:** Resume Builder (completes profile management)

**Start with Forgot Password - it's the most critical missing feature!**

