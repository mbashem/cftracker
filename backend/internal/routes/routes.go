package routes

import (
	"github.com/gin-gonic/gin"
	"github.com/mbashem/cftracker/backend/internal/auth"
	"github.com/mbashem/cftracker/backend/internal/lists"
	"github.com/mbashem/cftracker/backend/internal/users"
)

type Dependencies struct {
	Auth  *auth.AuthHandler
	Users *users.API
	Lists *lists.API
}

func RegisterRoutes(server *gin.Engine, dependencies Dependencies) {
	auth.RegisterRoutes(server, dependencies.Auth)
	users.RegisterRoutes(server, dependencies.Users)
	lists.RegisterRoutes(server, dependencies.Lists)
}
