FROM mcr.microsoft.com/playwright/python:v1.53.0-noble
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
RUN playwright install chromium
RUN ls -la /root/.cache/ms-playwright/ || ls -la /opt/render/.cache/ms-playwright/ || echo "Playwright cache directory not found in common locations."

ENV PLAYWRIGHT_BROWSERS_PATH="/opt/render/.cache/ms-playwright/"

COPY . .
CMD ["uvicorn", "app.test_scraping_fea:app", "--host", "0.0.0.0", "--port", "$PORT"]