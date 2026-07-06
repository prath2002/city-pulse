# ---- builder ----
FROM python:3.11-slim AS builder
WORKDIR /build
COPY backend/pyproject.toml backend/README.md ./
COPY backend/app ./app
RUN pip install --no-cache-dir --prefix=/install .

# ---- runtime ----
FROM python:3.11-slim
RUN useradd --create-home --uid 1000 citypulse
WORKDIR /app
COPY --from=builder /install /usr/local
COPY backend/app ./app
COPY backend/alembic ./alembic
USER citypulse
EXPOSE 8000
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD python -c "import urllib.request;urllib.request.urlopen('http://localhost:8000/v1/health')" || exit 1
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
