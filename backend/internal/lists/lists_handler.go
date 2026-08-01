package lists

import (
	"errors"
	"log"
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"github.com/mbashem/cftracker/backend/internal/lists/items"
	"github.com/mbashem/cftracker/backend/internal/middlewares"
)

type API struct {
	listRepository      ListRepository
	listItemsRepository items.ListItemRepository
}

type API_MESSAGE string

const (
	failedToCreateList    API_MESSAGE = "Failed to create list"
	failedToUpdateList    API_MESSAGE = "Failed to update list"
	failedToFindList      API_MESSAGE = "Failed to find the list"
	failedToDeleteList    API_MESSAGE = "Failed to delete list"
	failedToAddItemToList API_MESSAGE = "Failed to add item to list"
	failedToDeleteItem    API_MESSAGE = "Failed to delete item from list"
	failedToGetListItems  API_MESSAGE = "Failed to get list items"

	invalidListId   API_MESSAGE = "Invalid list Id"
	invalidListItem API_MESSAGE = "Invalid list item"
	invalidFormat   API_MESSAGE = "Invalid format"

	listDoesNotExist API_MESSAGE = "List does not exist"

	listDeleted     API_MESSAGE = "List deleted"
	itemDeleted     API_MESSAGE = "Item deleted from list"
	listReordered   API_MESSAGE = "List reordered"
	listCreated     API_MESSAGE = "List created"
	listFound       API_MESSAGE = "List fetched successfully"
	listsFound      API_MESSAGE = "Lists fetched successfully"
	listNameUpdated API_MESSAGE = "List name updated"
	itemAdded       API_MESSAGE = "Successfully added item to list"
)

func NewAPI(listRepository ListRepository, listItemsRepository items.ListItemRepository) *API {
	return &API{
		listRepository:      listRepository,
		listItemsRepository: listItemsRepository,
	}
}

// Create a new list
func (api *API) CreateListHandler(context *gin.Context) {
	userId := context.GetInt64(middlewares.UserIdKey)
	var list List
	if err := context.ShouldBindJSON(&list); err != nil {
		context.JSON(http.StatusBadRequest, gin.H{"error": invalidFormat})
		return
	}

	// TODO: LIMIT number of list a user can create
	if err := api.listRepository.Create(userId, &list); err != nil {
		writeListRepositoryError(context, err, failedToCreateList)
		return
	}
	context.JSON(http.StatusCreated, gin.H{"message": listCreated, "list": list})
}

// Update list name
func (api *API) UpdateListNameHandler(context *gin.Context) {
	userId := context.GetInt64(middlewares.UserIdKey)
	listId, valid := parseListId(context)
	if !valid {
		return
	}

	var form struct {
		Name string `json:"name"`
	}

	if err := context.ShouldBindJSON(&form); err != nil {
		context.JSON(http.StatusBadRequest, gin.H{"error": invalidFormat})
		return
	}

	list := &List{Id: listId, Name: form.Name}
	if err := api.listRepository.UpdateName(userId, list); err != nil {
		writeListRepositoryError(context, err, failedToUpdateList)
		return
	}

	context.JSON(http.StatusOK, gin.H{"message": listNameUpdated})
}

// Delete a list
func (api *API) DeleteListHandler(context *gin.Context) {
	userId := context.GetInt64(middlewares.UserIdKey)
	listId, valid := parseListId(context)
	if !valid {
		return
	}

	if err := api.listRepository.Delete(userId, listId); err != nil {
		writeListRepositoryError(context, err, failedToDeleteList)
		return
	}

	context.JSON(http.StatusOK, gin.H{"message": listDeleted})
}

// Get all lists
func (api *API) GetAllLists(context *gin.Context) {
	userId := context.GetInt64(middlewares.UserIdKey)
	lists, err := api.listRepository.GetAllListByUserId(userId)
	if err != nil {
		writeListRepositoryError(context, err, failedToFindList)
		return
	}
	context.JSON(http.StatusOK, gin.H{"message": listsFound, "lists": lists})
}

// Add a problem to a list
func (api *API) AddToListHandler(context *gin.Context) {
	userId := context.GetInt64(middlewares.UserIdKey)

	listId, valid := parseListId(context)
	if !valid {
		return
	}

	var item items.ListItem
	if err := context.ShouldBindJSON(&item); err != nil {
		context.JSON(http.StatusBadRequest, gin.H{"error": invalidFormat})
		return
	}

	item.ListId = listId
	if err := api.listItemsRepository.Create(userId, &item); err != nil {
		writeListRepositoryError(context, err, failedToAddItemToList)
		return
	}

	context.JSON(http.StatusCreated, gin.H{"message": itemAdded, "item": item})
}

// Delete a problem from a list
func (api *API) DeleteFromListHandler(context *gin.Context) {
	userId := context.GetInt64(middlewares.UserIdKey)

	listId, valid := parseListId(context)
	if !valid {
		return
	}

	itemId := context.Param("itemId")

	var item items.ListItem
	item.ListId = listId
	item.ProblemId = itemId

	if err := api.listItemsRepository.Delete(userId, &item); err != nil {
		writeListRepositoryError(context, err, failedToDeleteItem)
		return
	}

	context.JSON(http.StatusOK, gin.H{"message": itemDeleted})
}

// Get list with items
func (api *API) GetListHandler(context *gin.Context) {
	userId := context.GetInt64(middlewares.UserIdKey)
	listId, valid := parseListId(context)
	if !valid {
		return
	}

	list, err := api.listRepository.GetById(userId, listId)
	if err != nil {
		writeListRepositoryError(context, err, failedToFindList)
		return
	}

	items, err := api.listItemsRepository.GetItems(userId, listId)
	if err != nil {
		writeListRepositoryError(context, err, failedToGetListItems)
		return
	}

	context.JSON(http.StatusOK, gin.H{"message": listFound, "list": list, "items": items})
}

func parseListId(context *gin.Context) (int64, bool) {
	listId, err := strconv.ParseInt(context.Param("listId"), 10, 64)
	if err != nil {
		context.JSON(http.StatusBadRequest, gin.H{"error": invalidListId})
		return 0, false
	}
	return listId, true
}

func writeListRepositoryError(context *gin.Context, err error, clientMessage API_MESSAGE) {
	if errors.Is(err, ErrListNotFound) || errors.Is(err, items.ErrListNotFound) {
		context.JSON(http.StatusNotFound, gin.H{"error": listDoesNotExist})
		return
	}

	log.Printf(
		"list repository failed: method=%s path=%s user_id=%d error=%v",
		context.Request.Method,
		context.FullPath(),
		context.GetInt64(middlewares.UserIdKey),
		err,
	)
	context.JSON(http.StatusInternalServerError, gin.H{"error": clientMessage})
}

// Reorder problems in a list
// func reorderListItemsHandler(c *gin.Context) {
// 	listId, _ := strconv.ParseInt(c.Param("id"), 10, 64)
// 	var newOrder []string
// 	if err := c.ShouldBindJSON(&newOrder); err != nil {
// 		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
// 		return
// 	}
// 	if err := reorderListItems(listId, newOrder); err != nil {
// 		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to reorder items"})
// 		return
// 	}
// 	c.JSON(http.StatusOK, gin.H{"message": "List items reordered"})
// }
