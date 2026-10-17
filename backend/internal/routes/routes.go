package routes

import (
	"github.com/gin-gonic/gin"
	"github.com/mbashem/cftracker/backend/internal/auth"
	"github.com/mbashem/cftracker/backend/internal/health"
	"github.com/mbashem/cftracker/backend/internal/lists"
	"github.com/mbashem/cftracker/backend/internal/middlewares"
	"github.com/mbashem/cftracker/backend/internal/ratelimit"
	"github.com/mbashem/cftracker/backend/internal/users"
)

type Dependencies struct {
	Health     *health.API
	Auth       *auth.AuthHandler
	Users      *users.API
	Lists      *lists.API
	RateLimits *ratelimit.Service
}

func RegisterRoutes(server *gin.Engine, dependencies Dependencies) {
	server.Use(middlewares.LimitRequestBody)
	health.RegisterRoutes(server, dependencies.Health)
	authentication := server.Group("")
	protected := server.Group("/api", middlewares.Authenticate)
	if dependencies.RateLimits != nil {
		authentication.Use(middlewares.LimitAuthentication(dependencies.RateLimits))
		protected.Use(middlewares.LimitUser(dependencies.RateLimits))
	}
	auth.RegisterRoutes(authentication, dependencies.Auth)
	users.RegisterRoutes(protected, dependencies.Users)
	lists.RegisterRoutes(protected, dependencies.Lists)
}
