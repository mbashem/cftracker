//go:build integration

package routes_test

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/http/cookiejar"
	"net/http/httptest"
	"net/url"
	"slices"
	"strings"
	"testing"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/mbashem/cftracker/backend/internal/auth"
	"github.com/mbashem/cftracker/backend/internal/lists"
	listitems "github.com/mbashem/cftracker/backend/internal/lists/items"
	"github.com/mbashem/cftracker/backend/internal/routes"
	"github.com/mbashem/cftracker/backend/internal/testutil"
	"github.com/mbashem/cftracker/backend/internal/users"
	"github.com/mbashem/cftracker/backend/internal/utils"
)

const (
	workflowJWTSecret       = "workflow-integration-secret"
	workflowOwnerCode       = "owner-code"
	workflowOtherUserCode   = "other-user-code"
	workflowListName        = "Contest preparation"
	workflowRenamedListName = "Regional preparation"
	workflowFirstProblemID  = "1845A"
	workflowSecondProblemID = "1845B"
)

type workflowResponse struct {
	status int
	header http.Header
	body   []byte
}

type workflowResponseBody struct {
	Message string               `json:"message"`
	Token   string               `json:"token"`
	User    users.User           `json:"user"`
	List    lists.List           `json:"list"`
	Lists   []lists.List         `json:"lists"`
	Item    listitems.ListItem   `json:"item"`
	Items   []listitems.ListItem `json:"items"`
}

type workflowErrorResponse struct {
	Error string `json:"error"`
}

func TestCompleteAPIWorkflow(t *testing.T) {
	gin.SetMode(gin.TestMode)
	database := testutil.OpenTestDB(t)
	testutil.ResetTestDB(t, database)
	utils.Init(workflowJWTSecret)

	ownerGitHubUser := auth.GitHubUser{
		ID: 11001, Login: "workflow-owner", Email: "owner@example.com", AvatarURL: "https://example.com/owner.png",
	}
	otherGitHubUser := auth.GitHubUser{
		ID: 11002, Login: "workflow-other", Email: "other@example.com", AvatarURL: "https://example.com/other.png",
	}
	githubProvider := testutil.NewGitHubProviderMock(
		"https://github.test/authorize",
		map[string]auth.GitHubUser{
			workflowOwnerCode: ownerGitHubUser, workflowOtherUserCode: otherGitHubUser,
		},
	)
	codeforcesProvider := testutil.NewCodeforcesProviderMock("")
	userRepository := users.NewRepository(database)
	listRepository := lists.NewRepository(database)
	itemRepository := listitems.NewRepository(database)

	router := gin.New()
	routes.RegisterRoutes(router, routes.Dependencies{
		Auth:  auth.NewAuthHandler(githubProvider, userRepository),
		Users: users.NewAPI(userRepository, users.NewVerificationTokenStore(), codeforcesProvider),
		Lists: lists.NewAPI(listRepository, itemRepository),
	})
	server := httptest.NewServer(router)
	t.Cleanup(server.Close)

	ownerClient := newWorkflowHTTPClient(t)
	ownerSession := authenticateWorkflowUser(t, ownerClient, server.URL, workflowOwnerCode, ownerGitHubUser)
	profile := decodeWorkflowJSON[workflowResponseBody](t, performWorkflowRequest(
		t, ownerClient, http.MethodGet, server.URL+"/api/user/profile", ownerSession.Token, "",
	), http.StatusOK)
	if profile.User != ownerSession.User {
		t.Fatalf("profile user = %+v, want %+v", profile.User, ownerSession.User)
	}

	createdList := decodeWorkflowJSON[workflowResponseBody](t, performWorkflowRequest(
		t,
		ownerClient,
		http.MethodPost,
		server.URL+"/api/lists",
		ownerSession.Token,
		fmt.Sprintf(`{"name":%q}`, workflowListName),
	), http.StatusCreated)
	if createdList.Message != "List created" || createdList.List.Id == 0 ||
		createdList.List.UserId != ownerSession.User.ID || createdList.List.Name != workflowListName ||
		createdList.List.CreatedAt.IsZero() {
		t.Fatalf("create-list response = %+v", createdList)
	}
	listPath := fmt.Sprintf("/api/lists/%d", createdList.List.Id)

	firstItem := addWorkflowItem(
		t, ownerClient, server.URL, ownerSession.Token, createdList.List.Id, workflowFirstProblemID, 0,
	)
	secondItem := addWorkflowItem(
		t, ownerClient, server.URL, ownerSession.Token, createdList.List.Id, workflowSecondProblemID, 1,
	)
	assertWorkflowListResponse(
		t,
		performWorkflowRequest(t, ownerClient, http.MethodGet, server.URL+listPath, ownerSession.Token, ""),
		createdList.List,
		[]listitems.ListItem{firstItem, secondItem},
	)

	assertWorkflowMessage(t, performWorkflowRequest(
		t,
		ownerClient,
		http.MethodPut,
		server.URL+listPath,
		ownerSession.Token,
		fmt.Sprintf(`{"name":%q}`, workflowRenamedListName),
	), http.StatusOK, "List name updated")
	renamedList := createdList.List
	renamedList.Name = workflowRenamedListName

	otherClient := newWorkflowHTTPClient(t)
	otherSession := authenticateWorkflowUser(t, otherClient, server.URL, workflowOtherUserCode, otherGitHubUser)
	otherProfile := decodeWorkflowJSON[workflowResponseBody](t, performWorkflowRequest(
		t, otherClient, http.MethodGet, server.URL+"/api/user/profile", otherSession.Token, "",
	), http.StatusOK)
	if otherProfile.User != otherSession.User {
		t.Fatalf("other profile user = %+v, want %+v", otherProfile.User, otherSession.User)
	}
	otherLists := decodeWorkflowJSON[workflowResponseBody](t, performWorkflowRequest(
		t, otherClient, http.MethodGet, server.URL+"/api/lists", otherSession.Token, "",
	), http.StatusOK)
	if otherLists.Lists == nil || len(otherLists.Lists) != 0 {
		t.Fatalf("other user's lists = %+v, want non-nil empty slice", otherLists.Lists)
	}

	missingListPath := fmt.Sprintf("/api/lists/%d", createdList.List.Id+1000000)
	foreignOperations := []struct {
		name        string
		method      string
		foreignPath string
		missingPath string
		body        string
	}{
		{name: "read", method: http.MethodGet, foreignPath: listPath, missingPath: missingListPath},
		{
			name: "update", method: http.MethodPut, foreignPath: listPath, missingPath: missingListPath,
			body: `{"name":"Foreign rename"}`,
		},
		{
			name: "add item", method: http.MethodPut, foreignPath: listPath + "/item", missingPath: missingListPath + "/item",
			body: `{"problem_id":"9999A","position":2}`,
		},
		{
			name: "delete item", method: http.MethodDelete,
			foreignPath: listPath + "/item/" + url.PathEscape(workflowFirstProblemID),
			missingPath: missingListPath + "/item/" + url.PathEscape(workflowFirstProblemID),
		},
		{name: "delete list", method: http.MethodDelete, foreignPath: listPath, missingPath: missingListPath},
	}
	for _, operation := range foreignOperations {
		t.Run("foreign "+operation.name+" matches a nonexistent list", func(t *testing.T) {
			foreignResponse := performWorkflowRequest(
				t, otherClient, operation.method, server.URL+operation.foreignPath, otherSession.Token, operation.body,
			)
			missingResponse := performWorkflowRequest(
				t, otherClient, operation.method, server.URL+operation.missingPath, otherSession.Token, operation.body,
			)
			assertEquivalentWorkflowNotFound(t, foreignResponse, missingResponse)
		})
	}

	assertWorkflowListResponse(
		t,
		performWorkflowRequest(t, ownerClient, http.MethodGet, server.URL+listPath, ownerSession.Token, ""),
		renamedList,
		[]listitems.ListItem{firstItem, secondItem},
	)
	assertWorkflowMessage(t, performWorkflowRequest(
		t,
		ownerClient,
		http.MethodDelete,
		server.URL+listPath+"/item/"+url.PathEscape(workflowFirstProblemID),
		ownerSession.Token,
		"",
	), http.StatusOK, "Item deleted from list")
	assertWorkflowListResponse(
		t,
		performWorkflowRequest(t, ownerClient, http.MethodGet, server.URL+listPath, ownerSession.Token, ""),
		renamedList,
		[]listitems.ListItem{secondItem},
	)
	assertWorkflowMessage(t, performWorkflowRequest(
		t, ownerClient, http.MethodDelete, server.URL+listPath, ownerSession.Token, "",
	), http.StatusOK, "List deleted")
	deletedList := decodeWorkflowJSON[workflowErrorResponse](t, performWorkflowRequest(
		t, ownerClient, http.MethodGet, server.URL+listPath, ownerSession.Token, "",
	), http.StatusNotFound)
	if deletedList.Error != "List does not exist" {
		t.Fatalf("deleted-list error = %q, want %q", deletedList.Error, "List does not exist")
	}

	if !slices.Equal(githubProvider.AuthenticationCodes, []string{workflowOwnerCode, workflowOtherUserCode}) {
		t.Fatalf("GitHub authentication codes = %v, want owner and other-user codes", githubProvider.AuthenticationCodes)
	}
	if len(githubProvider.AuthorizationStates) != 2 {
		t.Fatalf("GitHub authorization calls = %d, want 2", len(githubProvider.AuthorizationStates))
	}
	if len(codeforcesProvider.VerificationHandles) != 0 {
		t.Fatalf("Codeforces provider calls = %d, want 0", len(codeforcesProvider.VerificationHandles))
	}
}

func authenticateWorkflowUser(
	t *testing.T,
	client *http.Client,
	serverURL string,
	code string,
	expectedGitHubUser auth.GitHubUser,
) workflowResponseBody {
	t.Helper()
	loginResponse := performWorkflowRequest(
		t, client, http.MethodGet, serverURL+"/api/auth/github/login", "", "",
	)
	if loginResponse.status != http.StatusTemporaryRedirect {
		t.Fatalf("GitHub login status = %d, want %d; body = %s", loginResponse.status, http.StatusTemporaryRedirect, loginResponse.body)
	}
	authorizationURL, err := url.Parse(loginResponse.header.Get("Location"))
	if err != nil {
		t.Fatalf("parse GitHub authorization URL: %v", err)
	}
	state := authorizationURL.Query().Get("state")
	if state == "" {
		t.Fatal("GitHub authorization state is empty")
	}

	callbackURL, err := url.Parse(serverURL + "/api/auth/github/callback")
	if err != nil {
		t.Fatalf("parse callback URL: %v", err)
	}
	query := callbackURL.Query()
	query.Set("code", code)
	query.Set("state", state)
	callbackURL.RawQuery = query.Encode()
	callback := decodeWorkflowJSON[workflowResponseBody](t, performWorkflowRequest(
		t, client, http.MethodGet, callbackURL.String(), "", "",
	), http.StatusOK)
	expectedUser := users.User{
		GithubID:       expectedGitHubUser.ID,
		GithubUserName: expectedGitHubUser.Login,
		Email:          expectedGitHubUser.Email,
		AvatarURL:      expectedGitHubUser.AvatarURL,
	}
	if callback.Token == "" || callback.User.ID == 0 {
		t.Fatalf("GitHub callback response = %+v, want populated user and token", callback)
	}
	expectedUser.ID = callback.User.ID
	if callback.User != expectedUser {
		t.Fatalf("GitHub callback user = %+v, want %+v", callback.User, expectedUser)
	}
	return callback
}

func addWorkflowItem(
	t *testing.T,
	client *http.Client,
	serverURL string,
	token string,
	listID int64,
	problemID string,
	position int,
) listitems.ListItem {
	t.Helper()
	response := decodeWorkflowJSON[workflowResponseBody](t, performWorkflowRequest(
		t,
		client,
		http.MethodPut,
		fmt.Sprintf("%s/api/lists/%d/item", serverURL, listID),
		token,
		fmt.Sprintf(`{"problem_id":%q,"position":%d}`, problemID, position),
	), http.StatusCreated)
	expectedItem := listitems.ListItem{ListId: listID, ProblemId: problemID, Position: position, CreatedAt: response.Item.CreatedAt}
	if response.Message != "Successfully added item to list" || response.Item != expectedItem || response.Item.CreatedAt.IsZero() {
		t.Fatalf("add-item response = %+v, want item %+v", response, expectedItem)
	}
	return response.Item
}

func assertWorkflowListResponse(
	t *testing.T,
	response workflowResponse,
	expectedList lists.List,
	expectedItems []listitems.ListItem,
) {
	t.Helper()
	body := decodeWorkflowJSON[workflowResponseBody](t, response, http.StatusOK)
	if body.Message != "List fetched successfully" || body.List != expectedList {
		t.Fatalf("get-list response = %+v, want list %+v", body, expectedList)
	}
	actualItems := slices.Clone(body.Items)
	expectedItems = slices.Clone(expectedItems)
	sortItems := func(items []listitems.ListItem) {
		slices.SortFunc(items, func(left listitems.ListItem, right listitems.ListItem) int {
			return strings.Compare(left.ProblemId, right.ProblemId)
		})
	}
	sortItems(actualItems)
	sortItems(expectedItems)
	if !slices.Equal(actualItems, expectedItems) {
		t.Fatalf("list items = %+v, want %+v", actualItems, expectedItems)
	}
}

func assertWorkflowMessage(t *testing.T, response workflowResponse, expectedStatus int, expectedMessage string) {
	t.Helper()
	body := decodeWorkflowJSON[workflowResponseBody](t, response, expectedStatus)
	if body.Message != expectedMessage {
		t.Fatalf("response message = %q, want %q", body.Message, expectedMessage)
	}
}

func assertEquivalentWorkflowNotFound(t *testing.T, foreignResponse workflowResponse, missingResponse workflowResponse) {
	t.Helper()
	foreignBody := decodeWorkflowJSON[workflowErrorResponse](t, foreignResponse, http.StatusNotFound)
	missingBody := decodeWorkflowJSON[workflowErrorResponse](t, missingResponse, http.StatusNotFound)
	if foreignBody != missingBody || foreignBody.Error != "List does not exist" {
		t.Fatalf("foreign response = %+v, nonexistent response = %+v", foreignBody, missingBody)
	}
}

func newWorkflowHTTPClient(t *testing.T) *http.Client {
	t.Helper()
	jar, err := cookiejar.New(nil)
	if err != nil {
		t.Fatalf("create cookie jar: %v", err)
	}
	return &http.Client{
		Jar:     jar,
		Timeout: 5 * time.Second,
		CheckRedirect: func(_ *http.Request, _ []*http.Request) error {
			return http.ErrUseLastResponse
		},
	}
}

func performWorkflowRequest(
	t *testing.T,
	client *http.Client,
	method string,
	endpoint string,
	token string,
	body string,
) workflowResponse {
	t.Helper()
	request, err := http.NewRequest(method, endpoint, strings.NewReader(body))
	if err != nil {
		t.Fatalf("create %s %s request: %v", method, endpoint, err)
	}
	if body != "" {
		request.Header.Set("Content-Type", "application/json")
	}
	if token != "" {
		request.Header.Set("Authorization", "Bearer "+token)
	}
	response, err := client.Do(request)
	if err != nil {
		t.Fatalf("perform %s %s request: %v", method, endpoint, err)
	}
	responseBody, err := io.ReadAll(response.Body)
	if err != nil {
		response.Body.Close()
		t.Fatalf("read %s %s response: %v", method, endpoint, err)
	}
	if err := response.Body.Close(); err != nil {
		t.Fatalf("close %s %s response: %v", method, endpoint, err)
	}
	return workflowResponse{status: response.StatusCode, header: response.Header.Clone(), body: responseBody}
}

func decodeWorkflowJSON[Response any](t *testing.T, response workflowResponse, expectedStatus int) Response {
	t.Helper()
	if response.status != expectedStatus {
		t.Fatalf("response status = %d, want %d; body = %s", response.status, expectedStatus, response.body)
	}
	var body Response
	if err := json.Unmarshal(response.body, &body); err != nil {
		t.Fatalf("decode response body %q: %v", response.body, err)
	}
	return body
}
