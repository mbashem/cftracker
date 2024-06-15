package users

import (
	"github.com/gin-gonic/gin"
	"github.com/mbashem/cftracker/backend/internal/middlewares"
)

func RegisterRoutes(server *gin.Engine) {
	// server.GET("/user/:id", getUserByID)
	userServer := server.Group("/api/user")
	userServer.Use(middlewares.Authenticate)
	userServer.GET("/profile", getProfileHandler)
	userServer.PUT("/cfhandle", UpdateCFHandleHandler)
	userServer.GET("/cfverification-token", getCFVerificationTokenHandler)
	userServer.GET("/verify-cftoken", verifyCFVerificationTokenHandler)
}
