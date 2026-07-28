package main

import (
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
	if err := configs.LoadEnv(); err != nil {
		log.Fatalf("Error loading environment variables: %v\n", err)
	}

	providerTimeout, err := configs.GetExternalAPITimeout()
	if err != nil {
		log.Fatalf("Invalid provider HTTP timeout: %v", err)
	}

	utils.Init()

	database, err := db.InitDB()
	if err != nil {
		log.Fatalf("Failed to initialize database: %v", err)
	}
	defer database.Close()

	providerHTTPClient := &http.Client{Timeout: providerTimeout}
	githubProvider := auth.NewGitHubClient(auth.NewOAuthConfig(), providerHTTPClient, providerTimeout)
	codeforcesProvider := users.NewCodeforcesClient(providerHTTPClient, providerTimeout)

	userRepository := users.NewRepository(database)
	userAPI := users.NewAPI(userRepository, users.NewVerificationTokenStore(), codeforcesProvider)
	authHandler := auth.NewAuthHandler(githubProvider, userRepository)
	listAPI := lists.NewAPI(lists.NewRepository(database), items.NewRepository(database))

	router := gin.Default()

	corsConfig := cors.DefaultConfig()
	corsConfig.AllowOrigins = []string{"http://localhost:5173"}
	corsConfig.AddAllowHeaders("Content-Type", "Authorization")
	corsConfig.AllowCredentials = true
	router.Use(cors.New(corsConfig))

	routes.RegisterRoutes(router, routes.Dependencies{
		Auth:  authHandler,
		Users: userAPI,
		Lists: listAPI,
	})

	if err := router.Run(":8080"); err != nil {
		log.Fatalf("Failed to run server: %v", err)
	}
}
