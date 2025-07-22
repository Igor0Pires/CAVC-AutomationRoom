FROM mcr.microsoft.com/playwright/python:v1.53.0-noble
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
EXPOSE 8000
CMD ["uvicorn", "app.test_scraping_fea:app", "--host", "0.0.0.0", "--port", "8000"]