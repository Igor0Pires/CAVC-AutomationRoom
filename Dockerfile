FROM mcr.microsoft.com/playwright/python:v1.53.0-noble
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
RUN playwright install chromium
COPY . .
CMD ["uvicorn", "app.test_scraping_fea:app", "--host", "0.0.0.0", "--port", "$PORT"]