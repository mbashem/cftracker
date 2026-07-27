package lists

import (
	"github.com/gin-gonic/gin"
	"github.com/mbashem/cftracker/backend/internal/middlewares"
)

func RegisterRoutes(server *gin.Engine, api *API) {
	listServer := server.Group("/api/lists")
	listServer.Use(middlewares.Authenticate)

	listServer.GET("", api.GetAllLists)                                   // get all lists
	listServer.POST("", api.CreateListHandler)                            // create list
	listServer.GET("/:listId", api.GetListHandler)                        // get list (with items)
	listServer.PUT("/:listId", api.UpdateListNameHandler)                 // update list name
	listServer.DELETE("/:listId", api.DeleteListHandler)                  // delete list
	listServer.PUT("/:listId/item", api.AddToListHandler)                 // add to list
	listServer.DELETE("/:listId/item/:itemId", api.DeleteFromListHandler) // remove from list
	// reorder problems
	// listServer.GET("/:listID/item/reorder-problems")
}
