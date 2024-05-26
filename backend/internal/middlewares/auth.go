package middlewares

import (
	"log"
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/mbashem/cftracker/backend/internal/utils"
)

const (
	UserIdKey = "userId"
)

func Authenticate(context *gin.Context) {
	token := context.Request.Header.Get("Authorization")
	log.Println("Token: ", token)
	if token == "" || !strings.Contains(token, "Bearer "){
		log.Println("No token")
		context.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"message": "Unauthorized"})
		return
	}

	token = strings.Replace(token, "Bearer ", "", 1)

	userId, err := utils.VerifyToken(token)
	if err != nil {
		log.Println(err)
		context.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"message": "Unauthorized"})
		return
	}

	context.Set(UserIdKey, userId)
	log.Println("User ID: ", userId)

	context.Next()
}
