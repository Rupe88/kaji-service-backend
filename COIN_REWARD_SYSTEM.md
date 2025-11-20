# Coin Reward System Documentation

## Current Implementation

### ✅ Training Course Completion
**When:** User completes a training course (100% progress, status = COMPLETED)
**Where:** Frontend (`frontend/app/dashboard/training/my-trainings/page.tsx`)
**Amount:** 
- Formula: `Math.max(100, courseDuration * 50)`
- Minimum: 100 coins
- Per hour: 50 coins
- Example: 2-hour course = 100 coins, 5-hour course = 250 coins

**Current Flow:**
1. User clicks "Complete Course" button
2. Frontend updates enrollment status to COMPLETED
3. Frontend calculates coins based on course duration
4. Frontend calls `walletApi.earn()` to award coins
5. User sees success toast with coin amount

**Issue:** Coin reward is only in frontend, not automatic on backend

---

## Recommended Implementation

### 1. Automatic Coin Rewards (Backend)

#### Training Course Completion (Recommended)
**When:** Enrollment status changes to `COMPLETED` in backend
**Where:** `src/controllers/training.controller.ts` → `updateEnrollmentProgress`
**Amount:** Same formula (50 coins/hour, min 100)

**Benefits:**
- Automatic (no frontend dependency)
- Consistent rewards
- Works even if frontend fails
- Can't be bypassed

#### Other Opportunities:

1. **Job Application Submission**
   - Amount: 10-20 coins per application
   - When: User successfully submits a job application

2. **Profile Completion (KYC)**
   - Amount: 50-100 coins
   - When: User completes IndividualKYC or IndustrialKYC

3. **Daily Login/Activity**
   - Amount: 5-10 coins
   - When: User logs in daily (streak bonus)

4. **Exam Completion**
   - Amount: 100-500 coins (based on score)
   - When: User passes an exam

5. **Certification Achievement**
   - Amount: 200-500 coins
   - When: User earns a certification

6. **Referral Bonus**
   - Amount: 50-100 coins
   - When: User refers a friend who signs up

7. **Job Interview Attendance**
   - Amount: 25-50 coins
   - When: User attends scheduled interview

8. **Course Review/Feedback**
   - Amount: 10-20 coins
   - When: User submits course review

---

## Implementation Priority

### High Priority (Should Implement)
1. ✅ **Training Course Completion** - Move to backend (automatic)
2. **KYC Completion** - Reward for profile completion
3. **Job Application** - Small reward for applying

### Medium Priority
4. **Exam Completion** - Reward for passing exams
5. **Certification** - Reward for earning certifications

### Low Priority (Future)
6. Daily login bonuses
7. Referral system
8. Review/feedback rewards

---

## Current Coin Sources

Based on code analysis:
- **TRAINING_COMPLETION** - Only source currently implemented (frontend only)

---

## Next Steps

1. **Move training completion rewards to backend** (automatic)
2. **Add KYC completion rewards**
3. **Add job application rewards**
4. **Create coin reward service/utility** for reusability

