# 🔧 Keep-Alive 400 Error Fix

## ❌ Problem
```
⚠️  Keep-alive ping returned status 400 (11ms)
```

## 🔍 Root Causes

1. **Using `http` module for HTTPS URLs** - The keep-alive was using `http.request()` for HTTPS URLs
2. **CORS blocking** - Health endpoint was after CORS middleware
3. **Missing headers** - No proper headers in the request

---

## ✅ Fixes Applied

### **1. Fixed HTTPS Support**
- Added `https` module import
- Detects protocol and uses correct client (`https` for HTTPS, `http` for HTTP)

### **2. Moved Health Endpoint Before CORS**
- Health endpoint is now **before** CORS middleware
- Allows keep-alive pings without CORS issues

### **3. Added Proper Headers**
- Added `User-Agent` header
- Added `Accept` header
- Increased timeout to 10 seconds

---

## 📝 Changes Made

### **1. `src/utils/keepAlive.ts`**
- ✅ Added `https` import
- ✅ Detects HTTPS and uses correct client
- ✅ Added proper headers
- ✅ Increased timeout to 10 seconds
- ✅ Better error logging

### **2. `src/server.ts`**
- ✅ Moved `/health` endpoint **before** CORS middleware
- ✅ Health endpoint is now accessible without CORS restrictions

---

## 🚀 Updated Keep-Alive Configuration

### **Environment Variable:**
```env
KEEP_ALIVE_URL=https://hr-backend-rlth.onrender.com/health
KEEP_ALIVE_INTERVAL=14
```

**Important:** Make sure `KEEP_ALIVE_URL` is set to your **full production URL** with `https://`

---

## ✅ What's Fixed

1. ✅ **HTTPS Support** - Now uses `https` module for HTTPS URLs
2. ✅ **CORS Issue** - Health endpoint accessible without CORS
3. ✅ **Proper Headers** - Added User-Agent and Accept headers
4. ✅ **Better Logging** - Shows response data on 400 errors

---

## 🧪 Test the Fix

### **1. Test Health Endpoint:**
```bash
curl https://hr-backend-rlth.onrender.com/health
```

Should return 200 OK.

### **2. Check Keep-Alive Logs:**
After deployment, check Render logs. You should see:
```
✅ Keep-alive ping successful (XXms) - Server is active
```

Instead of:
```
⚠️  Keep-alive ping returned status 400
```

---

## 📋 Next Steps

1. **Commit and push:**
   ```bash
   git add src/utils/keepAlive.ts src/server.ts
   git commit -m "Fix keep-alive 400 error: HTTPS support and CORS"
   git push origin main
   ```

2. **Verify in Render:**
   - Check logs after deployment
   - Should see successful pings instead of 400 errors

---

## ✅ Summary

**Problem:** Keep-alive getting 400 errors  
**Causes:**
- Using `http` for HTTPS URLs
- CORS blocking health endpoint
- Missing headers

**Fixes:**
- ✅ Added HTTPS support
- ✅ Moved health endpoint before CORS
- ✅ Added proper headers

**Result:** Keep-alive should now work correctly! 🎉

