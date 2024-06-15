package lists

import (
	"github.com/gin-gonic/gin"
	"github.com/mbashem/cftracker/backend/internal/middlewares"
)

func RegisterRoutes(server *gin.Engine) {
	listServer := server.Group("/api/lists")
	listServer.Use(middlewares.Authenticate)
	listServer.GET("/", getAllLists)                          // get all lists
	listServer.POST("/", createListHandler)                   // create list
	listServer.GET("/:listID", getListHandler)                // get list (with items)
	listServer.PUT("/:listID", updateListNameHandler)         // update list name
	listServer.DELETE("/:listID", deleteListHandler)          // delete list
	listServer.PUT("/:listID/item", addToListHandler)         // add to list
	listServer.DELETE("/:listID/item", deleteFromListHandler) // remove from list
	// reorder problems
	// listServer.GET("/:listID/item/reorder-problems")
}
