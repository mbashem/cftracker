package main

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"log"
	"os"
	"time"

	_ "github.com/lib/pq"
)

func main() {
	if len(os.Args) != 2 {
		log.Fatal("usage: migration-target <table>")
	}

	databaseURL := os.Getenv("MIGRATION_DATABASE_URL")
	if databaseURL == "" {
		databaseURL = os.Getenv("DATABASE_URL")
	}
	if databaseURL == "" {
		log.Fatal("DATABASE_URL or MIGRATION_DATABASE_URL is required")
	}

	database, err := sql.Open("postgres", databaseURL)
	if err != nil {
		log.Fatalf("open database: %v", err)
	}
	defer database.Close()

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	var targetVersion int
	err = database.QueryRowContext(ctx, `
		SELECT rollback_version
		FROM migration_meta.table_migrations
		WHERE table_name = $1
	`, os.Args[1]).Scan(&targetVersion)
	if errors.Is(err, sql.ErrNoRows) {
		log.Fatalf("table %q is not registered in migration metadata", os.Args[1])
	}
	if err != nil {
		log.Fatalf("resolve rollback version for table %q: %v", os.Args[1], err)
	}

	fmt.Println(targetVersion)
}
