package users

import (
	"encoding/json"
	"errors"
	"log"
	"net/http"
	"net/url"
	"time"

	"github.com/gin-gonic/gin"
	gonanoid "github.com/matoous/go-nanoid/v2"
	"github.com/mbashem/cftracker/backend/internal/middlewares"
)

type httpClient interface {
	Do(request *http.Request) (*http.Response, error)
}

type API_MESSAGE string

const (
	invalidRequest                  API_MESSAGE = "Invalid request"
	failedToUpdateCFHandle          API_MESSAGE = "Failed to update CF Handle"
	cfHandleUpdated                 API_MESSAGE = "CF Handle updated"
	userAlreadyVerified             API_MESSAGE = "User is already verified"
	failedToGenerateToken           API_MESSAGE = "Failed to generate token"
	failedToCreateCodeforcesRequest API_MESSAGE = "Failed to make request object"
	failedToCallCodeforces          API_MESSAGE = "Failed to make request to CF"
	codeforcesRequestFailed         API_MESSAGE = "Codeforces request failed"
	failedToParseCodeforcesResponse API_MESSAGE = "Error parsing CF response"
	codeforcesUserNotFound          API_MESSAGE = "Codeforces user not found"
	invalidVerificationToken        API_MESSAGE = "Invalid token"
	failedToVerifyUser              API_MESSAGE = "Failed to verify user. Please try again later!"
	userVerified                    API_MESSAGE = "User verified"
	userNotFound                    API_MESSAGE = "User not found"
	failedToLoadUser                API_MESSAGE = "Failed to load user"
)

type API struct {
	userRepository UserRepository
	tokens         *VerificationTokenStore
	httpClient     httpClient
	generateToken  func(int) (string, error)
}

func NewAPI(userRepository UserRepository, tokens *VerificationTokenStore, client httpClient) *API {
	if tokens == nil {
		tokens = NewVerificationTokenStore()
	}
	if client == nil {
		client = http.DefaultClient
	}

	return &API{
		userRepository: userRepository,
		tokens:         tokens,
		httpClient:     client,
		generateToken: func(length int) (string, error) {
			return gonanoid.New(length)
		},
	}
}

func (api *API) GetProfile(context *gin.Context) {
	user, err := api.userRepository.FindByID(context.GetInt64(middlewares.UserIdKey))
	if err != nil {
		writeUserReadError(context, err)
		return
	}

	context.JSON(http.StatusOK, gin.H{"user": user})
}

func (api *API) UpdateCFHandle(context *gin.Context) {
	var request struct {
		CFHandle string `json:"cf_handle"`
	}
	if err := context.ShouldBindJSON(&request); err != nil {
		context.JSON(http.StatusBadRequest, gin.H{"error": invalidRequest})
		return
	}

	user, err := api.userRepository.FindByID(context.GetInt64(middlewares.UserIdKey))
	if err != nil {
		writeUserReadError(context, err)
		return
	}

	if err := api.userRepository.UpdateCFHandle(user, request.CFHandle); err != nil {
		context.JSON(http.StatusInternalServerError, gin.H{"error": failedToUpdateCFHandle})
		return
	}

	context.JSON(http.StatusOK, gin.H{"message": cfHandleUpdated})
}

func (api *API) GetCFVerificationToken(context *gin.Context) {
	id := context.GetInt64(middlewares.UserIdKey)
	user, err := api.userRepository.FindByID(id)
	if err != nil {
		writeUserReadError(context, err)
		return
	}

	if user.CFVerified {
		context.JSON(http.StatusBadRequest, gin.H{"error": userAlreadyVerified})
		return
	}

	token, found := api.tokens.GetToken(id)
	if !found {
		token, err = api.generateToken(9)
		if err != nil {
			context.JSON(http.StatusInternalServerError, gin.H{"error": failedToGenerateToken})
			return
		}
		api.tokens.SetToken(id, token, time.Hour)
	}

	context.JSON(http.StatusOK, gin.H{"token": token})
}

func (api *API) VerifyCFVerificationToken(context *gin.Context) {
	id := context.GetInt64(middlewares.UserIdKey)
	user, err := api.userRepository.FindByID(id)
	if err != nil {
		writeUserReadError(context, err)
		return
	}

	if user.CFVerified {
		context.JSON(http.StatusBadRequest, gin.H{"error": userAlreadyVerified})
		return
	}

	request, err := http.NewRequestWithContext(
		context.Request.Context(),
		http.MethodGet,
		"https://codeforces.com/api/user.info?handles="+url.QueryEscape(user.CFHandle),
		nil,
	)
	if err != nil {
		context.JSON(http.StatusInternalServerError, gin.H{"error": failedToCreateCodeforcesRequest})
		return
	}
	request.Header.Add("Content-Type", "application/json")

	response, err := api.httpClient.Do(request)
	if err != nil {
		log.Printf("Codeforces verification request failed: %v", err)
		context.JSON(http.StatusInternalServerError, gin.H{"error": failedToCallCodeforces})
		return
	}
	defer response.Body.Close()

	if response.StatusCode != http.StatusOK {
		context.JSON(http.StatusBadGateway, gin.H{"error": codeforcesRequestFailed})
		return
	}

	var payload struct {
		Result []struct {
			Token string `json:"firstName"`
		} `json:"result"`
	}
	if err := json.NewDecoder(response.Body).Decode(&payload); err != nil {
		context.JSON(http.StatusBadGateway, gin.H{"error": failedToParseCodeforcesResponse})
		return
	}
	if len(payload.Result) == 0 {
		context.JSON(http.StatusBadRequest, gin.H{"error": codeforcesUserNotFound})
		return
	}

	storedToken, found := api.tokens.GetToken(id)
	if !found || storedToken != payload.Result[0].Token {
		context.JSON(http.StatusBadRequest, gin.H{"error": invalidVerificationToken})
		return
	}

	if err := api.userRepository.UpdateCFVerified(user, true); err != nil {
		context.JSON(http.StatusInternalServerError, gin.H{"error": failedToVerifyUser})
		return
	}

	api.tokens.DeleteToken(id)
	context.JSON(http.StatusOK, gin.H{"message": userVerified})
}

func writeUserReadError(context *gin.Context, err error) {
	if errors.Is(err, ErrUserNotFound) {
		context.JSON(http.StatusNotFound, gin.H{"error": userNotFound})
		return
	}
	context.JSON(http.StatusInternalServerError, gin.H{"error": failedToLoadUser})
}
