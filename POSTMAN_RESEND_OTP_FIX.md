# 🔧 Postman Resend OTP Fix

## ❌ Your Current Request (WRONG)

```json
{
    "email":"chyrupesh828@gmail.com"
}
```

**Problem:** Missing `type` field!

---

## ✅ Correct Request Format

### **For Postman:**

**Method:** `POST`  
**URL:** `https://hr-backend-rlth.onrender.com/api/auth/resend-otp`  
**Headers:**
```
Content-Type: application/json
```

**Body (raw JSON):**
```json
{
    "email": "chyrupesh828@gmail.com",
    "type": "EMAIL_VERIFICATION"
}
```

---

## 📋 Required Fields

| Field | Required | Example Value |
|-------|----------|---------------|
| `email` | ✅ Yes | `"chyrupesh828@gmail.com"` |
| `type` | ✅ Yes | `"EMAIL_VERIFICATION"` |

---

## 🎯 Valid Type Values

You must include `type` with one of these exact values:

1. **`EMAIL_VERIFICATION`** - For email verification after registration
2. **`PASSWORD_RESET`** - For password reset
3. **`LOGIN_OTP`** - For login OTP

---

## 📝 Postman Setup Steps

### **Step 1: Set Method & URL**
- Method: `POST`
- URL: `https://hr-backend-rlth.onrender.com/api/auth/resend-otp`

### **Step 2: Set Headers**
- Key: `Content-Type`
- Value: `application/json`

### **Step 3: Set Body**
- Select: `raw`
- Format: `JSON`
- Body:
```json
{
    "email": "chyrupesh828@gmail.com",
    "type": "EMAIL_VERIFICATION"
}
```

---

## ✅ Complete Postman Request

```
POST https://hr-backend-rlth.onrender.com/api/auth/resend-otp

Headers:
Content-Type: application/json

Body (raw JSON):
{
    "email": "chyrupesh828@gmail.com",
    "type": "EMAIL_VERIFICATION"
}
```

---

## 🧪 Test All OTP Types

### **1. Email Verification:**
```json
{
    "email": "chyrupesh828@gmail.com",
    "type": "EMAIL_VERIFICATION"
}
```

### **2. Password Reset:**
```json
{
    "email": "chyrupesh828@gmail.com",
    "type": "PASSWORD_RESET"
}
```

### **3. Login OTP:**
```json
{
    "email": "chyrupesh828@gmail.com",
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

### **Error - Missing Type:**
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

## 🔍 Why You Got the Error

Your request was:
```json
{
    "email":"chyrupesh828@gmail.com"
}
```

**Missing:** `type` field

**Fix:** Add `type` field:
```json
{
    "email": "chyrupesh828@gmail.com",
    "type": "EMAIL_VERIFICATION"
}
```

---

## 📝 Quick Fix

**In Postman, update your body to:**

```json
{
    "email": "chyrupesh828@gmail.com",
    "type": "EMAIL_VERIFICATION"
}
```

**That's it!** The `type` field is required. ✅

---

## ✅ Summary

**Problem:** Missing `type` field in request  
**Solution:** Add `"type": "EMAIL_VERIFICATION"` to your JSON body  
**Valid Types:** `EMAIL_VERIFICATION`, `PASSWORD_RESET`, `LOGIN_OTP`

**Update your Postman request body and try again!** 🎯

