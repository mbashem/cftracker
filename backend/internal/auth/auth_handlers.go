package auth

import (
	"errors"
	"log"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/mbashem/cftracker/backend/internal/users"
	"github.com/mbashem/cftracker/backend/internal/utils"
)

type API_MESSAGE string

const (
	failedToExchangeToken   API_MESSAGE = "Failed to exchange token"
	failedToGetUserInfo     API_MESSAGE = "Failed to get user info"
	githubUserRequestFailed API_MESSAGE = "GitHub user request failed"
	failedToDecodeUserInfo  API_MESSAGE = "Failed to decode user info"
	failedToSaveUser        API_MESSAGE = "Failed to save user"
	failedToLoadUser        API_MESSAGE = "Failed to load user"
	failedToUpdateUser      API_MESSAGE = "Failed to update user"
	failedToGenerateToken   API_MESSAGE = "Failed to generate token"
)

type AuthHandler struct {
	githubProvider GitHubProvider
	userRepository users.AuthUserRepository
}

func NewAuthHandler(githubProvider GitHubProvider, userRepository users.AuthUserRepository) *AuthHandler {
	return &AuthHandler{
		githubProvider: githubProvider,
		userRepository: userRepository,
	}
}

func (handler *AuthHandler) GitHubLogin(context *gin.Context) {
	url := handler.githubProvider.AuthorizationURL("state")
	context.Redirect(http.StatusTemporaryRedirect, url)
}

func (handler *AuthHandler) GitHubCallback(context *gin.Context) {
	githubUser, err := handler.githubProvider.Authenticate(context.Request.Context(), context.Query("code"))
	if err != nil {
		writeGitHubProviderError(context, err)
		return
	}

	user, err := handler.userRepository.FindByGitHubID(githubUser.ID)
	switch {
	case errors.Is(err, users.ErrUserNotFound):
		user = &users.User{
			GithubID:       githubUser.ID,
			GithubUserName: githubUser.Login,
			Email:          githubUser.Email,
			AvatarURL:      githubUser.AvatarURL,
		}
		if err := handler.userRepository.Save(user); err != nil {
			context.JSON(http.StatusInternalServerError, gin.H{"error": failedToSaveUser})
			return
		}
	case err != nil:
		context.JSON(http.StatusInternalServerError, gin.H{"error": failedToLoadUser})
		return
	default:
		user.GithubUserName = githubUser.Login
		user.Email = githubUser.Email
		user.AvatarURL = githubUser.AvatarURL
		if err := handler.userRepository.Update(user); err != nil {
			context.JSON(http.StatusInternalServerError, gin.H{"error": failedToUpdateUser})
			return
		}
	}

	jwtToken, err := utils.GenerateToken(githubUser.Email, user.ID)
	if err != nil {
		context.JSON(http.StatusInternalServerError, gin.H{"error": failedToGenerateToken})
		return
	}

	context.JSON(http.StatusOK, gin.H{"user": user, "token": jwtToken})
}

func writeGitHubProviderError(context *gin.Context, err error) {
	log.Printf("GitHub provider failed: %v", err)

	switch {
	case errors.Is(err, ErrGitHubTokenExchange):
		context.JSON(http.StatusInternalServerError, gin.H{"error": failedToExchangeToken})
	case errors.Is(err, ErrGitHubUserRequest):
		context.JSON(http.StatusInternalServerError, gin.H{"error": failedToGetUserInfo})
	case errors.Is(err, ErrGitHubRejectedResponse):
		context.JSON(http.StatusBadGateway, gin.H{"error": githubUserRequestFailed})
	case errors.Is(err, ErrGitHubInvalidResponse):
		context.JSON(http.StatusInternalServerError, gin.H{"error": failedToDecodeUserInfo})
	default:
		context.JSON(http.StatusInternalServerError, gin.H{"error": failedToGetUserInfo})
	}
}
