package auth

import "github.com/gin-gonic/gin"

func RegisterRoutes(server gin.IRouter, handler *AuthHandler) {
	server.GET("/v1/auth/github/login", handler.GitHubLogin)
	server.GET("/v1/auth/github/callback", handler.GitHubCallback)
	server.GET("/api/v1/auth/github/login", handler.GitHubLogin)
	server.GET("/api/v1/auth/github/callback", handler.GitHubCallback)
}
