package lists

import "github.com/gin-gonic/gin"

// RegisterRoutes receives the authenticated /api group from the central registrar.
func RegisterRoutes(server gin.IRouter, api *API) {
	listServer := server.Group("/lists")

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
