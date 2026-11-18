package lists

import (
	"encoding/json"
	"errors"
	"io"
	"log"
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"github.com/mbashem/cftracker/backend/internal/limits"
	"github.com/mbashem/cftracker/backend/internal/lists/items"
	"github.com/mbashem/cftracker/backend/internal/middlewares"
)

type API struct {
	listRepository      ListRepository
	listItemsRepository items.ListItemRepository
}

type API_MESSAGE string

type listNameRequest struct {
	Name string `json:"name" binding:"required"`
}

const (
	failedToCreateList    API_MESSAGE = "Failed to create list"
	failedToUpdateList    API_MESSAGE = "Failed to update list"
	failedToFindList      API_MESSAGE = "Failed to find the list"
	failedToDeleteList    API_MESSAGE = "Failed to delete list"
	failedToAddItemToList API_MESSAGE = "Failed to add item to list"
	failedToUpdateItem    API_MESSAGE = "Failed to update item"
	failedToDeleteItem    API_MESSAGE = "Failed to delete item from list"
	failedToGetListItems  API_MESSAGE = "Failed to get list items"

	invalidListId   API_MESSAGE = "Invalid list Id"
	invalidListItem API_MESSAGE = "Invalid list item"
	invalidFormat   API_MESSAGE = "Invalid format"

	listDoesNotExist API_MESSAGE = "List does not exist"
	itemDoesNotExist API_MESSAGE = "Item does not exist"

	listDeleted     API_MESSAGE = "List deleted"
	listReordered   API_MESSAGE = "List reordered"
	listCreated     API_MESSAGE = "List created"
	listFound       API_MESSAGE = "List fetched successfully"
	listsFound      API_MESSAGE = "Lists fetched successfully"
	listNameUpdated API_MESSAGE = "List name updated"
	itemUpdated     API_MESSAGE = "Item updated"
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
	var request listNameRequest
	if err := context.ShouldBindJSON(&request); err != nil {
		context.JSON(http.StatusBadRequest, gin.H{"error": invalidFormat})
		return
	}
	name, err := limits.NormalizeListName(request.Name)
	if err != nil {
		context.JSON(http.StatusBadRequest, gin.H{"error": invalidFormat})
		return
	}

	list := List{Name: name}
	if err := api.listRepository.Create(context.Request.Context(), userId, &list); err != nil {
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

	var request listNameRequest
	if err := context.ShouldBindJSON(&request); err != nil {
		context.JSON(http.StatusBadRequest, gin.H{"error": invalidFormat})
		return
	}
	name, err := limits.NormalizeListName(request.Name)
	if err != nil {
		context.JSON(http.StatusBadRequest, gin.H{"error": invalidFormat})
		return
	}

	list := &List{Id: listId, Name: name}
	if err := api.listRepository.UpdateName(context.Request.Context(), userId, list); err != nil {
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

	if err := api.listRepository.Delete(context.Request.Context(), userId, listId); err != nil {
		writeListRepositoryError(context, err, failedToDeleteList)
		return
	}

	context.JSON(http.StatusOK, gin.H{"message": listDeleted})
}

// Get all lists
func (api *API) GetAllLists(context *gin.Context) {
	userId := context.GetInt64(middlewares.UserIdKey)
	lists, err := api.listRepository.GetAllListByUserId(context.Request.Context(), userId)
	if err != nil {
		writeListRepositoryError(context, err, failedToFindList)
		return
	}
	context.JSON(http.StatusOK, gin.H{"message": listsFound, "lists": lists})
}

// UpdateItemHandler accepts a nonempty strict PATCH, preserving omitted fields and clearing explicit nulls.
func (api *API) UpdateItemHandler(context *gin.Context) {
	listId, valid := parseListId(context)
	if !valid {
		return
	}
	var patch items.ItemPatch
	decoder := json.NewDecoder(context.Request.Body)
	decoder.DisallowUnknownFields()
	if err := decoder.Decode(&patch); err != nil {
		context.JSON(http.StatusBadRequest, gin.H{"error": invalidFormat})
		return
	}
	// Exactly one JSON object is allowed; reject extra values or malformed trailing content.
	var extraJSON any
	if err := decoder.Decode(&extraJSON); err != io.EOF {
		context.JSON(http.StatusBadRequest, gin.H{"error": invalidFormat})
		return
	}
	if patch.Empty() {
		context.JSON(http.StatusBadRequest, gin.H{"error": invalidFormat})
		return
	}
	if err := patch.Normalize(); err != nil {
		writeListRepositoryError(context, err, failedToUpdateItem)
		return
	}
	item, err := api.listItemsRepository.Update(context.Request.Context(),
		context.GetInt64(middlewares.UserIdKey), listId, context.Param("itemId"), patch)
	if err != nil {
		writeListRepositoryError(context, err, failedToUpdateItem)
		return
	}
	context.JSON(http.StatusOK, gin.H{"message": itemUpdated, "item": item})
}

// Get list with items
func (api *API) GetListHandler(context *gin.Context) {
	userId := context.GetInt64(middlewares.UserIdKey)
	listId, valid := parseListId(context)
	if !valid {
		return
	}

	list, err := api.listRepository.GetById(context.Request.Context(), userId, listId)
	if err != nil {
		writeListRepositoryError(context, err, failedToFindList)
		return
	}

	items, err := api.listItemsRepository.GetItems(context.Request.Context(), userId, listId)
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
	if errors.Is(err, items.ErrInvalidOperation) {
		context.JSON(http.StatusBadRequest, gin.H{"error": items.ErrInvalidOperation.Error()})
		return
	}
	if errors.Is(err, items.ErrOrderConflict) {
		context.JSON(http.StatusConflict, gin.H{"error": items.ErrOrderConflict.Error()})
		return
	}
	if errors.Is(err, items.ErrInvalidPractice) {
		context.JSON(http.StatusBadRequest, gin.H{"error": items.ErrInvalidPractice.Error()})
		return
	}
	if errors.Is(err, items.ErrItemNotFound) {
		context.JSON(http.StatusNotFound, gin.H{"error": itemDoesNotExist})
		return
	}
	if errors.Is(err, limits.ErrInvalidListName) {
		context.JSON(http.StatusBadRequest, gin.H{"error": limits.ErrInvalidListName.Error()})
		return
	}
	for _, limitError := range []error{limits.ErrListQuota, limits.ErrItemQuota} {
		if errors.Is(err, limitError) {
			context.JSON(http.StatusConflict, gin.H{"error": limitError.Error()})
			return
		}
	}
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
