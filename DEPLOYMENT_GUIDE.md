# 🚀 Production Deployment Guide

## Quick Answer: Yes, you need to run `npm run build`!

---

## 📋 Pre-Deployment Checklist

### ✅ **1. Environment Variables**
Make sure your `.env` file has all required variables:
- `DATABASE_URL` (Neon PostgreSQL)
- `JWT_ACCESS_SECRET`
- `JWT_REFRESH_SECRET`
- `CLOUDINARY_*` (if using file uploads)
- `EMAIL_*` (if using email)
- `NODE_ENV=production`

### ✅ **2. Database Setup**
- Database migrations run
- Prisma Client generated

### ✅ **3. Build & Test**
- TypeScript compiled to JavaScript
- Tests passing (optional but recommended)

---

## 🏗️ Build Process

### **Step 1: Generate Prisma Client**
```bash
npm run prisma:generate
```
**Why:** Prisma Client needs to be generated before building.

### **Step 2: Build TypeScript to JavaScript**
```bash
npm run build
```
**What it does:**
- Compiles TypeScript (`src/`) to JavaScript (`dist/`)
- Creates production-ready code
- Outputs to `dist/` folder

**Expected output:**
```
dist/
├── server.js
├── config/
├── controllers/
├── middleware/
├── routes/
└── utils/
```

### **Step 3: Verify Build**
```bash
# Check if dist folder exists
ls -la dist/

# Check if main file exists
ls -la dist/server.js
```

---

## 🚀 Deployment Steps

### **Option 1: Local/Server Deployment**

```bash
# 1. Install dependencies (production only)
npm ci --production

# 2. Generate Prisma Client
npm run prisma:generate

# 3. Run database migrations (if needed)
npm run prisma:migrate deploy

# 4. Build TypeScript
npm run build

# 5. Start production server
npm start
```

**Note:** `npm ci` installs only production dependencies (faster, cleaner).

---

### **Option 2: Platform Deployment (Render, Railway, Vercel, etc.)**

#### **For Render.com:**

1. **Connect Repository** to Render
2. **Set Build Command:**
   ```bash
   npm ci && npm run prisma:generate && npm run build
   ```
3. **Set Start Command:**
   ```bash
   npm start
   ```
4. **Set Environment Variables** in Render dashboard
5. **Deploy!**

#### **For Railway:**

1. **Connect Repository** to Railway
2. **Railway auto-detects** Node.js projects
3. **Set Environment Variables** in Railway dashboard
4. **Add Build Command** (if needed):
   ```bash
   npm ci && npm run prisma:generate && npm run build
   ```
5. **Deploy!**

#### **For Vercel/Netlify:**

These platforms are better for frontend. For backend, use:
- **Render** (recommended)
- **Railway**
- **Heroku**
- **DigitalOcean App Platform**

---

## 📝 Complete Deployment Script

### **Full Production Deployment:**

```bash
# 1. Clean install (removes node_modules and reinstalls)
rm -rf node_modules package-lock.json
npm install

# 2. Generate Prisma Client
npm run prisma:generate

# 3. Run migrations (production)
npm run prisma:migrate deploy

# 4. Build TypeScript
npm run build

# 5. Verify build
ls -la dist/server.js

# 6. Start production server
NODE_ENV=production npm start
```

---

## 🔧 Production Environment Setup

### **1. Environment Variables (.env)**

```env
# Node Environment
NODE_ENV=production

# Database (Neon PostgreSQL)
DATABASE_URL="postgresql://user:password@ep-xxx-xxx.region.aws.neon.tech/neondb?sslmode=require"

# JWT Secrets (generate with: openssl rand -base64 32)
JWT_ACCESS_SECRET=your-access-token-secret-min-32-chars
JWT_REFRESH_SECRET=your-refresh-token-secret-min-32-chars

# Server
PORT=5000

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

# Keep-Alive (For free-tier hosting)
KEEP_ALIVE_URL=https://your-app.onrender.com/health
KEEP_ALIVE_INTERVAL=14
```

### **2. Generate JWT Secrets**

```bash
# Generate secure random secrets
openssl rand -base64 32  # For JWT_ACCESS_SECRET
openssl rand -base64 32  # For JWT_REFRESH_SECRET
```

---

## 🗄️ Database Migrations

### **Development:**
```bash
npm run prisma:migrate
```

### **Production:**
```bash
npm run prisma:migrate deploy
```
**Why:** `deploy` applies migrations without prompting (safer for production).

---

## ✅ Post-Deployment Verification

### **1. Check Server is Running**
```bash
# Should see: "Server running on port 5000"
curl http://localhost:5000/health
```

### **2. Test Health Endpoint**
```bash
curl https://your-app.onrender.com/health
```

**Expected response:**
```json
{
  "status": "healthy",
  "timestamp": "2025-01-15T10:30:00.000Z",
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

### **3. Test API Endpoints**
```bash
# Test registration
curl -X POST https://your-app.onrender.com/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"Test123!","name":"Test User","phone":"1234567890"}'
```

---

## 🐳 Docker Deployment (Optional)

### **Dockerfile:**
```dockerfile
FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY prisma ./prisma/

# Install dependencies
RUN npm ci --production

# Generate Prisma Client
RUN npm run prisma:generate

# Copy source code
COPY . .

# Build TypeScript
RUN npm run build

# Expose port
EXPOSE 5000

# Start server
CMD ["npm", "start"]
```

### **Build & Run:**
```bash
# Build image
docker build -t hr-platform-backend .

# Run container
docker run -p 5000:5000 --env-file .env hr-platform-backend
```

---

## 📊 Monitoring & Logs

### **Check Logs:**
```bash
# If using PM2
pm2 logs

# If using systemd
journalctl -u hr-platform-backend -f

# If using Docker
docker logs -f container-name
```

### **Monitor Health:**
- Check `/health` endpoint regularly
- Monitor database connections
- Watch for errors in logs

---

## 🔄 Update/Re-deploy Process

### **When you make changes:**

```bash
# 1. Pull latest code
git pull origin main

# 2. Install new dependencies (if any)
npm install

# 3. Generate Prisma Client (if schema changed)
npm run prisma:generate

# 4. Run migrations (if schema changed)
npm run prisma:migrate deploy

# 5. Rebuild
npm run build

# 6. Restart server
# If using PM2:
pm2 restart hr-platform-backend

# If using systemd:
sudo systemctl restart hr-platform-backend

# If using Docker:
docker-compose restart
```

---

## ⚠️ Common Issues

### **Issue 1: "Cannot find module 'dist/server.js'"**
**Solution:**
```bash
npm run build
```

### **Issue 2: "Prisma Client not generated"**
**Solution:**
```bash
npm run prisma:generate
```

### **Issue 3: "Database connection failed"**
**Solution:**
- Check `DATABASE_URL` in environment variables
- Verify database is accessible
- Check firewall/network settings

### **Issue 4: "Port already in use"**
**Solution:**
```bash
# Find process using port 5000
lsof -i :5000

# Kill process
kill -9 <PID>
```

---

## 🎯 Quick Deployment Commands

### **One-Line Build & Start:**
```bash
npm run prisma:generate && npm run build && npm start
```

### **Full Production Setup:**
```bash
npm ci && npm run prisma:generate && npm run prisma:migrate deploy && npm run build && NODE_ENV=production npm start
```

---

## 📝 Summary

### **Yes, you MUST run `npm run build` before deployment!**

**Deployment Steps:**
1. ✅ `npm run prisma:generate` - Generate Prisma Client
2. ✅ `npm run build` - Build TypeScript to JavaScript
3. ✅ `npm start` - Start production server

**For Platform Deployment:**
- Set **Build Command**: `npm ci && npm run prisma:generate && npm run build`
- Set **Start Command**: `npm start`
- Set **Environment Variables** in platform dashboard

**Your backend is ready to deploy!** 🚀

