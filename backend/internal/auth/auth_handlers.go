package auth

import (
	"crypto/rand"
	"crypto/subtle"
	"encoding/base64"
	"errors"
	"log"
	"net/http"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/mbashem/cftracker/backend/internal/users"
	"github.com/mbashem/cftracker/backend/internal/utils"
)

type API_MESSAGE string

const (
	failedToExchangeToken      API_MESSAGE = "Failed to exchange token"
	failedToGetUserInfo        API_MESSAGE = "Failed to get user info"
	githubUserRequestFailed    API_MESSAGE = "GitHub user request failed"
	failedToDecodeUserInfo     API_MESSAGE = "Failed to decode user info"
	failedToSaveUser           API_MESSAGE = "Failed to save user"
	failedToLoadUser           API_MESSAGE = "Failed to load user"
	failedToUpdateUser         API_MESSAGE = "Failed to update user"
	failedToGenerateToken      API_MESSAGE = "Failed to generate token"
	failedToInitializeGitHub   API_MESSAGE = "Failed to initialize GitHub login"
	invalidGitHubOAuthState    API_MESSAGE = "Invalid GitHub OAuth state"
	githubOAuthStateCookieName             = "cftracker_github_oauth_state"
	githubOAuthStateLength                 = 32
	githubOAuthStateMaxAge                 = 10 * 60
)

type AuthHandler struct {
	githubProvider GitHubProvider
	userRepository users.AuthUserRepository
	generateState  func() (string, error)
	generateToken  func(email string, userID int64) (string, error)
}

func NewAuthHandler(githubProvider GitHubProvider, userRepository users.AuthUserRepository) *AuthHandler {
	return &AuthHandler{
		githubProvider: githubProvider,
		userRepository: userRepository,
		generateState:  generateGitHubOAuthState,
		generateToken:  utils.GenerateToken,
	}
}

func (handler *AuthHandler) GitHubLogin(context *gin.Context) {
	state, err := handler.generateState()
	if err != nil {
		context.JSON(http.StatusInternalServerError, gin.H{"error": failedToInitializeGitHub})
		return
	}

	setGitHubOAuthStateCookie(context, state)
	url := handler.githubProvider.AuthorizationURL(state)
	context.Redirect(http.StatusTemporaryRedirect, url)
}

func (handler *AuthHandler) GitHubCallback(context *gin.Context) {
	if !consumeGitHubOAuthState(context) {
		context.JSON(http.StatusBadRequest, gin.H{"error": invalidGitHubOAuthState})
		return
	}

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

	jwtToken, err := handler.generateToken(githubUser.Email, user.ID)
	if err != nil {
		context.JSON(http.StatusInternalServerError, gin.H{"error": failedToGenerateToken})
		return
	}

	context.JSON(http.StatusOK, gin.H{"user": user, "token": jwtToken})
}

func generateGitHubOAuthState() (string, error) {
	state := make([]byte, githubOAuthStateLength)
	if _, err := rand.Read(state); err != nil {
		return "", err
	}
	return base64.RawURLEncoding.EncodeToString(state), nil
}

func consumeGitHubOAuthState(context *gin.Context) bool {
	storedState, err := context.Cookie(githubOAuthStateCookieName)
	providedState := context.Query("state")
	if err != nil || storedState == "" || providedState == "" ||
		subtle.ConstantTimeCompare([]byte(storedState), []byte(providedState)) != 1 {
		return false
	}
	deleteGitHubOAuthStateCookie(context)
	return true
}

func setGitHubOAuthStateCookie(context *gin.Context, state string) {
	writeGitHubOAuthStateCookie(context, state, githubOAuthStateMaxAge)
}

func deleteGitHubOAuthStateCookie(context *gin.Context) {
	writeGitHubOAuthStateCookie(context, "", -1)
}

func writeGitHubOAuthStateCookie(context *gin.Context, value string, maxAge int) {
	secure := requestUsesHTTPS(context.Request)
	sameSite := http.SameSiteLaxMode
	if secure {
		sameSite = http.SameSiteNoneMode
	}
	cookie := &http.Cookie{
		Name:     githubOAuthStateCookieName,
		Value:    value,
		Path:     "/",
		MaxAge:   maxAge,
		HttpOnly: true,
		Secure:   secure,
		SameSite: sameSite,
	}
	if maxAge < 0 {
		cookie.Expires = time.Unix(1, 0)
	}
	http.SetCookie(context.Writer, cookie)
}

func requestUsesHTTPS(request *http.Request) bool {
	return request.TLS != nil || strings.EqualFold(request.Header.Get("X-Forwarded-Proto"), "https")
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
