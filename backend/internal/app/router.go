// Package app assembles the API's dependencies and HTTP middleware.
package app

import (
	"database/sql"
	"fmt"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	"github.com/mbashem/cftracker/backend/configs"
	"github.com/mbashem/cftracker/backend/internal/middlewares"
	"github.com/mbashem/cftracker/backend/internal/routes"
)

// NewRouter assembles request handling from validated configuration and an open
// database. The caller retains ownership of the database and server lifecycle.
func NewRouter(config configs.Config, database *sql.DB) (*gin.Engine, error) {
	dependencies, err := newDependencies(config, database)
	if err != nil {
		return nil, err
	}

	router := gin.New()
	router.Use(middlewares.RequestLogger(gin.DefaultWriter), middlewares.Recovery(gin.DefaultErrorWriter))
	if err := router.SetTrustedProxies(config.TrustedProxies); err != nil {
		return nil, fmt.Errorf("invalid trusted proxies: %w", err)
	}
	router.Use(cors.New(newCORSConfig(config)))
	routes.RegisterRoutes(router, dependencies)
	return router, nil
}

func newCORSConfig(config configs.Config) cors.Config {
	corsConfig := cors.DefaultConfig()
	corsConfig.AllowOrigins = config.CORSAllowedOrigins
	corsConfig.AddAllowHeaders("Content-Type", "Authorization")
	corsConfig.ExposeHeaders = []string{"Retry-After"}
	corsConfig.AllowCredentials = true
	return corsConfig
}
