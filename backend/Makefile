MIGRATE_VERSION ?= v4.17.1
MIGRATE := go run -tags postgres github.com/golang-migrate/migrate/v4/cmd/migrate@$(MIGRATE_VERSION)
MIGRATION_TARGET := go run ./cmd/migration-target
MIGRATION_CHECK := go run ./cmd/migration-check
MIGRATIONS_DIR ?= migrations
MIGRATION_DATABASE_URL ?= $(DATABASE_URL)
SCHEMA_REFERENCE_DATABASE_URL ?= $(reference_database_url)
MIGRATION_NAME ?= $(name)
MIGRATION_DIRECTION ?= $(direction)
MIGRATION_STEPS ?= $(steps)
MIGRATION_TABLE ?= $(table)
TEST_DATABASE_URL ?=
COVERAGE_FILE ?= ../coverage/backend.out

ifneq (,$(wildcard .env))
include .env
export
endif

export MIGRATION_DATABASE_URL MIGRATION_NAME MIGRATION_DIRECTION MIGRATION_STEPS MIGRATION_TABLE SCHEMA_REFERENCE_DATABASE_URL TEST_DATABASE_URL

.PHONY: build clean run test test-unit test-integration test-race test-cover test-all watch migrate migrate-up migrate-down migrate-version migrate-create migrate-check migrate-check-schema check-database-url check-test-database-url check-reference-database-url check-pg-dump check-migration-name check-migration-direction check-migration-steps

build:
	@echo "Building..."
	@go build -o tmp/main cmd/api/main.go

# Clean the binary
clean:
	@echo "Cleaning..."
	@rm -f tmp/build

run:
	@go run cmd/api/main.go

test:
	@$(MAKE) test-unit

test-unit:
	@echo "Running unit tests..."
	@go test ./...

test-integration: check-test-database-url
	@echo "Running integration tests..."
	@go test -p 1 -count=1 -tags=integration ./...

test-race:
	@echo "Running race detector..."
	@go test -race ./...

test-cover:
	@echo "Running coverage..."
	@mkdir -p "$(dir $(COVERAGE_FILE))"
	@go test -coverprofile="$(COVERAGE_FILE)" ./...
	@go tool cover -func="$(COVERAGE_FILE)"

test-all:
	@$(MAKE) test-unit
	@$(MAKE) test-race
	@go vet ./...
	@$(MAKE) test-integration

check-database-url:
	@if [ -z "$$MIGRATION_DATABASE_URL" ]; then \
		echo "DATABASE_URL or MIGRATION_DATABASE_URL is required"; \
		exit 1; \
	fi

check-test-database-url:
	@if [ -z "$$TEST_DATABASE_URL" ]; then \
		echo "TEST_DATABASE_URL is required for integration tests"; \
		exit 1; \
	fi

check-reference-database-url:
	@if [ -z "$$SCHEMA_REFERENCE_DATABASE_URL" ]; then \
		echo "A clean reference database is required. Usage: make migrate-check-schema reference_database_url=postgres://..."; \
		exit 1; \
	fi; \
	if [ "$$MIGRATION_DATABASE_URL" = "$$SCHEMA_REFERENCE_DATABASE_URL" ]; then \
		echo "The reference database must be different from the target database"; \
		exit 1; \
	fi

check-pg-dump:
	@if ! command -v pg_dump >/dev/null 2>&1; then \
		echo "pg_dump is required and must be available on PATH"; \
		exit 1; \
	fi

check-migration-name:
	@if [ -z "$$MIGRATION_NAME" ]; then \
		echo "Migration name is required. Usage: make migrate-create name=add_feature"; \
		exit 1; \
	fi

check-migration-direction:
	@case "$$MIGRATION_DIRECTION" in \
		up|down) ;; \
		*) echo "Direction must be 'up' or 'down'. Usage: make migrate direction=down steps=1"; exit 1 ;; \
	esac

check-migration-steps:
	@case "$$MIGRATION_STEPS" in \
		''|*[!0-9]*|0) echo "Steps must be a positive integer. Usage: make migrate direction=down steps=1"; exit 1 ;; \
		*) ;; \
	esac

migrate: check-database-url check-migration-direction check-migration-steps migrate-check
	@$(MIGRATE) -path "$(MIGRATIONS_DIR)" -database "$$MIGRATION_DATABASE_URL" "$$MIGRATION_DIRECTION" "$$MIGRATION_STEPS"
	@$(MIGRATION_CHECK) -path "$(MIGRATIONS_DIR)" -database "$$MIGRATION_DATABASE_URL" -sync

migrate-up: check-database-url
	@$(MIGRATION_CHECK) -path "$(MIGRATIONS_DIR)" -database "$$MIGRATION_DATABASE_URL"
	@$(MIGRATE) -path "$(MIGRATIONS_DIR)" -database "$$MIGRATION_DATABASE_URL" up
	@$(MIGRATION_CHECK) -path "$(MIGRATIONS_DIR)" -database "$$MIGRATION_DATABASE_URL" -sync

migrate-check: check-database-url
	@$(MIGRATION_CHECK) -path "$(MIGRATIONS_DIR)" -database "$$MIGRATION_DATABASE_URL"

migrate-check-schema: check-database-url check-reference-database-url check-pg-dump
	@$(MIGRATE) -path "$(MIGRATIONS_DIR)" -database "$$SCHEMA_REFERENCE_DATABASE_URL" up
	@$(MIGRATION_CHECK) -path "$(MIGRATIONS_DIR)" -database "$$SCHEMA_REFERENCE_DATABASE_URL" -sync
	@./scripts/check-schema-drift.sh "$$MIGRATION_DATABASE_URL" "$$SCHEMA_REFERENCE_DATABASE_URL"

# A table rollback target is resolved from migration metadata stored in PostgreSQL.
migrate-down: check-database-url migrate-check
	@if [ -z "$$MIGRATION_TABLE" ]; then \
		$(MIGRATE) -path "$(MIGRATIONS_DIR)" -database "$$MIGRATION_DATABASE_URL" down -all; \
		$(MIGRATION_CHECK) -path "$(MIGRATIONS_DIR)" -database "$$MIGRATION_DATABASE_URL" -sync; \
		exit 0; \
	fi; \
	target="$$($(MIGRATION_TARGET) "$$MIGRATION_TABLE")" || exit $$?; \
	current="$$($(MIGRATE) -path "$(MIGRATIONS_DIR)" -database "$$MIGRATION_DATABASE_URL" version 2>&1)"; \
	status=$$?; \
	if [ "$$status" -ne 0 ]; then \
		case "$$current" in \
			*"no migration"*) echo "no change"; exit 0 ;; \
			*) echo "$$current"; exit "$$status" ;; \
		esac; \
	fi; \
	case "$$current" in *dirty*) echo "Database is dirty; resolve it before rolling back"; exit 1 ;; esac; \
	current="$${current%% *}"; \
	if [ "$$current" -le "$$target" ]; then \
		echo "no change"; \
	elif [ "$$target" -eq 0 ]; then \
		$(MIGRATE) -path "$(MIGRATIONS_DIR)" -database "$$MIGRATION_DATABASE_URL" down -all; \
	else \
		$(MIGRATE) -path "$(MIGRATIONS_DIR)" -database "$$MIGRATION_DATABASE_URL" goto "$$target"; \
	fi; \
	$(MIGRATION_CHECK) -path "$(MIGRATIONS_DIR)" -database "$$MIGRATION_DATABASE_URL" -sync

migrate-version: check-database-url
	@$(MIGRATE) -path "$(MIGRATIONS_DIR)" -database "$$MIGRATION_DATABASE_URL" version

migrate-create: check-migration-name
	@$(MIGRATE) create -ext sql -dir "$(MIGRATIONS_DIR)" -seq "$$MIGRATION_NAME"

watch:
	@if command -v air > /dev/null; then \
            air; \
            echo "Watching...";\
        else \
            read -p "Go's 'air' is not installed on your machine. Do you want to install it? [Y/n] " choice; \
            if [ "$$choice" != "n" ] && [ "$$choice" != "N" ]; then \
                go install github.com/air-verse/air@latest; \
                air; \
                echo "Watching...";\
            else \
                echo "You chose not to install air. Exiting..."; \
                exit 1; \
            fi; \
        fi
