# 🔧 Production Database Fix - Missing Tables

## ❌ Error
```
The table `public.users` does not exist in the current database.
```

## 🔍 What This Means

Your **production database is empty** - no tables have been created yet. You need to run **Prisma migrations** to create all the database tables.

---

## ✅ Solution: Run Database Migrations

### **Option 1: Using Render Shell (Recommended)**

1. **Go to Render Dashboard**
   - Open your service: `hr-backend-rlth`
   - Click on **"Shell"** tab (or "Logs" → "Shell")

2. **Run Migration Command:**
   ```bash
   npm run prisma:migrate deploy
   ```

   This will:
   - Create all database tables
   - Set up all relationships
   - Apply all migrations

---

### **Option 2: Using Prisma Migrate (Local)**

If you have access to your production database URL:

1. **Set Production Database URL:**
   ```bash
   export DATABASE_URL="your-production-database-url"
   ```

2. **Run Migrations:**
   ```bash
   npm run prisma:migrate deploy
   ```

---

### **Option 3: Using Prisma Studio (Alternative)**

If migrations don't work, you can push the schema directly:

```bash
npx prisma db push
```

**⚠️ Warning:** `db push` is for development. Use `migrate deploy` for production.

---

## 🚀 Step-by-Step Fix

### **Step 1: Check if Migrations Exist**

```bash
ls -la prisma/migrations/
```

If the folder is empty or doesn't exist, you need to create migrations first.

### **Step 2: Create Initial Migration (If Needed)**

```bash
npm run prisma:migrate
```

This will:
- Create migration files
- Apply them to your database

### **Step 3: Deploy to Production**

```bash
npm run prisma:migrate deploy
```

---

## 📋 Complete Fix Process

### **For Production (Render):**

1. **In Render Dashboard:**
   - Go to your service
   - Click **"Shell"** tab
   - Run:
     ```bash
     npm run prisma:migrate deploy
     ```

2. **Or Add to Build Command:**
   Update your Render build command to:
   ```bash
   npm install --include=dev && npm run prisma:generate && npm run prisma:migrate deploy && npm run build
   ```

---

## 🔍 Verify Tables Are Created

After running migrations, verify:

```bash
# In Render Shell or locally
npx prisma studio
```

Or check via SQL:
```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public';
```

You should see tables like:
- `users`
- `individual_kyc`
- `industrial_kyc`
- `job_postings`
- `job_applications`
- etc.

---

## ⚠️ Important Notes

1. **First Time Setup:**
   - If this is the first deployment, you need to run migrations
   - Migrations create all database tables

2. **Database URL:**
   - Make sure `DATABASE_URL` is set correctly in Render environment variables
   - Should point to your Neon PostgreSQL database

3. **Migration Files:**
   - Migration files should be committed to Git
   - They're in `prisma/migrations/` folder

---

## 🎯 Quick Fix Commands

### **In Render Shell:**
```bash
# 1. Generate Prisma Client
npm run prisma:generate

# 2. Deploy migrations (creates all tables)
npm run prisma:migrate deploy

# 3. Verify (optional)
npx prisma studio
```

---

## ✅ After Running Migrations

Once migrations are complete:
- ✅ All tables will be created
- ✅ Registration endpoint will work
- ✅ All API endpoints will work
- ✅ Database will be ready for use

---

## 🔄 Update Render Build Command (Optional)

To automatically run migrations on each deployment, update your build command:

**Current:**
```bash
npm install --include=dev && npm run prisma:generate && npm run build
```

**Updated (with migrations):**
```bash
npm install --include=dev && npm run prisma:generate && npm run prisma:migrate deploy && npm run build
```

**Note:** Only add `prisma:migrate deploy` if you want migrations to run on every deployment. For first-time setup, run it manually once.

---

## 📝 Summary

**Problem:** Database tables don't exist  
**Solution:** Run `npm run prisma:migrate deploy`  
**Where:** Render Shell or locally with production DATABASE_URL  
**Result:** All tables created, API will work ✅

---

**Run the migration command and your API will work!** 🚀

