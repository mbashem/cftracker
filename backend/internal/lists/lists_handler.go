package lists

import (
	"log"
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"github.com/mbashem/cftracker/backend/internal/lists/items"
	"github.com/mbashem/cftracker/backend/internal/middlewares"
)

type API struct {
	listRepository      *Repository
	listItemsRepository *items.Repository
}

type API_MESSAGE string

const (
	failedToCreateList    API_MESSAGE = "Failed to create list"
	failedToUpdateList    API_MESSAGE = "Failed to update list"
	failedToFindList      API_MESSAGE = "Failed to find the list"
	failedToDeleteList    API_MESSAGE = "Failed to delete list"
	failedToAddItemToList API_MESSAGE = "Failed to add item to list"
	failedToReorderItems  API_MESSAGE = "Failed to reorder items"
	failedToGetListItems  API_MESSAGE = "Failed to get list items"

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

func NewAPI(listRepository *Repository, listItemsReposiotry *items.Repository) *API {
	return &API{
		listRepository:      listRepository,
		listItemsRepository: listItemsReposiotry,
	}
}

// Create a new list
func (api *API) CreateListHandler(context *gin.Context) {
	userID := context.GetInt64(middlewares.UserIdKey)
	var list List
	if err := context.ShouldBindJSON(&list); err != nil {
		// context.JSON(http.StatusBadRequest, gin.H{"error": invalidFormat})
		context.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// TODO: LIMIT number of list a user can create
	list.UserID = userID
	if err := api.listRepository.Create(&list); err != nil {
		// context.JSON(http.StatusInternalServerError, gin.H{"error": failedToCreateList})
		context.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	context.JSON(http.StatusCreated, gin.H{"message": listCreated, "list": list})
}

// Update list name
func (api *API) UpdateListNameHandler(context *gin.Context) {
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

	list, err := api.listRepository.GetByID(listID)
	if err != nil || list.UserID != userID {
		context.JSON(http.StatusNotFound, gin.H{"error": listDoesNotExist})
		return
	}

	list.Name = form.Name
	if err := api.listRepository.UpdateName(list); err != nil {
		context.JSON(http.StatusInternalServerError, gin.H{"error": failedToUpdateList})
		return
	}

	context.JSON(http.StatusOK, gin.H{"message": "List name updated"})
}

// Delete a list
func (api *API) DeleteListHandler(context *gin.Context) {
	userID := context.GetInt64(middlewares.UserIdKey)
	listID, _ := strconv.ParseInt(context.Param("id"), 10, 64)
	list, err := api.listRepository.GetByID(listID)

	if err != nil || list.UserID != userID {
		context.JSON(http.StatusNotFound, gin.H{"error": listDoesNotExist})
		return
	}

	if err := api.listRepository.Delete(listID); err != nil {
		context.JSON(http.StatusInternalServerError, gin.H{"error": failedToDeleteList})
		return
	}

	context.JSON(http.StatusOK, gin.H{"message": listDeleted})
}

// Get all lists
func (api *API) GetAllLists(context *gin.Context) {
	userID := context.GetInt64(middlewares.UserIdKey)
	lists, err := api.listRepository.GetAllListByUserID(userID)
	if err != nil {
		// context.JSON(http.StatusInternalServerError, gin.H{"error": failedToFindList})
		context.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	context.JSON(http.StatusOK, gin.H{"message": "Lists fetched successfully", "lists": lists})
}

// Add a problem to a list
func (api *API) AddToListHandler(context *gin.Context) {
	userID := context.GetInt64(middlewares.UserIdKey)

	var item items.ListItem
	if err := context.ShouldBindJSON(&item); err != nil {
		context.JSON(http.StatusBadRequest, gin.H{"error": invalidFormat})
		return
	}

	list, err := api.listRepository.GetByID(item.ListID)
	if err != nil || list.UserID != userID {
		context.JSON(http.StatusNotFound, gin.H{"error": listDoesNotExist})
		return
	}

	if err := api.listItemsRepository.Create(&item); err != nil {
		// context.JSON(http.StatusInternalServerError, gin.H{"error": failedToAddItemToList})
		context.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	context.JSON(http.StatusCreated, gin.H{"message": "Successfully added item to list", "item": item})
}

// Delete a problem from a list
func (api *API) DeleteFromListHandler(context *gin.Context) {
	userID := context.GetInt64(middlewares.UserIdKey)
	var item items.ListItem
	if err := context.ShouldBindJSON(&item); err != nil {
		// context.JSON(http.StatusBadRequest, gin.H{"error": invalidListItem})
		context.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	list, err := api.listRepository.GetByID(item.ListID)
	if err != nil || list.UserID != userID {
		// context.JSON(http.StatusNotFound, gin.H{"error": listDoesNotExist})
		context.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
		return
	}

	if err := api.listItemsRepository.Delete(&item); err != nil {
		// context.JSON(http.StatusInternalServerError, gin.H{"error": failedToDeleteList})
		context.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	context.JSON(http.StatusOK, gin.H{"message": "Item deleted from list"})
}

// Get list with items
func (api *API) GetListHandler(context *gin.Context) {
	userID := context.GetInt64(middlewares.UserIdKey)
	listID, _ := strconv.ParseInt(context.Param("listID"), 10, 64)
	list, err := api.listRepository.GetByID(listID)
	if err != nil || list.UserID != userID {
		// log.Println("Error: ", err)
		// context.JSON(http.StatusNotFound, gin.H{"error": listDoesNotExist})
		context.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
		return
	}

	items, err := api.listItemsRepository.GetItems(listID)
	if err != nil {
		// context.JSON(http.StatusInternalServerError, gin.H{"error": failedToGetListItems})
		context.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
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
