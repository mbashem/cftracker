package lists

import (
	"github.com/gin-gonic/gin"
	"github.com/mbashem/cftracker/backend/internal/middlewares"
)

func RegisterRoutes(server *gin.Engine) {
	// server.GET("/user/:id", getUserByID)
	listServer := server.Group("/lists")
	listServer.Use(middlewares.Authenticate)
	listServer.POST("/") // create list
	listServer.DELETE("/:listID") // delete list
	listServer.PUT("/:listID/item") // add to list
	listServer.DELETE("/:listID/item/:problemID") // remove from list
	// reorder problems
	listServer.GET("/:listID/item/reorder-problems")
}
