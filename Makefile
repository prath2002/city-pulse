.PHONY: dev dev-down test test-backend test-frontend lint lint-backend lint-frontend build

UV ?= uv

dev:
	docker compose up --build

dev-down:
	docker compose down

test: test-backend test-frontend

test-backend:
	cd backend && $(UV) run pytest tests/ -v

test-frontend:
	cd frontend && npm run test

lint: lint-backend lint-frontend

lint-backend:
	cd backend && $(UV) run ruff check app tests && $(UV) run black --check app tests

lint-frontend:
	cd frontend && npm run lint && npm run format

build:
	docker build -f backend/Dockerfile -t citypulse-backend .
	docker build -f frontend/Dockerfile -t citypulse-frontend .
