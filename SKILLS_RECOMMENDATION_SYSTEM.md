# Skills Recommendation System - Complete Guide

## Overview
The Skills Recommendation System automatically matches users to jobs based on their skills, location, and experience. It also provides personalized skill recommendations to help users improve their profile and find better job matches.

## How It Works

### 1. **When a New Job is Posted**
When an employer posts a new job:
- The system calls `notifyUsersAboutNewJob()`
- It finds all users with:
  - ✅ Approved KYC
  - ✅ Job alerts enabled
  - ✅ Email notifications enabled
  - ✅ Active status
- For each user, it calculates a **match score** based on:
  - **Skills Match** (40% weight): Compares user's technical skills with job requirements
  - **Location Match** (30% weight): Checks if user's location matches job location
  - **Experience Match** (30% weight): Verifies if user has required experience
- If match score ≥ 50%, the user receives:
  - 📧 **Email notification** with job details and match percentage
  - 🔔 **Socket.io notification** in real-time
  - 🎯 **Top match** highlighted in the notification

### 2. **When User Applies for a Job**
When a user applies for a job:
- ✅ Application is created and saved
- ✅ Employer receives notification about new application
- ✅ **NEW**: User receives similar job recommendations via email and Socket.io
- ✅ **NEW**: System suggests other jobs with similar requirements
- ✅ **NEW**: Shows skills that match and skills they might want to learn

### 3. **When User Gets Rejected**
When an employer rejects a user's application:
- ✅ User receives status update notification
- ✅ **NEW**: User receives **skill recommendations** showing:
  - ❌ **Missing Skills**: Skills required for the job that user doesn't have
  - ✅ **Matched Skills**: Skills user already has
  - 🎯 **Similar Jobs**: Other jobs that match their current skills
  - 📚 **Skills to Learn**: Suggested skills to improve their profile
- ✅ **NEW**: Email with personalized skill improvement suggestions
- ✅ **NEW**: Socket.io notification with missing skills list

## Match Score Calculation

### Components:
1. **Skill Match (40% weight)**
   - Compares user's technical skills with job requirements
   - Handles skill synonyms (e.g., "React" = "React.js" = "ReactJS")
   - Considers proficiency levels (1-5 scale)
   - Formula: `(matched skills / total required skills) * 100 + proficiency bonus`

2. **Location Match (30% weight)**
   - Checks province, district, and city match
   - Considers remote work options
   - Calculates distance if coordinates available
   - Formula: `100% if same location, decreasing with distance`

3. **Experience Match (30% weight)**
   - Compares user's total experience with job requirements
   - Formula: `100% if experience ≥ required, 0% otherwise`

### Final Score:
```
Match Score = (Skill Match × 0.4) + (Location Match × 0.3) + (Experience Match × 0.3)
```

## Skill Matching Algorithm

### Skill Synonyms
The system recognizes skill variations:
- `react` = `react.js` = `reactjs` = `react-js`
- `node.js` = `nodejs` = `node`
- `javascript` = `js` = `ecmascript`
- `typescript` = `ts`
- `python` = `py` = `python3`
- And many more...

### Matching Process:
1. **Normalize** skill names (lowercase, trim)
2. **Check synonyms** for variations
3. **Partial match** for similar skills
4. **Calculate proficiency** bonus for matched skills

## Notification Types

### 1. Job Recommendation Notification
```typescript
{
  type: 'JOB_RECOMMENDATION',
  title: '🎯 New Job Matches Your Profile!',
  message: 'We found X jobs matching your skills...',
  data: {
    jobCount: 5,
    topMatch: { jobId, title, matchScore, location },
    allRecommendations: [...]
  }
}
```

### 2. Application Status Notification
```typescript
{
  type: 'APPLICATION_STATUS',
  title: 'Application Update',
  message: 'Your application for "Job Title" was not selected',
  data: {
    applicationId,
    jobId,
    status: 'REJECTED',
    jobTitle,
    companyName
  }
}
```

### 3. Skill Recommendation Notification (NEW)
```typescript
{
  type: 'SKILL_RECOMMENDATION',
  title: '💡 Skills to Improve Your Profile',
  message: 'Based on your application, here are skills to learn...',
  data: {
    jobTitle: 'Node.js Developer',
    missingSkills: ['Docker', 'Kubernetes', 'AWS'],
    matchedSkills: ['Node.js', 'JavaScript', 'Express'],
    similarJobs: [...],
    skillsToLearn: [...]
  }
}
```

## Email Templates

### 1. Job Recommendation Email
- Shows top 5 matching jobs
- Includes match percentage for each job
- Provides direct links to job details
- Includes salary range and location

### 2. Skill Recommendation Email (NEW)
- Lists missing skills from rejected application
- Shows matched skills (what user has)
- Suggests similar jobs user can apply for
- Provides links to training courses for missing skills
- Includes tips for skill improvement

## User Requirements

To receive recommendations, users must have:
- ✅ **Approved KYC** (Individual KYC status = APPROVED)
- ✅ **Job Alerts Enabled** (`jobAlerts = true`)
- ✅ **Email Notifications Enabled** (`emailNotifications = true`)
- ✅ **Active Account** (`status = 'ACTIVE'`)
- ✅ **Verified Email** (`isEmailVerified = true`)

## Settings Location

Users can manage these settings in:
- **Dashboard → Profile → Notification Settings**
- Toggle: "Job Alerts"
- Toggle: "Email Notifications"

## Example Flow

### Scenario: User applies for "Senior Node.js Developer"

1. **User applies**:
   - Application created
   - ✅ Receives email: "Similar jobs you might like"
   - ✅ Receives Socket.io notification with 3 similar jobs

2. **Employer rejects**:
   - Status updated to "REJECTED"
   - ✅ Receives email: "Skills to improve your profile"
   - ✅ Receives Socket.io notification with:
     - Missing: Docker, Kubernetes, AWS
     - Matched: Node.js, JavaScript, Express
     - Similar jobs: 5 other Node.js positions

3. **User improves skills**:
   - Adds Docker, Kubernetes to profile
   - ✅ Next job recommendation will have higher match score
   - ✅ Better job opportunities appear

## API Endpoints

### Get Job Recommendations
```
GET /api/skills/recommendations?minScore=50&limit=10
```
Returns personalized job recommendations based on user's skills.

### Get Skills to Learn
```
GET /api/skills/to-learn
```
Returns suggested skills based on:
- Jobs user applied to
- Jobs user was rejected from
- Trending skills in the market

## Future Enhancements

1. **Skill Learning Paths**: Suggest courses/training for missing skills
2. **Skill Trends**: Show which skills are in high demand
3. **Career Progression**: Suggest next steps based on current skills
4. **Peer Comparison**: Show how user's skills compare to others in similar roles
5. **Skill Validation**: Allow users to take tests to verify skill proficiency

