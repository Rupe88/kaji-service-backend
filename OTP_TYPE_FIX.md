# 🔧 OTP Type Validation Error Fix

## ❌ Error
```json
{
  "success": false,
  "message": "Validation error",
  "errors": [
    {
      "path": "type",
      "message": "Invalid OTP type"
    }
  ]
}
```

## 🔍 Problem

The OTP `type` field must be one of these **exact values**:
- `EMAIL_VERIFICATION` ✅
- `PASSWORD_RESET` ✅
- `LOGIN_OTP` ✅

**Common mistakes:**
- ❌ `VERIFICATION` (missing `EMAIL_` prefix)
- ❌ `EMAIL_VERIFY` (wrong name)
- ❌ `email_verification` (wrong case)
- ❌ `Email_Verification` (wrong case)

---

## ✅ Correct Request Format

### **For Email Verification (After Registration):**

```bash
curl -X POST https://hr-backend-rlth.onrender.com/api/auth/verify-otp \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "otp": "123456",
    "type": "EMAIL_VERIFICATION"
  }'
```

**Important:** Use `"EMAIL_VERIFICATION"` (all caps, with underscore)

---

## 📋 All Valid OTP Types

| Type | When to Use | Example |
|------|-------------|---------|
| `EMAIL_VERIFICATION` | After registration | Verify email address |
| `PASSWORD_RESET` | When resetting password | Reset forgotten password |
| `LOGIN_OTP` | Two-factor login | Additional login security |

---

## 🧪 Test Commands

### **1. Register (to get OTP):**
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

### **2. Verify OTP (CORRECT):**
```bash
curl -X POST https://hr-backend-rlth.onrender.com/api/auth/verify-otp \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "otp": "123456",
    "type": "EMAIL_VERIFICATION"
  }'
```

**✅ Use:** `"type": "EMAIL_VERIFICATION"` (exact match, all caps)

---

## ⚠️ Common Mistakes

### **❌ Wrong:**
```json
{
  "type": "VERIFICATION"  // Missing EMAIL_ prefix
}
```

### **❌ Wrong:**
```json
{
  "type": "email_verification"  // Wrong case
}
```

### **❌ Wrong:**
```json
{
  "type": "EMAIL_VERIFY"  // Wrong name
}
```

### **✅ Correct:**
```json
{
  "type": "EMAIL_VERIFICATION"  // Exact match
}
```

---

## 🔍 Verify Your Request

Make sure your request body has:
1. ✅ `email` - Valid email address
2. ✅ `otp` - 6-digit code from email
3. ✅ `type` - **Exactly** `"EMAIL_VERIFICATION"` (all caps, with underscore)

---

## 📝 Complete Example

```bash
# Step 1: Register
curl -X POST https://hr-backend-rlth.onrender.com/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "Test123!@#",
    "name": "Test User",
    "phone": "1234567890"
  }'

# Step 2: Check email for OTP (e.g., "123456")

# Step 3: Verify OTP (use EMAIL_VERIFICATION)
curl -X POST https://hr-backend-rlth.onrender.com/api/auth/verify-otp \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "otp": "123456",
    "type": "EMAIL_VERIFICATION"
  }'
```

---

## ✅ Summary

**Problem:** Invalid OTP type value  
**Solution:** Use `"EMAIL_VERIFICATION"` (exact match, all caps)  
**Valid Types:**
- `EMAIL_VERIFICATION` ✅
- `PASSWORD_RESET` ✅
- `LOGIN_OTP` ✅

**Make sure the `type` field matches exactly!** 🎯

