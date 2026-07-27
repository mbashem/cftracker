package users

import (
	"github.com/gin-gonic/gin"
	"github.com/mbashem/cftracker/backend/internal/middlewares"
)

func RegisterRoutes(server *gin.Engine, api *API) {
	userServer := server.Group("/api/user")
	userServer.Use(middlewares.Authenticate)
	userServer.GET("/profile", api.GetProfile)
	userServer.PUT("/cfhandle", api.UpdateCFHandle)
	userServer.GET("/cfverification-token", api.GetCFVerificationToken)
	userServer.GET("/verify-cftoken", api.VerifyCFVerificationToken)
}
