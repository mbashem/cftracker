package users

import (
	"github.com/gin-gonic/gin"
	"github.com/mbashem/cftracker/backend/internal/middlewares"
)

func RegisterRoutes(server *gin.Engine) {
	// server.GET("/user/:id", getUserByID)
	userServer := server.Group("/user")
	userServer.Use(middlewares.Authenticate)
	userServer.GET("/profile", getProfile)
	userServer.PUT("/cfhandle", UpdateCFHandle)

}
