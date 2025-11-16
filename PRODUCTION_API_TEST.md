# 🧪 Production API Testing Guide

## Base URL
```
https://hr-backend-rlth.onrender.com
```

---

## 📋 Test Endpoints

### **1. Health Check**
```bash
curl https://hr-backend-rlth.onrender.com/health
```

**Expected Response:**
```json
{
  "status": "healthy",
  "timestamp": "2025-11-15T...",
  "uptime": 123.45,
  "database": {
    "connected": true,
    "status": "healthy"
  },
  "cloudinary": {
    "connected": true,
    "status": "healthy"
  },
  "email": {
    "connected": true,
    "status": "healthy"
  }
}
```

---

### **2. User Registration**

```bash
curl -X POST https://hr-backend-rlth.onrender.com/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "Test123!@#",
    "name": "Test User",
    "phone": "1234567890"
  }'
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Registration successful. Please check your email for OTP verification.",
  "data": {
    "user": {
      "id": "user-id-here",
      "email": "test@example.com",
      "name": "Test User",
      "isEmailVerified": false
    }
  }
}
```

**Note:** Check your email for OTP code!

---

### **3. OTP Verification**

```bash
curl -X POST https://hr-backend-rlth.onrender.com/api/auth/verify-otp \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "otp": "123456",
    "type": "EMAIL_VERIFICATION"
  }'
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Email verified successfully",
  "data": {
    "user": {
      "id": "user-id-here",
      "email": "test@example.com",
      "isEmailVerified": true
    },
    "tokens": {
      "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
    }
  }
}
```

---

### **4. User Login**

```bash
curl -X POST https://hr-backend-rlth.onrender.com/api/auth/login \
  -H "Content-Type: application/json" \
  -c cookies.txt \
  -d '{
    "email": "test@example.com",
    "password": "Test123!@#"
  }'
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "user": {
      "id": "user-id-here",
      "email": "test@example.com",
      "name": "Test User",
      "isEmailVerified": true
    },
    "tokens": {
      "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
    }
  }
}
```

**Note:** Cookies are automatically set for refresh token (httpOnly, secure).

---

## 🚀 Quick Test Script

### **Option 1: Use the Test Script**

```bash
# Make script executable
chmod +x test_production_api.sh

# Run the test
./test_production_api.sh
```

### **Option 2: Manual Testing**

Copy and paste these commands one by one:

```bash
# 1. Health Check
curl https://hr-backend-rlth.onrender.com/health | jq

# 2. Register
curl -X POST https://hr-backend-rlth.onrender.com/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"Test123!@#","name":"Test User","phone":"1234567890"}' | jq

# 3. Verify OTP (replace 123456 with actual OTP from email)
curl -X POST https://hr-backend-rlth.onrender.com/api/auth/verify-otp \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","otp":"123456","type":"EMAIL_VERIFICATION"}' | jq

# 4. Login
curl -X POST https://hr-backend-rlth.onrender.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"Test123!@#"}' | jq
```

---

## 📝 Test with Different Tools

### **Using Postman:**

1. **Register:**
   - Method: `POST`
   - URL: `https://hr-backend-rlth.onrender.com/api/auth/register`
   - Body (JSON):
     ```json
     {
       "email": "test@example.com",
       "password": "Test123!@#",
       "name": "Test User",
       "phone": "1234567890"
     }
     ```

2. **Verify OTP:**
   - Method: `POST`
   - URL: `https://hr-backend-rlth.onrender.com/api/auth/verify-otp`
   - Body (JSON):
     ```json
     {
       "email": "test@example.com",
       "otp": "123456",
       "type": "EMAIL_VERIFICATION"
     }
     ```

3. **Login:**
   - Method: `POST`
   - URL: `https://hr-backend-rlth.onrender.com/api/auth/login`
   - Body (JSON):
     ```json
     {
       "email": "test@example.com",
       "password": "Test123!@#"
     }
     ```

### **Using JavaScript (Browser Console):**

```javascript
// 1. Register
fetch('https://hr-backend-rlth.onrender.com/api/auth/register', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: 'test@example.com',
    password: 'Test123!@#',
    name: 'Test User',
    phone: '1234567890'
  })
})
.then(r => r.json())
.then(console.log);

// 2. Verify OTP
fetch('https://hr-backend-rlth.onrender.com/api/auth/verify-otp', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: 'test@example.com',
    otp: '123456',
    type: 'EMAIL_VERIFICATION'
  })
})
.then(r => r.json())
.then(console.log);

// 3. Login
fetch('https://hr-backend-rlth.onrender.com/api/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  credentials: 'include',
  body: JSON.stringify({
    email: 'test@example.com',
    password: 'Test123!@#'
  })
})
.then(r => r.json())
.then(console.log);
```

---

## ✅ Expected Test Flow

1. ✅ **Health Check** → Should return healthy status
2. ✅ **Register** → Should create user and send OTP email
3. ✅ **Check Email** → Get OTP code from email
4. ✅ **Verify OTP** → Should verify email and return tokens
5. ✅ **Login** → Should return tokens and set cookies

---

## 🔍 Troubleshooting

### **If Registration Fails:**
- Check if email already exists
- Verify password meets requirements (min 8 chars, uppercase, lowercase, number, special char)
- Check server logs in Render dashboard

### **If OTP Not Received:**
- Check spam folder
- Verify email service is configured correctly
- Check Render logs for email sending errors

### **If Login Fails:**
- Ensure email is verified first
- Check password is correct
- Verify account is not locked (too many failed attempts)

---

## 📊 Test Results Template

```
✅ Health Check: [PASS/FAIL]
✅ Registration: [PASS/FAIL]
✅ OTP Email Received: [YES/NO]
✅ OTP Verification: [PASS/FAIL]
✅ Login: [PASS/FAIL]
✅ Tokens Received: [YES/NO]
```

---

**Ready to test your production API!** 🚀

