FROM python:3.12-slim

WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt && pip cache purge

# Smoke test
RUN python -c "import ccxt, chess, pandas, openai, yfinance, ta; print('✅ All tools OK')"

CMD ["bash"]