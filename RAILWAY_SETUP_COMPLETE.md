# Railway Database Setup

## Current Status

✅ **Railway Project Linked**
- Project ID: `080b0df0-f6c7-44c6-861f-c85c8256905b`
- Project Name: `uiclone-backend`
- Token: Configured

⚠️ **PostgreSQL Database**: Not created yet

## Quick Setup Steps

### Step 1: Create PostgreSQL Database

**Via Railway Dashboard:**
1. Open: https://railway.app/project/080b0df0-f6c7-44c6-861f-c85c8256905b
2. Click **"+ New"** button
3. Select **"Database"** → **"Add PostgreSQL"**
4. Wait ~30 seconds for provisioning
5. Click on the **PostgreSQL** service card
6. Go to **"Variables"** tab
7. Find **`DATABASE_URL`** or **`POSTGRES_URL`**
8. Copy the connection string

**The connection string will look like:**
```
postgresql://postgres:password@containers-us-west-xxx.railway.app:5432/railway
```

### Step 2: Configure Application

Once you have the Railway `DATABASE_URL`, I'll:
1. Update `.env.local` with Railway database URL
2. Run migrations on Railway database
3. Test the connection
4. Update Prisma configuration

### Step 3: Share Connection String

Paste the Railway `DATABASE_URL` here and I'll complete the setup!

## Alternative: Use Railway CLI

If you prefer CLI:
```bash
export RAILWAY_TOKEN=a5a4fc54-13b0-4467-b90e-c1512ab9c7fc
railway link --project 080b0df0-f6c7-44c6-861f-c85c8256905b
railway add --database postgres
railway variables
```

## Current Local Setup

Your app is currently using a **local PostgreSQL database**:
- Database: `grokcode`
- Connection: `postgresql://nexteleven@localhost:5432/grokcode`
- Status: ✅ Working perfectly

You can continue developing locally, and migrate to Railway when ready!
