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
	@echo "Testing..."
	@go test ./... -v

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