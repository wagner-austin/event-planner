.PHONY: lint test check start stop clean install lock serve web-check

POETRY ?= poetry

lock:
	$(POETRY) lock

install:
	$(POETRY) install --no-interaction --no-ansi

lint: lock install
	$(POETRY) run ruff check --fix .
	$(POETRY) run mypy --strict src tools tests
	$(POETRY) run yamllint -c .yamllint.yml .
	$(POETRY) run python -m tools.guard
	$(POETRY) run python -m tools.web_guard

test:
	$(POETRY) install --no-interaction --no-ansi
	$(POETRY) run pytest --cov=ics_connect --cov-report=term-missing

check: lint test web-check

start:
	docker compose up -d --build

stop:
	docker compose stop

clean:
	docker compose down -v --rmi local --remove-orphans || true
	docker compose build --no-cache || true

serve:
	@echo "Building frontend (TypeScript -> assets/js)"
	@powershell -NoProfile -Command "Set-Location web; if (Test-Path package.json) { npm run -s build } else { Write-Output 'web/package.json not found; skipping build' }"
	@echo "Starting local server on http://localhost:8080"
	@echo "Press Ctrl+C to stop"
	@python tools/serve.py

web-check:
	@echo "TS: running type/lint/tests if npm is present..."
	@powershell -NoProfile -File tools/web_check.ps1
