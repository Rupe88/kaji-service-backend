# 📬 When Socket.io & Notifications Work

This document explains **exactly when** Socket.io notifications are triggered in the system.

---

## 🔌 **Socket.io Connection**

**When does Socket.io connect?**
- ✅ **Automatically** when user logs in
- ✅ **Frontend:** `frontend/hooks/useSocket.ts` connects on authentication
- ✅ **Backend:** Socket.io server initialized in `src/server.ts`
- ✅ User joins their personal room: `user:{userId}`

**Connection Status:**
- Connected: User is authenticated and online
- Disconnected: User logs out or closes browser
- Reconnects: Automatically when user returns

---

## 📋 **All Notification Triggers**

### **1. Job Application Notifications** 📝

**When:**
- ✅ User (INDIVIDUAL) applies to a job posting

**Who Gets Notified:**
- Employer (INDUSTRIAL user who posted the job)

**Trigger Location:**
- `src/controllers/jobApplication.controller.ts` → `createJobApplication()`

**Notification Type:** `JOB_APPLICATION`

**Example:**
```
User "John Doe" applies to "Software Developer" job
→ Employer "Tech Corp" receives notification instantly
```

---

### **2. Application Status Notifications** 📋

**When:**
- ✅ Employer updates application status:
  - REVIEWED
  - SHORTLISTED
  - INTERVIEW (with interview date)
  - ACCEPTED
  - REJECTED

**Who Gets Notified:**
- Job Applicant (INDIVIDUAL user who applied)

**Trigger Location:**
- `src/controllers/jobApplication.controller.ts` → `updateApplicationStatus()`

**Notification Type:** `APPLICATION_STATUS`

**Example:**
```
Employer changes application status to "ACCEPTED"
→ Applicant receives notification instantly
```

---

### **3. KYC Status Notifications** ✅

**When:**
- ✅ Admin updates KYC status:
  - APPROVED
  - REJECTED
  - RESUBMITTED

**Who Gets Notified:**
- User whose KYC was updated

**Trigger Locations:**
- `src/controllers/admin.controller.ts` → `updateIndividualKYCStatus()`
- `src/controllers/admin.controller.ts` → `updateIndustrialKYCStatus()`
- `src/controllers/individualKYC.controller.ts` → `updateKYCStatus()`
- `src/controllers/industrialKYC.controller.ts` → `updateKYCStatus()`
- `src/controllers/bulkOperations.controller.ts` → `bulkUpdateKYCStatus()`

**Notification Type:** `KYC_STATUS`

**Example:**
```
Admin approves Individual KYC for user "John Doe"
→ User "John Doe" receives notification instantly
```

---

### **4. KYC Submitted Notifications (Admin)** 📄

**When:**
- ✅ User submits new KYC application (Individual or Industrial)

**Who Gets Notified:**
- All Admin users (broadcast to all admins)

**Trigger Locations:**
- `src/controllers/individualKYC.controller.ts` → `createIndividualKYC()`
- `src/controllers/industrialKYC.controller.ts` → `createIndustrialKYC()`

**Notification Type:** `KYC_SUBMITTED`

**Example:**
```
User "John Doe" submits Individual KYC
→ All admins receive notification instantly
```

---

### **5. Job Verification Notifications** ✓

**When:**
- ✅ Admin verifies or unverifies a job posting

**Who Gets Notified:**
- Employer (INDUSTRIAL user who posted the job)

**Trigger Locations:**
- `src/controllers/admin.controller.ts` → `updateJobVerification()`
- `src/controllers/admin.controller.ts` → `bulkUpdateJobVerification()`
- `src/controllers/jobPosting.controller.ts` → `updateJobPosting()`

**Notification Type:** `JOB_VERIFICATION`

**Example:**
```
Admin verifies job "Software Developer"
→ Employer receives notification instantly
```

---

### **6. Job Recommendations** 🎯

**When:**
- ✅ New job posting matches user's profile
- ✅ Match score >= 50%

**Who Gets Notified:**
- Job Seekers (INDIVIDUAL users) with matching skills

**Trigger Location:**
- `src/services/jobRecommendation.service.ts` → `notifyUsersAboutNewJob()`

**Notification Type:** `JOB_RECOMMENDATION`

**Example:**
```
New job "React Developer" posted with 75% match to user "John Doe"
→ User "John Doe" receives notification instantly
```

---

### **7. Nearby Job Recommendations** 📍

**When:**
- ✅ New job within 30km matches user's profile
- ✅ Match score >= 40%

**Who Gets Notified:**
- Job Seekers (INDIVIDUAL users) with matching skills and location

**Trigger Location:**
- `src/services/jobRecommendation.service.ts` → `sendNearbyJobRecommendations()`

**Notification Type:** `NEARBY_JOB_RECOMMENDATION`

**Example:**
```
New job "Frontend Developer" posted 5km away with 60% match
→ User "John Doe" receives notification instantly
```

---

### **8. Exam Booking Notifications** 📝

**When:**
- ✅ User successfully books an exam

**Who Gets Notified:**
- User who booked the exam

**Trigger Location:**
- `src/controllers/exam.controller.ts` → `bookExam()`

**Notification Type:** `EXAM_BOOKING`

**Example:**
```
User "John Doe" books "JavaScript Certification" exam
→ User "John Doe" receives confirmation notification instantly
```

---

### **9. Event Registration Notifications** 🎉

**When:**
- ✅ User successfully registers for an event

**Who Gets Notified:**
- User who registered

**Trigger Location:**
- `src/controllers/event.controller.ts` → `registerForEvent()`

**Notification Type:** `EVENT_REGISTRATION`

**Example:**
```
User "John Doe" registers for "Tech Conference 2024"
→ User "John Doe" receives confirmation notification instantly
```

---

### **10. Training Completion Notifications** 🎓

**When:**
- ✅ User completes a training course
- ✅ Coins are awarded

**Who Gets Notified:**
- User who completed the training

**Trigger Location:**
- `src/controllers/training.controller.ts` → `updateEnrollment()`

**Notification Type:** `TRAINING_COMPLETION`

**Example:**
```
User "John Doe" completes "React Basics" course
→ User "John Doe" receives notification with coins awarded
```

---

### **11. Certification Created Notifications** 🏆

**When:**
- ✅ Admin creates a certification for a user

**Who Gets Notified:**
- User who received the certification

**Trigger Location:**
- `src/controllers/certification.controller.ts` → `createCertification()`

**Notification Type:** `CERTIFICATION_CREATED`

**Example:**
```
Admin creates "JavaScript Expert" certification for user "John Doe"
→ User "John Doe" receives notification instantly
```

---

### **12. Coin Updates** 💰

**When:**
- ✅ User earns coins (training completion, etc.)
- ✅ User spends coins
- ✅ User withdraws coins

**Who Gets Notified:**
- User who earned/spent coins

**Trigger Location:**
- `src/services/coinReward.service.ts` → `awardCoins()`

**Event Type:** `coin:update` (different from regular notifications)

**Example:**
```
User "John Doe" completes training and earns 50 coins
→ Real-time coin balance update animation
```

---

## 🔄 **How It Works**

### **Backend Flow:**
1. Action occurs (e.g., user applies to job)
2. Controller calls `emitNotification(io, userId, notificationData)`
3. `emitNotification()` function:
   - ✅ Saves notification to database
   - ✅ Emits via Socket.io to user's room: `user:{userId}`
4. Notification is stored in database for history

### **Frontend Flow:**
1. Socket.io client connects on login
2. Listens for `notification` event
3. When notification received:
   - ✅ Adds to notification list
   - ✅ Shows toast notification
   - ✅ Updates unread count
   - ✅ Saves to local state
4. Loads notification history from database on page load

---

## ✅ **What's Working**

- ✅ Real-time notifications via Socket.io
- ✅ Database persistence (notifications saved)
- ✅ Notification history (loads on page refresh)
- ✅ Read/unread status tracking
- ✅ Toast notifications
- ✅ Notification center UI
- ✅ Click to navigate
- ✅ Mark as read
- ✅ Clear all notifications

---

## 📊 **Notification Delivery**

**Real-time (Socket.io):**
- ✅ Instant delivery when user is online
- ✅ Works across browser tabs
- ✅ Reconnects automatically

**Database (History):**
- ✅ All notifications saved to database
- ✅ Loaded on page refresh
- ✅ Persistent across sessions
- ✅ Can be retrieved via API

---

## 🎯 **Summary**

**Notifications work when:**
1. ✅ User is authenticated (Socket.io connected)
2. ✅ Action occurs (job application, KYC update, etc.)
3. ✅ Backend emits notification
4. ✅ Notification saved to database
5. ✅ Socket.io delivers to user's room
6. ✅ Frontend receives and displays

**All notifications are:**
- ✅ Saved to database automatically
- ✅ Delivered in real-time via Socket.io
- ✅ Available in notification history
- ✅ Tracked with read/unread status

---

*Last Updated: Notification system with database persistence fully implemented*

