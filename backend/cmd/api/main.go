package main

import (
	"fmt"
	"log"
	"net/http"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	"github.com/mbashem/cftracker/backend/configs"
	"github.com/mbashem/cftracker/backend/internal/auth"
	"github.com/mbashem/cftracker/backend/internal/db"
	"github.com/mbashem/cftracker/backend/internal/lists"
	"github.com/mbashem/cftracker/backend/internal/lists/items"
	"github.com/mbashem/cftracker/backend/internal/routes"
	"github.com/mbashem/cftracker/backend/internal/users"
	"github.com/mbashem/cftracker/backend/internal/utils"
)

func main() {
	config, err := configs.Load()
	if err != nil {
		log.Fatalf("Invalid configuration: %v", err)
	}

	utils.Init(config.JWTSecret)

	database, err := db.InitDB(config.DatabaseURL)
	if err != nil {
		log.Fatalf("Failed to initialize database: %v", err)
	}
	defer database.Close()

	providerHTTPClient := &http.Client{Timeout: config.ExternalAPITimeout}
	githubProvider := auth.NewGitHubClient(
		auth.NewOAuthConfig(config.GitHubClientID, config.GitHubClientSecret, config.GitHubRedirectURL),
		providerHTTPClient,
		config.ExternalAPITimeout,
	)
	codeforcesProvider := users.NewCodeforcesClient(providerHTTPClient, config.ExternalAPITimeout)

	userRepository := users.NewRepository(database)
	userAPI := users.NewAPI(userRepository, users.NewVerificationTokenStore(), codeforcesProvider)
	authHandler := auth.NewAuthHandler(githubProvider, userRepository)
	listAPI := lists.NewAPI(lists.NewRepository(database), items.NewRepository(database))

	router := gin.Default()

	corsConfig := cors.DefaultConfig()
	corsConfig.AllowOrigins = config.CORSAllowedOrigins
	corsConfig.AddAllowHeaders("Content-Type", "Authorization")
	corsConfig.AllowCredentials = true
	router.Use(cors.New(corsConfig))

	routes.RegisterRoutes(router, routes.Dependencies{
		Auth:  authHandler,
		Users: userAPI,
		Lists: listAPI,
	})

	if err := router.Run(fmt.Sprintf(":%d", config.Port)); err != nil {
		log.Fatalf("Failed to run server: %v", err)
	}
}
