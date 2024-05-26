package auth

import (
	"context"
	"encoding/json"
	"log"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/mbashem/cftracker/backend/internal/users"
	"github.com/mbashem/cftracker/backend/internal/utils"
	"golang.org/x/oauth2"
)

type AuthHandler struct {
	oauthConf *oauth2.Config
}

type GithubUser struct {
	ID        int64  `json:"id"`
	Login     string `json:"login"`
	Email     string `json:"email"`
	AvatarURL string `json:"avatar_url"`
}

func NewAuthHandler(oauthConf *oauth2.Config) *AuthHandler {
	return &AuthHandler{oauthConf: oauthConf}
}

func (h *AuthHandler) GitHubLogin(ginContext *gin.Context) {
	url := h.oauthConf.AuthCodeURL("state", oauth2.AccessTypeOffline)
	ginContext.Redirect(http.StatusTemporaryRedirect, url)
}

func (h *AuthHandler) GitHubCallback(ginContext *gin.Context) {
	code := ginContext.Query("code")

	token, err := h.oauthConf.Exchange(context.Background(), code)
	if err != nil {
		ginContext.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to exchange token"})
		return
	}

	client := h.oauthConf.Client(context.Background(), token)
	resp, err := client.Get("https://api.github.com/user")
	if err != nil {
		ginContext.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get user info"})
		return
	}
	defer resp.Body.Close()

	var data GithubUser

	err = json.NewDecoder(resp.Body).Decode(&data)
	if err != nil {
		ginContext.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to decode user info"})
		return
	}

	user, err := users.FindUserByGithubID(int64(data.ID))

	if err != nil {
		user = &users.User{
			GithubID:       int64(data.ID),
			GithubUserName: data.Login,
			Email:          data.Email,
			AvatarURL:      data.AvatarURL,
		}
		err = user.Save()
		if err != nil {
			ginContext.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to save user", "err": err})
			return
		}
	} else {
		user.GithubUserName = data.Login
		user.Email = data.Email
		user.AvatarURL = data.AvatarURL

		err = user.Update()
		if err != nil {
			ginContext.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update user"})
			return
		}
	}

	jwtToken, err := utils.GenerateToken(data.Email, user.ID)
	if err != nil {
		ginContext.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to generate token"})
		return
	}
	log.Print("User logged in: ", data)

	ginContext.JSON(http.StatusOK, gin.H{"user": user, "token": jwtToken})
}
