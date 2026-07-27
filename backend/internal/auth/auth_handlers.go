package auth

import (
	"encoding/json"
	"errors"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/mbashem/cftracker/backend/internal/users"
	"github.com/mbashem/cftracker/backend/internal/utils"
	"golang.org/x/oauth2"
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
	oauthConf      *oauth2.Config
	userRepository users.AuthUserRepository
}

type GithubUser struct {
	ID        int64  `json:"id"`
	Login     string `json:"login"`
	Email     string `json:"email"`
	AvatarURL string `json:"avatar_url"`
}

func NewAuthHandler(oauthConf *oauth2.Config, userRepository users.AuthUserRepository) *AuthHandler {
	return &AuthHandler{
		oauthConf:      oauthConf,
		userRepository: userRepository,
	}
}

func (handler *AuthHandler) GitHubLogin(context *gin.Context) {
	url := handler.oauthConf.AuthCodeURL("state")
	context.Redirect(http.StatusTemporaryRedirect, url)
}

func (handler *AuthHandler) GitHubCallback(context *gin.Context) {
	requestContext := context.Request.Context()
	token, err := handler.oauthConf.Exchange(requestContext, context.Query("code"))
	if err != nil {
		context.JSON(http.StatusInternalServerError, gin.H{"error": failedToExchangeToken})
		return
	}

	response, err := handler.oauthConf.Client(requestContext, token).Get("https://api.github.com/user")
	if err != nil {
		context.JSON(http.StatusInternalServerError, gin.H{"error": failedToGetUserInfo})
		return
	}
	defer response.Body.Close()

	if response.StatusCode != http.StatusOK {
		context.JSON(http.StatusBadGateway, gin.H{"error": githubUserRequestFailed})
		return
	}

	var githubUser GithubUser
	if err := json.NewDecoder(response.Body).Decode(&githubUser); err != nil {
		context.JSON(http.StatusInternalServerError, gin.H{"error": failedToDecodeUserInfo})
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
