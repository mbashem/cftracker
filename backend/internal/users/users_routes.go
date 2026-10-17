package users

import "github.com/gin-gonic/gin"

// RegisterRoutes receives the authenticated /api group from the central registrar.
func RegisterRoutes(server gin.IRouter, api *API) {
	userServer := server.Group("/user")
	userServer.GET("/profile", api.GetProfile)
	userServer.PUT("/cfhandle", api.UpdateCFHandle)
	userServer.GET("/cfverification-token", api.GetCFVerificationToken)
	userServer.GET("/verify-cftoken", api.VerifyCFVerificationToken)
}
