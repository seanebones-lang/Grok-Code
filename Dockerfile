FROM node:22-slim

# Install Python 3.12 and pip
RUN apt-get update && apt-get install -y python3.12 python3-pip python3.12-venv && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY requirements.txt ./

# Install Node.js dependencies
RUN npm ci

# Install Python dependencies
RUN pip3 install --no-cache-dir -r requirements.txt && pip3 cache purge

# Copy application code
COPY . .

# Build Next.js app
RUN npm run build

# Smoke test Python tools
RUN python3 -c "import ccxt, chess, pandas, openai, yfinance, ta; print('✅ All Python tools OK')"

# Start Next.js server
CMD ["npm", "start"]