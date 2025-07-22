FROM mcr.microsoft.com/playwright/python:v1.50.0-noble
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
RUN apt-get update && apt-get install -y \
    libnss3 \
    libxss1 \
    libasound2 \
    libgtk-3-0 \
    libnspr4 \
    libcups2 \
    libgbm1 \
    libatk-bridge2.0-0 \
    libxdamage1 \
    libdrm-dev \
    libgdk-pixbuf2.0-0 \
    libglib2.0-0 \
    libjpeg-dev \
    libpng-dev \
    libwebp-dev \
    libtiff-dev \
    libxml2-dev \
    libxslt1-dev \
    libffi-dev \
    libpango-1.0-0 \
    libcairo2 \
    libharfbuzz0b \
    --no-install-recommends && rm -rf /var/lib/apt/lists/*

RUN playwright install chromium
RUN playwright install-deps chromium


ENV PLAYWRIGHT_BROWSERS_PATH=/ms-playwright

COPY . .
EXPOSE 8000
CMD ["uvicorn", "app.test_scraping_fea:app", "--host", "0.0.0.0", "--port", "8000"]

