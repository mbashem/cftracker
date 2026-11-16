package lists

import (
	"encoding/json"
	"io"
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/mbashem/cftracker/backend/internal/lists/items"
	"github.com/mbashem/cftracker/backend/internal/middlewares"
)

type bulkItemRequest struct {
	items.ItemPatch
	ProblemID string `json:"problem_id"`
}

// decodeCollection accepts one JSON value with known fields and writes a 400 response on decoding failure.
func decodeCollection(context *gin.Context, value any) bool {
	decoder := json.NewDecoder(context.Request.Body)
	decoder.DisallowUnknownFields()
	if err := decoder.Decode(value); err != nil {
		context.JSON(http.StatusBadRequest, gin.H{"error": invalidFormat})
		return false
	}
	if err := decoder.Decode(new(any)); err != io.EOF {
		context.JSON(http.StatusBadRequest, gin.H{"error": invalidFormat})
		return false
	}
	return true
}

// BulkAddHandler decodes practice records and returns an atomic append result for the authenticated owner.
func (api *API) BulkAddHandler(context *gin.Context) {
	listID, valid := parseListId(context)
	if !valid {
		return
	}
	var request struct {
		Items []bulkItemRequest `json:"items"`
	}
	if !decodeCollection(context, &request) {
		return
	}
	input := make([]items.ListItem, len(request.Items))
	for index, item := range request.Items {
		if err := item.Normalize(); err != nil {
			writeListRepositoryError(context, err, failedToAddItemToList)
			return
		}
		input[index] = items.ListItem{ProblemId: strings.TrimSpace(item.ProblemID), Practice: item.Values()}
	}
	result, err := api.listItemsRepository.BulkAdd(context.Request.Context(), context.GetInt64(middlewares.UserIdKey), listID, input)
	if err != nil {
		writeListRepositoryError(context, err, failedToAddItemToList)
		return
	}
	context.JSON(http.StatusOK, result)
}

// MoveItemsHandler submits sequential relative moves and returns the committed order and rebalance flag.
func (api *API) MoveItemsHandler(context *gin.Context) {
	listID, valid := parseListId(context)
	if !valid {
		return
	}
	var request struct {
		Moves []items.Move `json:"moves"`
	}
	if !decodeCollection(context, &request) {
		return
	}
	if err := items.ValidateMoves(request.Moves); err != nil {
		writeListRepositoryError(context, err, failedToUpdateItem)
		return
	}
	result, err := api.listItemsRepository.MoveItems(context.Request.Context(), context.GetInt64(middlewares.UserIdKey), listID, request.Moves)
	if err != nil {
		writeListRepositoryError(context, err, failedToUpdateItem)
		return
	}
	context.JSON(http.StatusOK, result)
}

// BulkRemoveHandler submits selected IDs for atomic removal and returns removed/absent IDs with surviving order.
func (api *API) BulkRemoveHandler(context *gin.Context) {
	listID, valid := parseListId(context)
	if !valid {
		return
	}
	var request struct {
		IDs []string `json:"problem_ids"`
	}
	if !decodeCollection(context, &request) {
		return
	}
	result, err := api.listItemsRepository.BulkRemove(context.Request.Context(), context.GetInt64(middlewares.UserIdKey), listID, request.IDs)
	if err != nil {
		writeListRepositoryError(context, err, failedToDeleteItem)
		return
	}
	context.JSON(http.StatusOK, result)
}
