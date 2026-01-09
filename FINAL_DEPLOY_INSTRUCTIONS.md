# Final Deployment Instructions

## The Issue
Railway API token doesn't have permissions to create services or set variables programmatically.

## Solution: Use Railway Dashboard (One-Time Setup)

### Step 1: Connect GitHub Repo to Railway
1. Open your Railway project dashboard
2. Find "+ New" button (usually top right or main area)
3. Click it, select "GitHub Repo"
4. Select your repository
5. Railway will auto-create service and start deploying

### Step 2: Add Environment Variables
Once service is created:
1. Click on the service name
2. Go to "Variables" tab
3. Click "New Variable" for each:

**Variable 1:**
- Name: GROK_API_KEY
- Value: (your xAI API key from x.ai)

**Variable 2:**
- Name: GITHUB_ID  
- Value: (your GitHub OAuth App Client ID)

**Variable 3:**
- Name: GITHUB_SECRET
- Value: (your GitHub OAuth App Client Secret)

**Variable 4:**
- Name: NEXTAUTH_SECRET
- Value: (generate with: openssl rand -hex 32)

**Variable 5:**
- Name: DATABASE_URL
- Value: (your PostgreSQL connection string)

### Step 3: Link PostgreSQL
1. In service settings, find "Connect" or "Add Resource"
2. Select your PostgreSQL service
3. Railway auto-sets DATABASE_URL (you can skip Variable 5 above if it auto-sets)

### Step 4: Generate Domain
1. Go to service "Settings" → "Networking"
2. Click "Generate Domain"
3. Copy the domain
4. Add variable: NEXTAUTH_URL = https://your-domain.railway.app

## Alternative: Once Service Exists

If service is already created, run:
```bash
cd '/Users/nexteleven/Desktop/Grok Code/Grok-Code'
export RAILWAY_TOKEN=your_railway_token
railway link --project your_project_id
railway service  # Select your service
railway variables --set "GROK_API_KEY=your_grok_api_key"
railway variables --set "GITHUB_ID=your_github_oauth_client_id"
railway variables --set "GITHUB_SECRET=your_github_oauth_client_secret"
railway variables --set "NEXTAUTH_SECRET=your_nextauth_secret"
railway variables --set "DATABASE_URL=your_database_url"
```
