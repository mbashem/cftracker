package health

import "github.com/gin-gonic/gin"

func RegisterRoutes(server *gin.Engine, api *API) {
	healthServer := server.Group("/health")
	healthServer.GET("/live", api.Live)
	healthServer.GET("/ready", api.Ready)
}
