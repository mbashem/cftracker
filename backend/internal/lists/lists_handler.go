package lists

import (
	"log"
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"github.com/mbashem/cftracker/backend/internal/middlewares"
)

type API_MESSAGE string

const (
	failedToCreateList    API_MESSAGE = "Failed to create list"
	failedToUpdateList    API_MESSAGE = "Failed to update list"
	failedToFindList      API_MESSAGE = "Failed to find the list"
	failedToDeleteList    API_MESSAGE = "Failed to delete list"
	failedToAddItemToList API_MESSAGE = "Failed to add item to list"
	failedToReorderItems  API_MESSAGE = "Failed to reorder items"

	invalidListID   API_MESSAGE = "Invalid list ID"
	invalidListItem API_MESSAGE = "Invalid list item"
	invalidFormat   API_MESSAGE = "Invalid format"

	listDoesNotExist API_MESSAGE = "List does not exist"

	listDeleted   API_MESSAGE = "List deleted"
	itemDeleted   API_MESSAGE = "Item deleted"
	listReordered API_MESSAGE = "List reordered"
	listCreated   API_MESSAGE = "List created"
	listFound     API_MESSAGE = "List fetched successfully"
)

// Create a new list
func createListHandler(context *gin.Context) {
	userID := context.GetInt64(middlewares.UserIdKey)
	var list List
	if err := context.ShouldBindJSON(&list); err != nil {
		log.Println("Error: ", err)
		context.JSON(http.StatusBadRequest, gin.H{"error": invalidFormat})
		return
	}

	list.UserID = userID
	if err := list.create(); err != nil {
		log.Println("Error: ", err)
		context.JSON(http.StatusInternalServerError, gin.H{"error": failedToCreateList})
		return
	}
	context.JSON(http.StatusCreated, gin.H{"message": listCreated, "list": list})
}

// Update list name
func updateListNameHandler(context *gin.Context) {
	userID := context.GetInt64(middlewares.UserIdKey)
	listID, _ := strconv.ParseInt(context.Param("id"), 10, 64)
	var form struct {
		Name string `json:"name"`
	}

	if err := context.ShouldBindJSON(&form); err != nil {
		log.Println("Error: ", err)
		context.JSON(http.StatusBadRequest, gin.H{"error": invalidFormat})
		return
	}

	list, err := getListByID(listID)

	if err != nil || list.UserID != userID {
		context.JSON(http.StatusNotFound, gin.H{"error": listDoesNotExist})
		return
	}

	list.Name = form.Name

	if err := list.updateName(); err != nil {
		context.JSON(http.StatusInternalServerError, gin.H{"error": failedToUpdateList})
		return
	}

	context.JSON(http.StatusOK, gin.H{"message": "List name updated"})
}

// Delete a list
func deleteListHandler(context *gin.Context) {
	userID := context.GetInt64(middlewares.UserIdKey)
	listID, _ := strconv.ParseInt(context.Param("id"), 10, 64)
	list, err := getListByID(listID)

	if err != nil || list.UserID != userID {
		context.JSON(http.StatusNotFound, gin.H{"error": listDoesNotExist})
		return
	}

	if err := list.delete(); err != nil {
		context.JSON(http.StatusInternalServerError, gin.H{"error": failedToDeleteList})
		return
	}

	context.JSON(http.StatusOK, gin.H{"message": listDeleted})
}

// Get all lists
func getAllLists(context *gin.Context) {
	userID := context.GetInt64(middlewares.UserIdKey)
	lists, err := getAllListByUserID(userID)
	if err != nil {
		context.JSON(http.StatusInternalServerError, gin.H{"error": failedToFindList})
		return
	}
	context.JSON(http.StatusOK, gin.H{"message": "Lists fetched successfully", "lists": lists})
}

// Add a problem to a list
func addToListHandler(context *gin.Context) {
	userID := context.GetInt64(middlewares.UserIdKey)

	var item ListItem
	if err := context.ShouldBindJSON(&item); err != nil {
		context.JSON(http.StatusBadRequest, gin.H{"error": invalidFormat})
		return
	}

	if list, err := item.getList(); err != nil || list.UserID != userID {
		context.JSON(http.StatusNotFound, gin.H{"error": listDoesNotExist})
		return
	}

	if err := item.AddToList(); err != nil {
		context.JSON(http.StatusInternalServerError, gin.H{"error": failedToAddItemToList})
		return
	}

	context.JSON(http.StatusCreated, gin.H{"message": "Successfully added item to list", "item": item})
}

func deleteFromListHandler(context *gin.Context) {
	userID := context.GetInt64(middlewares.UserIdKey)
	var item ListItem
	if err := context.ShouldBindJSON(&item); err != nil {
		context.JSON(http.StatusBadRequest, gin.H{"error": invalidListItem})
		return
	}

	if list, err := item.getList(); err != nil || list.UserID != userID {
		context.JSON(http.StatusNotFound, gin.H{"error": listDoesNotExist})
		return
	}

	err := item.deleteFromList()
	if err != nil {
		context.JSON(http.StatusInternalServerError, gin.H{"error": failedToDeleteList})
		return
	}

	context.JSON(http.StatusOK, gin.H{"message": "Item deleted from list"})
}

// Get list with items
func getListHandler(context *gin.Context) {
	userID := context.GetInt64(middlewares.UserIdKey)
	listID, _ := strconv.ParseInt(context.Param("id"), 10, 64)
	list, err := getListByID(listID)
	if err != nil || list.UserID != userID {
		log.Println("Error: ", err)
		context.JSON(http.StatusNotFound, gin.H{"error": listDoesNotExist})
		return
	}
	items, err := list.getItems()
	if err != nil {
		context.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get list items"})
		return
	}

	context.JSON(http.StatusOK, gin.H{"message": listFound, "list": list, "items": items})
}

// Reorder problems in a list
// func reorderListItemsHandler(c *gin.Context) {
// 	listID, _ := strconv.ParseInt(c.Param("id"), 10, 64)
// 	var newOrder []int64
// 	if err := c.ShouldBindJSON(&newOrder); err != nil {
// 		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
// 		return
// 	}
// 	if err := reorderListItems(listID, newOrder); err != nil {
// 		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to reorder items"})
// 		return
// 	}
// 	c.JSON(http.StatusOK, gin.H{"message": "List items reordered"})
// }
