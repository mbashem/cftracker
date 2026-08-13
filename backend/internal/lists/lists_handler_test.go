package lists_test

import (
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"net/http/httptest"
	"reflect"
	"slices"
	"sort"
	"strings"
	"testing"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/mbashem/cftracker/backend/internal/lists"
	listitems "github.com/mbashem/cftracker/backend/internal/lists/items"
	"github.com/mbashem/cftracker/backend/internal/middlewares"
)

const (
	testAuthenticatedUserID = int64(42)
	testListID              = int64(7)
	testCreatedListID       = int64(8)
	testListName            = "Contest preparation"
	testProblemID           = "1845A"
	testListsPath           = "/api/lists"

	testInvalidListIDMessage        = "Invalid list Id"
	testInvalidFormatMessage        = "Invalid format"
	testListDoesNotExistMessage     = "List does not exist"
	testListCreatedMessage          = "List created"
	testListNameUpdatedMessage      = "List name updated"
	testListDeletedMessage          = "List deleted"
	testListsFoundMessage           = "Lists fetched successfully"
	testListFoundMessage            = "List fetched successfully"
	testItemAddedMessage            = "Successfully added item to list"
	testItemDeletedMessage          = "Item deleted from list"
	testFailedToCreateListMessage   = "Failed to create list"
	testFailedToUpdateListMessage   = "Failed to update list"
	testFailedToDeleteListMessage   = "Failed to delete list"
	testFailedToFindListMessage     = "Failed to find the list"
	testFailedToAddItemMessage      = "Failed to add item to list"
	testFailedToDeleteItemMessage   = "Failed to delete item from list"
	testFailedToGetListItemsMessage = "Failed to get list items"
)

var testRepositoryFailure = errors.New("repository unavailable")

type handlerTestCase struct {
	name           string
	method         string
	path           string
	body           string
	setup          func(repository *mockRepository)
	expectedStatus int
	expectedBody   any
	expectedCalls  []repositoryCall
}

func TestListHandlers(t *testing.T) {
	validList := newListFixture()
	createdList := lists.List{Id: testCreatedListID, UserId: testAuthenticatedUserID, Name: testListName, CreatedAt: testCreatedAt()}
	validItem := newListItemFixture()
	createdItem := validItem
	createdItem.CreatedAt = testItemCreatedAt()

	testCases := []handlerTestCase{
		{
			name: "create trims a valid name", method: http.MethodPost, path: testListsPath,
			body: fmt.Sprintf(`{"name":"  %s  "}`, testListName), expectedStatus: http.StatusCreated,
			expectedBody:  successBody(testListCreatedMessage, "list", createdList),
			expectedCalls: []repositoryCall{{operation: createListOperation, userID: testAuthenticatedUserID, listName: testListName}},
		},
		validationCase("create rejects malformed JSON", http.MethodPost, testListsPath, `{"name":`, testInvalidFormatMessage),
		validationCase("create rejects a missing name", http.MethodPost, testListsPath, `{}`, testInvalidFormatMessage),
		validationCase("create rejects a blank name", http.MethodPost, testListsPath, `{"name":"   "}`, testInvalidFormatMessage),
		repositoryErrorCase("create handles repository failure", http.MethodPost, testListsPath,
			fmt.Sprintf(`{"name":"%s"}`, testListName), createListOperation, testFailedToCreateListMessage,
			repositoryCall{operation: createListOperation, userID: testAuthenticatedUserID, listName: testListName}),

		{
			name: "update trims a valid name", method: http.MethodPut, path: listPath(testListID),
			body: fmt.Sprintf(`{"name":"  %s  "}`, testListName), expectedStatus: http.StatusOK,
			expectedBody:  messageBody(testListNameUpdatedMessage),
			expectedCalls: []repositoryCall{{operation: updateListOperation, userID: testAuthenticatedUserID, listID: testListID, listName: testListName}},
		},
		validationCase("update rejects malformed list ID", http.MethodPut, listPath("invalid"),
			fmt.Sprintf(`{"name":"%s"}`, testListName), testInvalidListIDMessage),
		validationCase("update rejects malformed JSON", http.MethodPut, listPath(testListID), `{"name":`, testInvalidFormatMessage),
		validationCase("update rejects a blank name", http.MethodPut, listPath(testListID), `{"name":"   "}`, testInvalidFormatMessage),
		notFoundCase("update hides a missing list", http.MethodPut, listPath(testListID),
			fmt.Sprintf(`{"name":"%s"}`, testListName),
			repositoryCall{operation: updateListOperation, userID: testAuthenticatedUserID, listID: testListID, listName: testListName}),
		repositoryErrorCase("update handles repository failure", http.MethodPut, listPath(testListID),
			fmt.Sprintf(`{"name":"%s"}`, testListName), updateListOperation, testFailedToUpdateListMessage,
			repositoryCall{operation: updateListOperation, userID: testAuthenticatedUserID, listID: testListID, listName: testListName}),

		{
			name: "delete removes an owned list", method: http.MethodDelete, path: listPath(testListID),
			expectedStatus: http.StatusOK, expectedBody: messageBody(testListDeletedMessage),
			expectedCalls: []repositoryCall{{operation: deleteListOperation, userID: testAuthenticatedUserID, listID: testListID}},
		},
		validationCase("delete rejects malformed list ID", http.MethodDelete, listPath("invalid"), "", testInvalidListIDMessage),
		notFoundCase("delete hides a missing list", http.MethodDelete, listPath(testListID), "",
			repositoryCall{operation: deleteListOperation, userID: testAuthenticatedUserID, listID: testListID}),
		repositoryErrorCase("delete handles repository failure", http.MethodDelete, listPath(testListID), "",
			deleteListOperation, testFailedToDeleteListMessage,
			repositoryCall{operation: deleteListOperation, userID: testAuthenticatedUserID, listID: testListID}),

		{
			name: "get all returns owned lists", method: http.MethodGet, path: testListsPath,
			expectedStatus: http.StatusOK, expectedBody: successBody(testListsFoundMessage, "lists", []lists.List{validList}),
			expectedCalls: []repositoryCall{{operation: getAllListsOperation, userID: testAuthenticatedUserID}},
		},
		{
			name: "get all returns an empty array", method: http.MethodGet, path: testListsPath,
			setup: clearLists, expectedStatus: http.StatusOK,
			expectedBody:  successBody(testListsFoundMessage, "lists", []lists.List{}),
			expectedCalls: []repositoryCall{{operation: getAllListsOperation, userID: testAuthenticatedUserID}},
		},
		repositoryErrorCase("get all handles repository failure", http.MethodGet, testListsPath, "",
			getAllListsOperation, testFailedToFindListMessage,
			repositoryCall{operation: getAllListsOperation, userID: testAuthenticatedUserID}),

		{
			name: "get returns an owned list with items", method: http.MethodGet, path: listPath(testListID),
			setup:          func(repository *mockRepository) { repository.storeItem(validItem) },
			expectedStatus: http.StatusOK,
			expectedBody:   map[string]any{"message": testListFoundMessage, "list": validList, "items": []listitems.ListItem{validItem}},
			expectedCalls: []repositoryCall{
				{operation: getListOperation, userID: testAuthenticatedUserID, listID: testListID},
				{operation: getListItemsOperation, userID: testAuthenticatedUserID, listID: testListID},
			},
		},
		{
			name: "get returns an empty item array", method: http.MethodGet, path: listPath(testListID),
			expectedStatus: http.StatusOK,
			expectedBody:   map[string]any{"message": testListFoundMessage, "list": validList, "items": []listitems.ListItem{}},
			expectedCalls: []repositoryCall{
				{operation: getListOperation, userID: testAuthenticatedUserID, listID: testListID},
				{operation: getListItemsOperation, userID: testAuthenticatedUserID, listID: testListID},
			},
		},
		validationCase("get rejects malformed list ID", http.MethodGet, listPath("invalid"), "", testInvalidListIDMessage),
		notFoundCase("get hides a missing list", http.MethodGet, listPath(testListID), "",
			repositoryCall{operation: getListOperation, userID: testAuthenticatedUserID, listID: testListID}),
		repositoryErrorCase("get handles list repository failure", http.MethodGet, listPath(testListID), "",
			getListOperation, testFailedToFindListMessage,
			repositoryCall{operation: getListOperation, userID: testAuthenticatedUserID, listID: testListID}),
		{
			name: "get handles a list disappearing before item lookup", method: http.MethodGet, path: listPath(testListID),
			setup: func(repository *mockRepository) {
				repository.operationErrors[getListItemsOperation] = fmt.Errorf("load items: %w", listitems.ErrListNotFound)
			},
			expectedStatus: http.StatusNotFound, expectedBody: errorBody(testListDoesNotExistMessage),
			expectedCalls: []repositoryCall{
				{operation: getListOperation, userID: testAuthenticatedUserID, listID: testListID},
				{operation: getListItemsOperation, userID: testAuthenticatedUserID, listID: testListID},
			},
		},
		{
			name: "get handles item repository failure", method: http.MethodGet, path: listPath(testListID),
			setup:          operationFailure(getListItemsOperation),
			expectedStatus: http.StatusInternalServerError, expectedBody: errorBody(testFailedToGetListItemsMessage),
			expectedCalls: []repositoryCall{
				{operation: getListOperation, userID: testAuthenticatedUserID, listID: testListID},
				{operation: getListItemsOperation, userID: testAuthenticatedUserID, listID: testListID},
			},
		},

		{
			name: "add accepts position zero and trims the problem ID", method: http.MethodPut, path: itemCollectionPath(testListID),
			body:           fmt.Sprintf(`{"problem_id":"  %s  ","position":0}`, testProblemID),
			expectedStatus: http.StatusCreated, expectedBody: successBody(testItemAddedMessage, "item", createdItem),
			expectedCalls: []repositoryCall{{
				operation: createListItemOperation, userID: testAuthenticatedUserID, listID: testListID,
				problemID: testProblemID, position: 0,
			}},
		},
		validationCase("add rejects malformed list ID", http.MethodPut, itemCollectionPath("invalid"),
			fmt.Sprintf(`{"problem_id":"%s","position":0}`, testProblemID), testInvalidListIDMessage),
		validationCase("add rejects malformed JSON", http.MethodPut, itemCollectionPath(testListID), `{"problem_id":`, testInvalidFormatMessage),
		validationCase("add rejects a missing position", http.MethodPut, itemCollectionPath(testListID),
			fmt.Sprintf(`{"problem_id":"%s"}`, testProblemID), testInvalidFormatMessage),
		validationCase("add rejects a null position", http.MethodPut, itemCollectionPath(testListID),
			fmt.Sprintf(`{"problem_id":"%s","position":null}`, testProblemID), testInvalidFormatMessage),
		validationCase("add rejects a negative position", http.MethodPut, itemCollectionPath(testListID),
			fmt.Sprintf(`{"problem_id":"%s","position":-1}`, testProblemID), testInvalidFormatMessage),
		validationCase("add rejects a blank problem ID", http.MethodPut, itemCollectionPath(testListID),
			`{"problem_id":"   ","position":0}`, testInvalidFormatMessage),
		validationCase("add rejects an overlong problem ID", http.MethodPut, itemCollectionPath(testListID),
			fmt.Sprintf(`{"problem_id":"%s","position":0}`, strings.Repeat("A", 101)), testInvalidFormatMessage),
		{
			name: "add hides a foreign list", method: http.MethodPut, path: itemCollectionPath(testListID),
			body: fmt.Sprintf(`{"problem_id":"%s","position":3}`, testProblemID), setup: clearLists,
			expectedStatus: http.StatusNotFound, expectedBody: errorBody(testListDoesNotExistMessage),
			expectedCalls: []repositoryCall{{
				operation: createListItemOperation, userID: testAuthenticatedUserID, listID: testListID,
				problemID: testProblemID, position: 3,
			}},
		},
		repositoryErrorCase("add handles repository failure", http.MethodPut, itemCollectionPath(testListID),
			fmt.Sprintf(`{"problem_id":"%s","position":3}`, testProblemID), createListItemOperation,
			testFailedToAddItemMessage, repositoryCall{
				operation: createListItemOperation, userID: testAuthenticatedUserID, listID: testListID,
				problemID: testProblemID, position: 3,
			}),

		{
			name: "remove deletes an existing item", method: http.MethodDelete, path: itemPath(testListID, testProblemID),
			setup:          func(repository *mockRepository) { repository.storeItem(validItem) },
			expectedStatus: http.StatusOK, expectedBody: messageBody(testItemDeletedMessage),
			expectedCalls: []repositoryCall{{
				operation: deleteListItemOperation, userID: testAuthenticatedUserID, listID: testListID, problemID: testProblemID,
			}},
		},
		{
			name: "remove is idempotent for an absent item", method: http.MethodDelete, path: itemPath(testListID, "absent"),
			expectedStatus: http.StatusOK, expectedBody: messageBody(testItemDeletedMessage),
			expectedCalls: []repositoryCall{{
				operation: deleteListItemOperation, userID: testAuthenticatedUserID, listID: testListID, problemID: "absent",
			}},
		},
		validationCase("remove rejects malformed list ID", http.MethodDelete, itemPath("invalid", testProblemID), "", testInvalidListIDMessage),
		{
			name: "remove hides a foreign list", method: http.MethodDelete, path: itemPath(testListID, testProblemID), setup: clearLists,
			expectedStatus: http.StatusNotFound, expectedBody: errorBody(testListDoesNotExistMessage),
			expectedCalls: []repositoryCall{{
				operation: deleteListItemOperation, userID: testAuthenticatedUserID, listID: testListID, problemID: testProblemID,
			}},
		},
		repositoryErrorCase("remove handles repository failure", http.MethodDelete, itemPath(testListID, testProblemID), "",
			deleteListItemOperation, testFailedToDeleteItemMessage,
			repositoryCall{operation: deleteListItemOperation, userID: testAuthenticatedUserID, listID: testListID, problemID: testProblemID}),
	}

	for _, testCase := range testCases {
		t.Run(testCase.name, func(t *testing.T) {
			gin.SetMode(gin.TestMode)
			repository := newMockRepository()
			if testCase.setup != nil {
				testCase.setup(repository)
			}
			router := newListHandlerTestRouter(repository)

			response := performListRequest(router, testCase.method, testCase.path, testCase.body)

			assertResponseStatus(t, response, testCase.expectedStatus)
			assertJSONBody(t, response, testCase.expectedBody)
			if !slices.Equal(repository.calls, testCase.expectedCalls) {
				t.Fatalf("repository calls = %+v, want %+v", repository.calls, testCase.expectedCalls)
			}
		})
	}
}

func validationCase(name string, method string, path string, body string, message string) handlerTestCase {
	return handlerTestCase{name: name, method: method, path: path, body: body, expectedStatus: http.StatusBadRequest, expectedBody: errorBody(message)}
}

func notFoundCase(
	name string,
	method string,
	path string,
	body string,
	expectedCall repositoryCall,
) handlerTestCase {
	return handlerTestCase{
		name: name, method: method, path: path, body: body, setup: clearLists,
		expectedStatus: http.StatusNotFound, expectedBody: errorBody(testListDoesNotExistMessage),
		expectedCalls: []repositoryCall{expectedCall},
	}
}

func repositoryErrorCase(
	name string,
	method string,
	path string,
	body string,
	operation repositoryOperation,
	message string,
	expectedCall repositoryCall,
) handlerTestCase {
	return handlerTestCase{
		name: name, method: method, path: path, body: body, setup: operationFailure(operation),
		expectedStatus: http.StatusInternalServerError, expectedBody: errorBody(message),
		expectedCalls: []repositoryCall{expectedCall},
	}
}

func operationFailure(operation repositoryOperation) func(repository *mockRepository) {
	return func(repository *mockRepository) {
		repository.operationErrors[operation] = testRepositoryFailure
	}
}

func clearLists(repository *mockRepository) {
	repository.lists = map[int64]lists.List{}
	repository.items = map[int64]map[string]listitems.ListItem{}
}

func newListHandlerTestRouter(repository *mockRepository) *gin.Engine {
	router := gin.New()
	api := lists.NewAPI(repository, mockListItemRepository{repository})
	listRoutes := router.Group(testListsPath)
	listRoutes.Use(func(context *gin.Context) {
		context.Set(middlewares.UserIdKey, testAuthenticatedUserID)
		context.Next()
	})
	listRoutes.GET("", api.GetAllLists)
	listRoutes.POST("", api.CreateListHandler)
	listRoutes.GET("/:listId", api.GetListHandler)
	listRoutes.PUT("/:listId", api.UpdateListNameHandler)
	listRoutes.DELETE("/:listId", api.DeleteListHandler)
	listRoutes.PUT("/:listId/item", api.AddToListHandler)
	listRoutes.DELETE("/:listId/item/:itemId", api.DeleteFromListHandler)
	return router
}

func performListRequest(router *gin.Engine, method string, path string, body string) *httptest.ResponseRecorder {
	request := httptest.NewRequest(method, path, strings.NewReader(body))
	request.Header.Set("Content-Type", "application/json")
	response := httptest.NewRecorder()
	router.ServeHTTP(response, request)
	return response
}

func assertResponseStatus(t *testing.T, response *httptest.ResponseRecorder, expectedStatus int) {
	t.Helper()
	if response.Code != expectedStatus {
		t.Fatalf("response status = %d, want %d; body = %s", response.Code, expectedStatus, response.Body.String())
	}
}

func assertJSONBody(t *testing.T, response *httptest.ResponseRecorder, expectedBody any) {
	t.Helper()
	actualJSON := decodeJSON(t, response.Body.Bytes())
	expectedBytes, err := json.Marshal(expectedBody)
	if err != nil {
		t.Fatalf("encode expected response: %v", err)
	}
	expectedJSON := decodeJSON(t, expectedBytes)
	if !reflect.DeepEqual(actualJSON, expectedJSON) {
		t.Fatalf("response JSON = %#v, want %#v", actualJSON, expectedJSON)
	}
}

func decodeJSON(t *testing.T, data []byte) any {
	t.Helper()
	var value any
	if err := json.Unmarshal(data, &value); err != nil {
		t.Fatalf("decode JSON %q: %v", data, err)
	}
	return value
}

func messageBody(message string) map[string]any {
	return map[string]any{"message": message}
}

func errorBody(message string) map[string]any {
	return map[string]any{"error": message}
}

func successBody(message string, key string, value any) map[string]any {
	return map[string]any{"message": message, key: value}
}

func listPath(listID any) string {
	return fmt.Sprintf("%s/%v", testListsPath, listID)
}

func itemCollectionPath(listID any) string {
	return fmt.Sprintf("%s/%v/item", testListsPath, listID)
}

func itemPath(listID any, problemID string) string {
	return fmt.Sprintf("%s/%v/item/%s", testListsPath, listID, problemID)
}

func newListFixture() lists.List {
	return lists.List{
		Id: testListID, UserId: testAuthenticatedUserID, Name: testListName, CreatedAt: testCreatedAt(),
	}
}

func newListItemFixture() listitems.ListItem {
	return listitems.ListItem{
		ListId: testListID, ProblemId: testProblemID, Position: 0, CreatedAt: testItemCreatedAt(),
	}
}

func testCreatedAt() time.Time {
	return time.Date(2026, time.August, 11, 9, 30, 0, 0, time.UTC)
}

func testItemCreatedAt() time.Time {
	return time.Date(2026, time.August, 11, 9, 45, 0, 0, time.UTC)
}

type repositoryOperation string

const (
	createListOperation     repositoryOperation = "create list"
	updateListOperation     repositoryOperation = "update list"
	deleteListOperation     repositoryOperation = "delete list"
	getListOperation        repositoryOperation = "get list"
	getAllListsOperation    repositoryOperation = "get all lists"
	createListItemOperation repositoryOperation = "create list item"
	deleteListItemOperation repositoryOperation = "delete list item"
	getListItemsOperation   repositoryOperation = "get list items"
)

type repositoryCall struct {
	operation repositoryOperation
	userID    int64
	listID    int64
	listName  string
	problemID string
	position  int
}

type mockRepository struct {
	lists           map[int64]lists.List
	items           map[int64]map[string]listitems.ListItem
	operationErrors map[repositoryOperation]error
	calls           []repositoryCall
}

func newMockRepository() *mockRepository {
	repository := &mockRepository{
		lists:           map[int64]lists.List{},
		items:           map[int64]map[string]listitems.ListItem{},
		operationErrors: map[repositoryOperation]error{},
	}
	repository.storeList(newListFixture())
	return repository
}

func (repository *mockRepository) Create(userID int64, list *lists.List) error {
	repository.record(repositoryCall{operation: createListOperation, userID: userID, listName: list.Name})
	if err := repository.operationErrors[createListOperation]; err != nil {
		return err
	}

	createdList := lists.List{
		Id:        testCreatedListID,
		UserId:    userID,
		Name:      list.Name,
		CreatedAt: testCreatedAt(),
	}
	repository.storeList(createdList)
	*list = createdList
	return nil
}

func (repository *mockRepository) UpdateName(userID int64, list *lists.List) error {
	repository.record(repositoryCall{
		operation: updateListOperation,
		userID:    userID,
		listID:    list.Id,
		listName:  list.Name,
	})
	if err := repository.operationErrors[updateListOperation]; err != nil {
		return err
	}

	storedList, found := repository.ownedList(userID, list.Id)
	if !found {
		return lists.ErrListNotFound
	}
	storedList.Name = list.Name
	repository.storeList(storedList)
	return nil
}

func (repository *mockRepository) Delete(userID int64, listID int64) error {
	repository.record(repositoryCall{operation: deleteListOperation, userID: userID, listID: listID})
	if err := repository.operationErrors[deleteListOperation]; err != nil {
		return err
	}
	if _, found := repository.ownedList(userID, listID); !found {
		return lists.ErrListNotFound
	}
	delete(repository.lists, listID)
	delete(repository.items, listID)
	return nil
}

func (repository *mockRepository) GetById(userID int64, listID int64) (*lists.List, error) {
	repository.record(repositoryCall{operation: getListOperation, userID: userID, listID: listID})
	if err := repository.operationErrors[getListOperation]; err != nil {
		return nil, err
	}
	storedList, found := repository.ownedList(userID, listID)
	if !found {
		return nil, lists.ErrListNotFound
	}
	return &storedList, nil
}

func (repository *mockRepository) GetAllListByUserId(userID int64) ([]lists.List, error) {
	repository.record(repositoryCall{operation: getAllListsOperation, userID: userID})
	if err := repository.operationErrors[getAllListsOperation]; err != nil {
		return nil, err
	}

	userLists := []lists.List{}
	for _, list := range repository.lists {
		if list.UserId == userID {
			userLists = append(userLists, list)
		}
	}
	sort.Slice(userLists, func(first, second int) bool {
		return userLists[first].Id < userLists[second].Id
	})
	return userLists, nil
}

func (repository *mockRepository) createItem(userID int64, item *listitems.ListItem) error {
	repository.record(repositoryCall{
		operation: createListItemOperation,
		userID:    userID,
		listID:    item.ListId,
		problemID: item.ProblemId,
		position:  item.Position,
	})
	if err := repository.operationErrors[createListItemOperation]; err != nil {
		return err
	}
	if _, found := repository.ownedList(userID, item.ListId); !found {
		return listitems.ErrListNotFound
	}

	createdItem := *item
	createdItem.CreatedAt = testItemCreatedAt()
	repository.storeItem(createdItem)
	*item = createdItem
	return nil
}

func (repository *mockRepository) deleteItem(userID int64, item *listitems.ListItem) error {
	repository.record(repositoryCall{
		operation: deleteListItemOperation,
		userID:    userID,
		listID:    item.ListId,
		problemID: item.ProblemId,
	})
	if err := repository.operationErrors[deleteListItemOperation]; err != nil {
		return err
	}
	if _, found := repository.ownedList(userID, item.ListId); !found {
		return listitems.ErrListNotFound
	}
	delete(repository.items[item.ListId], item.ProblemId)
	return nil
}

func (repository *mockRepository) GetItems(userID int64, listID int64) ([]listitems.ListItem, error) {
	repository.record(repositoryCall{operation: getListItemsOperation, userID: userID, listID: listID})
	if err := repository.operationErrors[getListItemsOperation]; err != nil {
		return nil, err
	}
	if _, found := repository.ownedList(userID, listID); !found {
		return nil, listitems.ErrListNotFound
	}

	storedItems := []listitems.ListItem{}
	for _, item := range repository.items[listID] {
		storedItems = append(storedItems, item)
	}
	sort.Slice(storedItems, func(first, second int) bool {
		return storedItems[first].Position < storedItems[second].Position
	})
	return storedItems, nil
}

// Go cannot overload Create and Delete, so the item interface uses a view over the shared state.
type mockListItemRepository struct{ *mockRepository }

func (repository mockListItemRepository) Create(userID int64, item *listitems.ListItem) error {
	return repository.createItem(userID, item)
}

func (repository mockListItemRepository) Delete(userID int64, item *listitems.ListItem) error {
	return repository.deleteItem(userID, item)
}

func (repository *mockRepository) record(call repositoryCall) {
	repository.calls = append(repository.calls, call)
}

func (repository *mockRepository) ownedList(userID int64, listID int64) (lists.List, bool) {
	list, found := repository.lists[listID]
	return list, found && list.UserId == userID
}

func (repository *mockRepository) storeList(list lists.List) {
	repository.lists[list.Id] = list
	if repository.items[list.Id] == nil {
		repository.items[list.Id] = map[string]listitems.ListItem{}
	}
}

func (repository *mockRepository) storeItem(item listitems.ListItem) {
	if repository.items[item.ListId] == nil {
		repository.items[item.ListId] = map[string]listitems.ListItem{}
	}
	repository.items[item.ListId][item.ProblemId] = item
}
