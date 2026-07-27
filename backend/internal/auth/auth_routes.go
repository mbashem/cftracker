package auth

import "github.com/gin-gonic/gin"

func RegisterRoutes(server *gin.Engine, handler *AuthHandler) {
	server.GET("/auth/github/login", handler.GitHubLogin)
	server.GET("/auth/github/callback", handler.GitHubCallback)
	server.GET("/api/auth/github/callback", handler.GitHubCallback)
}
