# ---------- Stage 1: Build ----------
    FROM python:3.11-slim as builder

    WORKDIR /app
    
    # Install build dependencies
    RUN apt-get update && apt-get install -y --no-install-recommends \
        build-essential \
        gcc \
        && rm -rf /var/lib/apt/lists/*
    
    # Install Python dependencies
    COPY requirements.txt .
    RUN pip install --upgrade pip \
        && pip install --prefix=/install -r requirements.txt
    
    # ---------- Stage 2: Production ----------
    FROM python:3.11-slim
    
    WORKDIR /app
    
    # Copy only the installed packages from the builder
    COPY --from=builder /install /usr/local
    ENV PYTHONUNBUFFERED=1
    COPY . .
    
    EXPOSE 3001
    
    # Command to run the Flask app via Gunicorn
    CMD ["gunicorn", "-w", "4", "-b", "0.0.0.0:3001", "app.main:app"]