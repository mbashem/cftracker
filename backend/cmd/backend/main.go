package main

import (
	"log"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	"github.com/mbashem/cftracker/backend/configs"
	"github.com/mbashem/cftracker/backend/internal/db"
	"github.com/mbashem/cftracker/backend/internal/routes"
	"github.com/mbashem/cftracker/backend/internal/utils"
)

func main() {
	if err := configs.LoadEnv(); err != nil {
		log.Fatalf("Error loading environment variables: %v", err)
	}

	utils.Init()

	db.InitDB()

	router := gin.Default()

	corsConfig := cors.DefaultConfig()
	corsConfig.AllowOrigins = []string{"http://localhost:5173"}
	corsConfig.AddAllowHeaders("Content-Type", "Authorization")
	corsConfig.AllowCredentials = true
	router.Use(cors.New(corsConfig))

	routes.RegisterRoutes(router)

	if err := router.Run("localhost:8080"); err != nil {
		log.Fatalf("Failed to run server: %v", err)
	}
}
