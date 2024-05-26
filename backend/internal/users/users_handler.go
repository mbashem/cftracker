package users

import (
	"log"
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
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
