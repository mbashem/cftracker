package routes

import (
	"github.com/gin-gonic/gin"
	"github.com/mbashem/cftracker/backend/internal/auth"
	"github.com/mbashem/cftracker/backend/internal/lists"
	"github.com/mbashem/cftracker/backend/internal/users"
)

func RegisterRoutes(server *gin.Engine) {
	auth.RegisterRoutes(server)
	users.RegisterRoutes(server)
	lists.RegisterRoutes(server)
}
