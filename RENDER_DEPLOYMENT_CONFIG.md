# 🚀 Render.com Deployment Configuration

## 📋 Configuration Settings

### **1. Node Version**
```
Node: 20
```
(Or latest LTS version)

### **2. Branch**
```
main
```
(Your main branch name)

### **3. Region**
```
Singapore (Southeast Asia)
```
(Or choose closest to your users)

### **4. Root Directory** (if field exists)
```
.
```
(Leave empty or use `.` for root)

---

## 🔧 Build & Start Commands

### **Build Command:**
```bash
npm install --include=dev && npm run prisma:generate && npm run build
```

**What it does:**
- `npm install --include=dev` - Install ALL dependencies including devDependencies (required for TypeScript build)
- `npm run prisma:generate` - Generate Prisma Client
- `npm run build` - Build TypeScript to JavaScript

**Important:** The `--include=dev` flag ensures devDependencies are installed. This is critical because TypeScript and all `@types/*` packages are in devDependencies.

### **Start Command:**
```bash
node dist/server.js
```

---

## 🌍 Environment Variables

Add these in Render's **Environment** section:

### **Required:**
```env
NODE_ENV=production
DATABASE_URL=postgresql://user:password@ep-xxx-xxx.region.aws.neon.tech/neondb?sslmode=require
JWT_ACCESS_SECRET=your-access-token-secret-min-32-chars
JWT_REFRESH_SECRET=your-refresh-token-secret-min-32-chars
PORT=8000
```

### **Optional (but recommended):**
```env
# Cloudinary (File Uploads)
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret

# Email (Nodemailer - Gmail)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password
EMAIL_FROM=your-email@gmail.com

# SendGrid (Optional - Fallback)
SENDGRID_API_KEY=your-sendgrid-api-key
SENDGRID_FROM=your-email@gmail.com

# Keep-Alive (For free-tier)
KEEP_ALIVE_URL=https://your-app.onrender.com/health
KEEP_ALIVE_INTERVAL=14

# Frontend URL (CORS)
FRONTEND_URL=https://your-frontend.com
```

---

## 📝 Complete Configuration Summary

### **Render.com Settings:**

| Field | Value |
|-------|-------|
| **Node Version** | `20` (or latest LTS) |
| **Branch** | `main` |
| **Region** | `Singapore (Southeast Asia)` |
| **Root Directory** | `.` (or leave empty) |
| **Build Command** | `npm ci && npm run prisma:generate && npm run build` |
| **Start Command** | `node dist/server.js` |
| **Port** | `8000` (or set via PORT env var) |

---

## ⚠️ Important Notes

### **1. Database Migrations**
After first deployment, you may need to run migrations:
```bash
# In Render's Shell or via CLI
npm run prisma:migrate deploy
```

### **2. Port Configuration**
- Render automatically sets `PORT` environment variable
- Your app should use `process.env.PORT || 8000`
- Check your `src/config/env.ts` to ensure it reads `PORT`

### **3. Keep-Alive Service**
- Set `KEEP_ALIVE_URL` to your Render app URL
- This prevents free-tier apps from sleeping
- Format: `https://your-app-name.onrender.com/health`

### **4. Database Connection**
- Use Neon's **connection pooler** URL for better performance
- Format: `postgresql://user:password@ep-xxx-xxx-pooler.region.aws.neon.tech/neondb?sslmode=require`
- Add `?pgbouncer=true` if using PgBouncer

---

## ✅ Deployment Checklist

- [ ] Node version set to `20`
- [ ] Branch set to `main`
- [ ] Region selected (Singapore)
- [ ] Build command: `npm ci && npm run prisma:generate && npm run build`
- [ ] Start command: `node dist/server.js`
- [ ] All environment variables added
- [ ] `DATABASE_URL` configured
- [ ] `JWT_ACCESS_SECRET` and `JWT_REFRESH_SECRET` set
- [ ] `NODE_ENV=production` set
- [ ] `KEEP_ALIVE_URL` set to your Render URL

---

## 🧪 Post-Deployment Testing

### **1. Check Health Endpoint:**
```bash
curl https://your-app-name.onrender.com/health
```

### **2. Test API:**
```bash
curl https://your-app-name.onrender.com/api/auth/register \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"Test123!","name":"Test User","phone":"1234567890"}'
```

---

## 🔄 Update Process

When you push to GitHub:
1. Render automatically detects changes
2. Runs build command
3. Deploys new version
4. Restarts server

**No manual deployment needed!** 🎉

---

## 📊 Monitoring

- Check **Logs** tab in Render dashboard
- Monitor **Metrics** for CPU, Memory, Response times
- Set up **Alerts** for errors

---

## 🎯 Quick Reference

**Build Command:**
```bash
npm ci && npm run prisma:generate && npm run build
```

**Start Command:**
```bash
node dist/server.js
```

**Port:** `8000` (or via `PORT` env var)

**Health Check:** `/health`

---

**Your backend is ready to deploy on Render!** 🚀

