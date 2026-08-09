package utils

import (
	"encoding/json"
	"errors"
	"fmt"
	"time"

	"github.com/golang-jwt/jwt/v5"
)

var secretKey []byte

func Init(secret string) {
	secretKey = []byte(secret)
}

func GenerateToken(email string, userId int64) (string, error) {
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{
		"email":  email,
		"userId": userId,
		"exp":    time.Now().Add(time.Hour * 2).Unix(),
	})

	return token.SignedString(secretKey)
}

func VerifyToken(token string) (int64, error) {
	claims := jwt.MapClaims{}
	parsedToken, err := jwt.ParseWithClaims(token, claims, func(token *jwt.Token) (interface{}, error) {
		if token.Method != jwt.SigningMethodHS256 {
			return nil, errors.New("unexpected signing method")
		}
		return secretKey, nil
	}, jwt.WithJSONNumber())

	if err != nil || !parsedToken.Valid {
		return 0, errors.New("could not parse token")
	}

	userId, err := parseUserIDClaim(claims["userId"])
	if err != nil {
		return 0, errors.New("invalid userId claim")
	}

	return userId, nil
}

func parseUserIDClaim(claim any) (int64, error) {
	userId, ok := claim.(json.Number)
	if !ok {
		return 0, fmt.Errorf("userId must be a JSON number")
	}

	parsedUserId, err := userId.Int64()
	if err != nil {
		return 0, fmt.Errorf("userId must be an integer: %w", err)
	}

	return parsedUserId, nil
}
