package db

import (
	"context"
	"database/sql"
	"fmt"
	"time"

	_ "github.com/lib/pq"
	"github.com/mbashem/cftracker/backend/configs"
)

var DB *sql.DB

func InitDB() error {
	database, err := sql.Open("postgres", configs.GetEnv(configs.DATABASE_URL))
	if err != nil {
		return fmt.Errorf("open database: %w", err)
	}

	database.SetMaxOpenConns(10)
	database.SetMaxIdleConns(5)

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	if err := database.PingContext(ctx); err != nil {
		database.Close()
		return fmt.Errorf("ping database: %w", err)
	}

	DB = database
	return nil
}
