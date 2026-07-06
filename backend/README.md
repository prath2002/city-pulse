# CityPulse Backend

FastAPI application serving the CityPulse REST API (`/v1`), WebSocket dashboard
feed, and (from Phase 6) the in-process agent layer.

```bash
# from repo root
make dev          # full stack via docker compose
# or standalone:
cd backend && uv venv && uv pip install -e '.[dev]' && uv run uvicorn app.main:app --reload
```

API contract: `documents/09_API_Specification.md`. Task tracker: `documents/PROJECT_TASK_LIST.md`.
