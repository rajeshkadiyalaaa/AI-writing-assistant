# Scribe / AI Writing Assistant — production image for Render (Node API + React SPA + Python scripts).
# https://render.com/docs/docker

# syntax=docker/dockerfile:1
FROM node:20-bookworm

RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 \
    python3-venv \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Python deps (OpenRouter scripts, NLTK, …)
COPY requirements.txt ./
RUN python3 -m venv /opt/py \
    && /opt/py/bin/pip install --upgrade pip \
    && /opt/py/bin/pip install --no-cache-dir -r requirements.txt

ENV PYTHON_PATH=/opt/py/bin/python
ENV NLTK_DATA=/app/nltk_data

# Backend (Express)
COPY backend/package.json backend/package-lock.json ./backend/
RUN cd backend && npm ci --omit=dev

# Frontend (CRA build)
COPY frontend/package.json frontend/package-lock.json ./frontend/
RUN cd frontend && npm ci

# App source
COPY . .

# NLTK corpora (used by utils.py when available)
RUN /opt/py/bin/python backend/scripts/setup_nltk.py

# Production React bundle (same origin as API — no REACT_APP_API_URL needed)
RUN cd frontend && npm run build

ENV NODE_ENV=production

# Render sets PORT at runtime
CMD ["node", "backend/server.js"]
