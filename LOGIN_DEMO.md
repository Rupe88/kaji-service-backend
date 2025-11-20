# 🔐 Login Demo - Seeded Accounts

**All seeded accounts use the same password: `Password123!`**

---

## 👔 **EMPLOYER ACCOUNTS**

### 1. **Tech Solutions Nepal**
- **Email:** `employer1@example.com`
- **Password:** `Password123!`
- **Location:** Kathmandu, Bagmati
- **Company:** Tech Solutions Nepal
- **Role:** INDUSTRIAL (Employer)

### 2. **Digital Innovations Pvt. Ltd.**
- **Email:** `employer2@example.com`
- **Password:** `Password123!`
- **Location:** Pokhara, Gandaki
- **Company:** Digital Innovations Pvt. Ltd.
- **Role:** INDUSTRIAL (Employer)

### 3. **Cloud Services Nepal**
- **Email:** `employer3@example.com`
- **Password:** `Password123!`
- **Location:** Lalitpur, Bagmati
- **Company:** Cloud Services Nepal
- **Role:** INDUSTRIAL (Employer)

---

## 👤 **JOB SEEKER ACCOUNTS**

### 1. **Raj Sharma**
- **Email:** `seeker1@example.com`
- **Password:** `Password123!`
- **Location:** Kathmandu, Bagmati
- **Skills:** React, TypeScript, Node.js, JavaScript, HTML, CSS, Redux
- **Role:** INDIVIDUAL (Job Seeker)
- **KYC Status:** APPROVED ✅

### 2. **Priya Gurung**
- **Email:** `seeker2@example.com`
- **Password:** `Password123!`
- **Location:** Pokhara, Gandaki
- **Skills:** Python, Django, Flask, SQL, REST, JavaScript
- **Role:** INDIVIDUAL (Job Seeker)
- **KYC Status:** APPROVED ✅

### 3. **Amit Karki**
- **Email:** `seeker3@example.com`
- **Password:** `Password123!`
- **Location:** Lalitpur, Bagmati
- **Skills:** React, Node.js, MongoDB, Express, JavaScript, AWS
- **Role:** INDIVIDUAL (Job Seeker)
- **KYC Status:** APPROVED ✅

### 4. **Sita Tamang**
- **Email:** `seeker4@example.com`
- **Password:** `Password123!`
- **Location:** Kathmandu, Bagmati
- **Skills:** Vue, JavaScript, TypeScript, HTML, CSS, React Native
- **Role:** INDIVIDUAL (Job Seeker)
- **KYC Status:** APPROVED ✅

### 5. **Bikash Rai**
- **Email:** `seeker5@example.com`
- **Password:** `Password123!`
- **Location:** Bhaktapur, Bagmati
- **Skills:** AWS, Docker, Kubernetes, Linux, CI, CD, Python
- **Role:** INDIVIDUAL (Job Seeker)
- **KYC Status:** APPROVED ✅

### 6. **Suresh Yadav** (NEW - Itahari)
- **Email:** `seeker6@example.com`
- **Password:** `Password123!`
- **Location:** Itahari, Sunsari, Koshi Province
- **Skills:** Java, Spring, MySQL, REST, Microservices, JavaScript, Git
- **Role:** INDIVIDUAL (Job Seeker)
- **KYC Status:** APPROVED ✅

---

## 📝 **HOW TO LOGIN**

### **Step 1: Navigate to Login Page**
1. Go to your frontend URL (e.g., `http://localhost:3000`)
2. Click on "Login" or navigate to `/login`

### **Step 2: Enter Credentials**
1. **Email:** Enter any of the emails above (e.g., `seeker1@example.com`)
2. **Password:** Enter `Password123!` (case-sensitive)

### **Step 3: Login**
1. Click "Login" or "Sign In"
2. You'll be redirected to the dashboard

---

## 🎯 **QUICK TEST SCENARIOS**

### **Test as Job Seeker:**
```
Email: seeker1@example.com
Password: Password123!
```
- ✅ Can view job listings
- ✅ Can see personalized job recommendations
- ✅ Can apply to jobs (KYC is approved)
- ✅ Can see location map with distance
- ✅ Can view applications

### **Test as Employer:**
```
Email: employer1@example.com
Password: Password123!
```
- ✅ Can view posted jobs
- ✅ Can create new job postings
- ✅ Can view applications
- ✅ Can manage company profile

### **Test Location-Based Features:**
```
Email: seeker6@example.com (Itahari)
Password: Password123!
```
- ✅ Can see distance to jobs in other cities
- ✅ Can see location map
- ✅ Can test location-based job matching

---

## 🔍 **VERIFICATION**

After logging in, you should see:
- ✅ Dashboard with personalized content
- ✅ Job recommendations (for job seekers)
- ✅ Location-based matching
- ✅ Full KYC status (APPROVED)
- ✅ Ability to apply to jobs

---

## ⚠️ **IMPORTANT NOTES**

1. **Password:** All accounts use `Password123!` (case-sensitive)
2. **KYC Status:** All seeded accounts have APPROVED KYC
3. **Email Verification:** All accounts are email verified
4. **Location Data:** All accounts have full location data with coordinates
5. **Skills:** All job seekers have technical skills for matching

---

## 🚀 **QUICK START**

1. **Seed the database:**
   ```bash
   npm run prisma:seed
   ```

2. **Start the backend:**
   ```bash
   npm run dev
   ```

3. **Start the frontend:**
   ```bash
   cd frontend && npm run dev
   ```

4. **Login with any account:**
   - Email: `seeker1@example.com`
   - Password: `Password123!`

---

## 📍 **LOCATION DATA**

All seeded accounts include:
- ✅ Province
- ✅ District
- ✅ City/Municipality
- ✅ Latitude & Longitude (for map display)
- ✅ Full address details

---

**Happy Testing! 🎉**

