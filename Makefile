.PHONY: lint test check start stop clean install lock serve

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

test:
	$(POETRY) install --no-interaction --no-ansi
	$(POETRY) run pytest --cov=ics_connect --cov-report=term-missing --cov-report=xml

check: lint test

start:
	docker compose up -d --build

stop:
	docker compose stop

clean:
	docker compose down -v --rmi local --remove-orphans || true
	docker compose build --no-cache || true

serve:
	@echo "Opening test-frontend.html in browser..."
	@python -c "import webbrowser; webbrowser.open('test-frontend.html')"
	@echo ""
	@echo "Starting local server on http://localhost:8080"
	@echo "Press Ctrl+C to stop"
	@python -m http.server 8080
