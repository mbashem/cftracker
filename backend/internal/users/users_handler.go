package users

import (
	"encoding/json"
	"log"
	"net/http"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
	gonanoid "github.com/matoous/go-nanoid/v2"
	"github.com/mbashem/cftracker/backend/internal/middlewares"
)

func getUserByID(context *gin.Context) {
	id, err := strconv.ParseInt(context.Param("id"), 10, 64)
	if err != nil {
		context.JSON(http.StatusBadRequest, gin.H{"message": "Invalid user ID"})
		return
	}
	user, err := FindUserByID(id)

	if err != nil {
		context.JSON(404, gin.H{"error": "User not found"})
	}
	context.JSON(http.StatusOK, gin.H{"user": user})
}

func getProfile(context *gin.Context) {
	id := context.GetInt64(middlewares.UserIdKey)

	user, err := FindUserByID(id)
	if err != nil {
		context.JSON(404, gin.H{"error": "User not found"})
	}
	context.JSON(http.StatusOK, gin.H{"user": user})
}

func UpdateCFHandle(context *gin.Context) {
	id := context.GetInt64(middlewares.UserIdKey)

	var cfHandle struct {
		CFHandle string `json:"cf_handle"`
	}

	if err := context.BindJSON(&cfHandle); err != nil {
		log.Println("Error: ", err)
		context.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request"})
		return
	}

	user, err := FindUserByID(id)
	if err != nil {
		context.JSON(404, gin.H{"error": "User not found"})
		return
	}

	err = user.UpdateCFHandle(cfHandle.CFHandle)
	if err != nil {
		context.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update CF Handle"})
		return
	}

	context.JSON(http.StatusOK, gin.H{"message": "CF Handle updated"})
}

func getCFVerificationToken(context *gin.Context) {
	id := context.GetInt64(middlewares.UserIdKey)

	user, err := FindUserByID(id)
	if err != nil {
		context.JSON(404, gin.H{"error": "User not found"})
		return
	}

	if user.CFVerified {
		context.JSON(http.StatusBadRequest, gin.H{"error": "User is already verified"})
		return
	}

	token, found := tokenStore.GetToken(id)
	if !found {
		token, err = gonanoid.New(9)
		if err != nil {
			context.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to generate token"})
			return
		}
		tokenStore.SetToken(id, token, time.Hour)
	}

	context.JSON(http.StatusOK, gin.H{"token": token})
}

func verifyCFVerificationToken(context *gin.Context) {
	id := context.GetInt64(middlewares.UserIdKey)

	user, err := FindUserByID(id)
	if err != nil {
		context.JSON(404, gin.H{"error": "User not found"})
		return
	}

	if user.CFVerified {
		context.JSON(http.StatusBadRequest, gin.H{"error": "User is already verified"})
		return
	}

	req, err := http.NewRequest(http.MethodGet, "https://codeforces.com/api/user.info?handles="+user.CFHandle, nil)

	if err != nil {
		log.Println("Error: ", err)
		context.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to make request object"})
		return
	}

	req.Header.Add("Content-type", "application/json")

	client := &http.Client{}
	resp, err := client.Do(req)
	if err != nil {
		log.Println("Error: ", err)
		context.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to make request to CF"})
		return
	}
	defer resp.Body.Close()

	var response struct {
		Result []struct {
			Token string `json:"firstName"`
		} `json:"result"`
	}

	if err := json.NewDecoder(resp.Body).Decode(&response); err != nil {
		log.Println("Error: ", err)
		context.JSON(http.StatusBadRequest, gin.H{"error": "Error parsing CF response"})
		return
	}

	token := response.Result[0].Token
	log.Println("Token: ", token)

	if storedToken, found := tokenStore.GetToken(id); !found || storedToken != token {
		context.JSON(http.StatusBadRequest, gin.H{"error": "Invalid token"})
		return
	}

	err = user.UpdateCFVerified(true)
	if err != nil {
		context.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to verify user. Please try again later!"})
		return
	}

	tokenStore.DeleteToken(id)

	context.JSON(http.StatusOK, gin.H{"message": "User verified"})
}
