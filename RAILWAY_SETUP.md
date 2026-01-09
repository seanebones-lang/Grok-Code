# Railway Database Setup

## Quick Setup Steps

1. **Go to Railway**: https://railway.app
2. **Sign in** with GitHub (easiest)
3. **Create New Project** → "Empty Project"
4. **Add Database** → Click "+ New" → "Database" → "Add PostgreSQL"
5. **Get Connection String**:
   - Click on the PostgreSQL service
   - Go to "Variables" tab
   - Copy `DATABASE_URL` or `POSTGRES_URL`
   - Format: `postgresql://postgres:[PASSWORD]@[HOST]:[PORT]/railway`

## Railway Connection String Format

Railway provides the connection string automatically. It looks like:
```
postgresql://postgres:password@containers-us-west-xxx.railway.app:5432/railway
```

## After Getting Connection String

Once you have the Railway connection string, I'll:
1. Add it to `.env.local`
2. Run Prisma migrations
3. Generate Prisma client
4. Test the connection

## Railway Benefits

✅ Free tier available
✅ Easy PostgreSQL setup
✅ Automatic backups
✅ Simple connection management
✅ Great for deployment
