# 🔧 Production Email Service Fix

## ❌ Current Status
```
Email Service:
  Nodemailer:  ❌ Disconnected
  SendGrid:    ⚪ Not configured
```

## 🔍 Problem

Email service is not configured in Render production environment. You need to add email environment variables.

---

## ✅ Solution: Add Environment Variables in Render

### **Step 1: Go to Render Dashboard**

1. Open your service: `hr-backend-rlth`
2. Click on **"Environment"** tab
3. Add the following environment variables:

---

## 📋 Required Environment Variables

### **For Nodemailer (Gmail) - Primary Email Service:**

```env
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password
EMAIL_FROM=your-email@gmail.com
```

**Important Notes:**
- `EMAIL_USER` - Your Gmail address
- `EMAIL_PASS` - **Gmail App Password** (NOT your regular password!)
- `EMAIL_FROM` - Usually same as `EMAIL_USER`

### **For SendGrid (Optional - Fallback):**

```env
SENDGRID_API_KEY=SG.your-sendgrid-api-key-here
SENDGRID_FROM=your-email@gmail.com
```

---

## 🔑 How to Get Gmail App Password

### **Step 1: Enable 2-Step Verification**
1. Go to [Google Account Security](https://myaccount.google.com/security)
2. Enable **2-Step Verification** (if not already enabled)

### **Step 2: Generate App Password**
1. Go to [App Passwords](https://myaccount.google.com/apppasswords)
2. Select **"Mail"** and **"Other (Custom name)"**
3. Enter name: `HR Platform Backend`
4. Click **"Generate"**
5. Copy the 16-character password (no spaces)

### **Step 3: Use App Password**
- Use this 16-character password as `EMAIL_PASS`
- Format: `xxxx xxxx xxxx xxxx` (remove spaces: `xxxxxxxxxxxxxxxx`)

---

## 📝 Complete Environment Variables for Render

### **Required (Nodemailer):**
```env
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-16-char-app-password
EMAIL_FROM=your-email@gmail.com
```

### **Optional (SendGrid - Fallback):**
```env
SENDGRID_API_KEY=SG.your-sendgrid-api-key
SENDGRID_FROM=your-email@gmail.com
```

---

## 🚀 Steps to Fix in Render

### **1. Open Render Dashboard**
- Go to: https://dashboard.render.com
- Select your service: `hr-backend-rlth`

### **2. Go to Environment Tab**
- Click **"Environment"** in the left sidebar
- Scroll to **"Environment Variables"** section

### **3. Add Email Variables**
Click **"Add Environment Variable"** and add each:

| Key | Value | Example |
|-----|-------|---------|
| `EMAIL_HOST` | `smtp.gmail.com` | `smtp.gmail.com` |
| `EMAIL_PORT` | `587` | `587` |
| `EMAIL_USER` | Your Gmail | `your-email@gmail.com` |
| `EMAIL_PASS` | App Password | `abcdefghijklmnop` |
| `EMAIL_FROM` | Your Gmail | `your-email@gmail.com` |

### **4. (Optional) Add SendGrid**
| Key | Value | Example |
|-----|-------|---------|
| `SENDGRID_API_KEY` | Your API Key | `SG.xxxxxxxxxxxxx` |
| `SENDGRID_FROM` | Your Email | `your-email@gmail.com` |

### **5. Save and Redeploy**
- Click **"Save Changes"**
- Render will automatically redeploy
- Wait for deployment to complete

---

## ✅ Verify Email Service

### **After Deployment, Check Logs:**

You should see:
```
✅ Email service (Gmail/Nodemailer) connected successfully
📧 SMTP: smtp.gmail.com:587
📮 From: your-email@gmail.com
```

Instead of:
```
❌ Email service (Nodemailer) connection failed
```

### **Test Health Endpoint:**
```bash
curl https://hr-backend-rlth.onrender.com/health
```

Should show:
```json
{
  "services": {
    "email": {
      "connected": true,
      "status": "healthy",
      "nodemailer": {
        "connected": true,
        "status": "healthy"
      }
    }
  }
}
```

---

## 🔍 Troubleshooting

### **Issue 1: "Less secure app access" Error**
**Solution:** Use **App Password** instead of regular password

### **Issue 2: "Authentication failed"**
**Solution:**
- Make sure 2-Step Verification is enabled
- Use App Password (16 characters, no spaces)
- Check `EMAIL_USER` matches your Gmail

### **Issue 3: "Connection timeout"**
**Solution:**
- Check `EMAIL_HOST` is `smtp.gmail.com`
- Check `EMAIL_PORT` is `587`
- Verify firewall/network settings

### **Issue 4: SendGrid Not Working**
**Solution:**
- Make sure API key starts with `SG.`
- Verify API key is correct
- Check SendGrid account is active

---

## 📋 Quick Checklist

- [ ] Gmail 2-Step Verification enabled
- [ ] Gmail App Password generated
- [ ] `EMAIL_HOST` = `smtp.gmail.com`
- [ ] `EMAIL_PORT` = `587`
- [ ] `EMAIL_USER` = Your Gmail address
- [ ] `EMAIL_PASS` = 16-character App Password
- [ ] `EMAIL_FROM` = Your Gmail address
- [ ] (Optional) `SENDGRID_API_KEY` = Your SendGrid API key
- [ ] (Optional) `SENDGRID_FROM` = Your email
- [ ] Saved changes in Render
- [ ] Redeployed successfully

---

## 🎯 Summary

**Problem:** Email service not configured in production  
**Solution:** Add email environment variables in Render  
**Required Variables:**
- `EMAIL_HOST`
- `EMAIL_PORT`
- `EMAIL_USER`
- `EMAIL_PASS` (Gmail App Password)
- `EMAIL_FROM`

**After adding variables, Render will auto-redeploy and email service will work!** ✅




