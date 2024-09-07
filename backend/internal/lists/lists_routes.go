package lists

import (
	"github.com/gin-gonic/gin"
	"github.com/mbashem/cftracker/backend/internal/db"
	"github.com/mbashem/cftracker/backend/internal/lists/items"
	"github.com/mbashem/cftracker/backend/internal/middlewares"
)

func RegisterRoutes(server *gin.Engine) {
	listServer := server.Group("/api/lists")
	listServer.Use(middlewares.Authenticate)

	listRepository := NewRepository(db.DB)
	listItemRepository := items.NewRepository(db.DB)

	api := NewAPI(listRepository, listItemRepository)

	listServer.GET("", api.GetAllLists)                           // get all lists
	listServer.POST("", api.CreateListHandler)                    // create list
	listServer.GET("/:listId", api.GetListHandler)                // get list (with items)
	listServer.PUT("/:listId", api.UpdateListNameHandler)         // update list name
	listServer.DELETE("/:listId", api.DeleteListHandler)          // delete list
	listServer.PUT("/:listId/item", api.AddToListHandler)         // add to list
	listServer.DELETE("/:listId/item", api.DeleteFromListHandler) // remove from list
	// reorder problems
	// listServer.GET("/:listID/item/reorder-problems")
}
