FROM python:3.10-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    libglib2.0-0 \
    libgl1 \
    libgomp1 \
    && rm -rf /var/lib/apt/lists/*

COPY requirements-server.txt requirements-service.txt ./

RUN python -m pip install --upgrade pip setuptools wheel \
    && python -m pip install -r requirements-server.txt -r requirements-service.txt

COPY . .

RUN mkdir -p /app/output /app/input /app/.torch_cache /tmp/Ultralytics

ENV TORCH_HOME=/app/.torch_cache \
    YOLO_CONFIG_DIR=/tmp/Ultralytics \
    INTERNAL_API_URL=http://api:5000/api/potholes

EXPOSE 8000

CMD ["uvicorn", "ai_service:app", "--host", "0.0.0.0", "--port", "8000"]
