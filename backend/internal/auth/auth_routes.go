package auth

import "github.com/gin-gonic/gin"

func RegisterRoutes(server *gin.Engine) {
	authConfig := NewOAuthConfig()
	authHandler := NewAuthHandler(authConfig)

	server.GET("/auth/github/login", authHandler.GitHubLogin)
	server.GET("/auth/github/callback", authHandler.GitHubCallback)
}
