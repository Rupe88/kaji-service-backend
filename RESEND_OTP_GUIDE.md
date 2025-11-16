# 🔄 Resend OTP Endpoint Guide

## 📍 Endpoint
```
POST https://hr-backend-rlth.onrender.com/api/auth/resend-otp
```

---

## ✅ Correct Request Format

### **For Email Verification OTP:**

```bash
curl -X POST https://hr-backend-rlth.onrender.com/api/auth/resend-otp \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "type": "EMAIL_VERIFICATION"
  }'
```

---

## 📋 Required Fields

| Field | Type | Required | Valid Values |
|-------|------|----------|--------------|
| `email` | string | ✅ Yes | Valid email address |
| `type` | string | ✅ Yes | `EMAIL_VERIFICATION`, `PASSWORD_RESET`, or `LOGIN_OTP` |

---

## 🎯 Valid OTP Types

### **1. EMAIL_VERIFICATION**
Use this to resend email verification OTP after registration.

```json
{
  "email": "test@example.com",
  "type": "EMAIL_VERIFICATION"
}
```

### **2. PASSWORD_RESET**
Use this to resend password reset OTP.

```json
{
  "email": "test@example.com",
  "type": "PASSWORD_RESET"
}
```

### **3. LOGIN_OTP**
Use this to resend login OTP (for two-factor authentication).

```json
{
  "email": "test@example.com",
  "type": "LOGIN_OTP"
}
```

---

## ✅ Expected Response

### **Success:**
```json
{
  "success": true,
  "message": "OTP sent successfully"
}
```

### **Error - User Not Found:**
```json
{
  "success": false,
  "message": "User not found"
}
```

### **Error - Validation:**
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

---

## 🧪 Test Examples

### **Example 1: Resend Email Verification OTP**

```bash
curl -X POST https://hr-backend-rlth.onrender.com/api/auth/resend-otp \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "type": "EMAIL_VERIFICATION"
  }'
```

### **Example 2: Resend Password Reset OTP**

```bash
curl -X POST https://hr-backend-rlth.onrender.com/api/auth/resend-otp \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "type": "PASSWORD_RESET"
  }'
```

---

## ⚠️ Common Errors

### **Error 1: Invalid OTP Type**
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

**Solution:** Use exact type: `"EMAIL_VERIFICATION"`, `"PASSWORD_RESET"`, or `"LOGIN_OTP"`

### **Error 2: User Not Found**
```json
{
  "success": false,
  "message": "User not found"
}
```

**Solution:** Make sure the email is registered first

### **Error 3: Missing Fields**
```json
{
  "success": false,
  "message": "Validation error",
  "errors": [
    {
      "path": "email",
      "message": "Required"
    }
  ]
}
```

**Solution:** Include both `email` and `type` fields

---

## 📝 Complete Test Flow

```bash
# 1. Register (if not already registered)
curl -X POST https://hr-backend-rlth.onrender.com/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "Test123!@#",
    "name": "Test User",
    "phone": "1234567890"
  }'

# 2. Resend OTP (if you didn't receive it)
curl -X POST https://hr-backend-rlth.onrender.com/api/auth/resend-otp \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "type": "EMAIL_VERIFICATION"
  }'

# 3. Check email for new OTP

# 4. Verify OTP
curl -X POST https://hr-backend-rlth.onrender.com/api/auth/verify-otp \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "otp": "123456",
    "type": "EMAIL_VERIFICATION"
  }'
```

---

## 🔍 What Happens When You Resend OTP

1. ✅ Finds user by email
2. ✅ Invalidates old OTPs of the same type
3. ✅ Generates new 6-digit OTP
4. ✅ Sends OTP to email
5. ✅ OTP expires in 10 minutes

---

## ✅ Summary

**Endpoint:** `POST /api/auth/resend-otp`

**Required Fields:**
- `email` - User's email address
- `type` - Must be exactly: `"EMAIL_VERIFICATION"`, `"PASSWORD_RESET"`, or `"LOGIN_OTP"`

**Example:**
```json
{
  "email": "test@example.com",
  "type": "EMAIL_VERIFICATION"
}
```

**Make sure the `type` field matches exactly!** 🎯

