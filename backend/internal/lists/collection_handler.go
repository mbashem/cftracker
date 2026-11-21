package lists

import (
	"bytes"
	"encoding/json"
	"errors"
	"io"
	"net/http"
	"strings"
	"unicode/utf8"

	"github.com/gin-gonic/gin"
	"github.com/mbashem/cftracker/backend/internal/limits"
	"github.com/mbashem/cftracker/backend/internal/lists/items"
	"github.com/mbashem/cftracker/backend/internal/middlewares"
)

type bulkItemRequest struct {
	items.ItemPatch
	ProblemID string `json:"problem_id"`
}

type bulkItemBatch []bulkItemRequest

// UnmarshalJSON caps the number of decoded records before allocating the next one.
func (batch *bulkItemBatch) UnmarshalJSON(data []byte) error {
	if bytes.Equal(data, []byte("null")) {
		*batch = nil
		return nil
	}
	decoder := json.NewDecoder(bytes.NewReader(data))
	decoder.DisallowUnknownFields()
	token, err := decoder.Token()
	if err != nil {
		return err
	}
	if token != json.Delim('[') {
		return errors.New("items must be an array")
	}
	var decoded bulkItemBatch
	for decoder.More() {
		if len(decoded) == limits.ItemsPerList {
			return items.ErrInvalidOperation
		}
		var item bulkItemRequest
		if err := decoder.Decode(&item); err != nil {
			return err
		}
		decoded = append(decoded, item)
	}
	if _, err := decoder.Token(); err != nil {
		return err
	}
	*batch = decoded
	return nil
}

// decodeListJSON accepts one JSON value with known fields and returns a 400 on decoding failure.
func decodeListJSON(context *gin.Context, value any) bool {
	decoder := json.NewDecoder(context.Request.Body)
	decoder.DisallowUnknownFields()
	if err := decoder.Decode(value); err != nil {
		message := string(invalidFormat)
		if errors.Is(err, items.ErrInvalidOperation) {
			message = items.ErrInvalidOperation.Error()
		}
		context.JSON(http.StatusBadRequest, gin.H{"error": message})
		return false
	}
	// Detect trailing content without decoding a second collection into memory.
	if _, err := decoder.Token(); err != io.EOF {
		context.JSON(http.StatusBadRequest, gin.H{"error": invalidFormat})
		return false
	}
	return true
}

// BulkAddHandler inserts a validated batch before an existing anchor, or prepends when absent.
func (api *API) BulkAddHandler(context *gin.Context) {
	listID, valid := parseListId(context)
	if !valid {
		return
	}
	var request struct {
		Items  bulkItemBatch `json:"items"`
		Before *string       `json:"before_problem_id"`
	}
	if !decodeListJSON(context, &request) {
		return
	}
	if len(request.Items) == 0 {
		writeListRepositoryError(context, items.ErrInvalidOperation, failedToAddItemToList)
		return
	}
	input := make([]items.ListItem, len(request.Items))
	for index, item := range request.Items {
		id := strings.TrimSpace(item.ProblemID)
		if id == "" || !utf8.ValidString(id) || strings.ContainsAny(id, "/\x00") || utf8.RuneCountInString(id) > 100 {
			writeListRepositoryError(context, items.ErrInvalidOperation, failedToAddItemToList)
			return
		}
		if err := item.Normalize(); err != nil {
			writeListRepositoryError(context, err, failedToAddItemToList)
			return
		}
		input[index] = items.ListItem{ProblemId: id, Practice: item.Values()}
	}
	result, err := api.listItemsRepository.BulkAdd(context.Request.Context(), context.GetInt64(middlewares.UserIdKey), listID, input, request.Before)
	if err != nil {
		writeListRepositoryError(context, err, failedToAddItemToList)
		return
	}
	context.JSON(http.StatusOK, result)
}

// MoveItemsHandler moves one selection to one destination and returns its final positions.
func (api *API) MoveItemsHandler(context *gin.Context) {
	listID, valid := parseListId(context)
	if !valid {
		return
	}
	var request items.Move
	if !decodeListJSON(context, &request) {
		return
	}
	if err := request.Validate(); err != nil {
		writeListRepositoryError(context, err, failedToUpdateItem)
		return
	}
	result, err := api.listItemsRepository.MoveItems(context.Request.Context(), context.GetInt64(middlewares.UserIdKey), listID, request)
	if err != nil {
		writeListRepositoryError(context, err, failedToUpdateItem)
		return
	}
	context.JSON(http.StatusOK, result)
}

// BulkRemoveHandler submits selected IDs for atomic removal and returns removed/absent IDs.
func (api *API) BulkRemoveHandler(context *gin.Context) {
	listID, valid := parseListId(context)
	if !valid {
		return
	}
	var request struct {
		IDs []string `json:"problem_ids"`
	}
	if !decodeListJSON(context, &request) {
		return
	}
	if len(request.IDs) == 0 || len(request.IDs) > limits.ItemsPerList {
		writeListRepositoryError(context, items.ErrInvalidOperation, failedToDeleteItem)
		return
	}
	seen := make(map[string]bool, len(request.IDs))
	for index, id := range request.IDs {
		id = strings.TrimSpace(id)
		if id == "" || seen[id] {
			writeListRepositoryError(context, items.ErrInvalidOperation, failedToDeleteItem)
			return
		}
		request.IDs[index] = id
		seen[id] = true
	}
	result, err := api.listItemsRepository.BulkRemove(context.Request.Context(), context.GetInt64(middlewares.UserIdKey), listID, request.IDs)
	if err != nil {
		writeListRepositoryError(context, err, failedToDeleteItem)
		return
	}
	context.JSON(http.StatusOK, result)
}
