package main

import (
	"context"
	"fmt"
	"log"
	"os"
	"os/signal"
	"syscall"

	"github.com/mbashem/cftracker/backend/configs"
	"github.com/mbashem/cftracker/backend/internal/app"
	"github.com/mbashem/cftracker/backend/internal/db"
	"github.com/mbashem/cftracker/backend/internal/server"
	"github.com/mbashem/cftracker/backend/internal/utils"
)

func main() {
	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	err := run(ctx)
	stop()
	if err != nil {
		log.Printf("API stopped: %v", err)
		os.Exit(1)
	}
}

func run(ctx context.Context) error {
	config, err := configs.Load()
	if err != nil {
		return fmt.Errorf("invalid configuration: %w", err)
	}

	utils.Init(config.JWTSecret)

	database, err := db.InitDB(config.DatabaseURL)
	if err != nil {
		return fmt.Errorf("initialize database: %w", err)
	}
	defer database.Close()

	router, err := app.NewRouter(config, database)
	if err != nil {
		return err
	}

	httpServer := server.New(fmt.Sprintf(":%d", config.Port), router, config.HTTPServer)
	return server.ListenAndServe(ctx, httpServer, config.HTTPServer.ShutdownTimeout)
}
