package utils

import (
	"crypto/rand"
	"encoding/json"
	"errors"
	"fmt"
	"math/big"
	"slices"
	"time"

	"github.com/golang-jwt/jwt/v5"
)

type tokenConfiguration struct {
	legacyKey    []byte
	activeKeyIDs []string
	keys         map[string][]byte
	lifetime     time.Duration
}

var tokenConfig tokenConfiguration

// Init installs validated signing configuration before serving any requests.
func Init(legacySecret string, lifetime time.Duration, activeKeyIDs []string, keys map[string]string) {
	config := tokenConfiguration{
		legacyKey: []byte(legacySecret), activeKeyIDs: slices.Clone(activeKeyIDs),
		keys: make(map[string][]byte, len(keys)), lifetime: lifetime,
	}
	for id, secret := range keys {
		config.keys[id] = []byte(secret)
	}
	tokenConfig = config
}

func GenerateToken(email string, userId int64) (string, error) {
	if len(tokenConfig.activeKeyIDs) == 0 {
		return "", errors.New("no active signing keys are configured")
	}
	// Choose uniformly from active IDs; retained verification keys are excluded.
	index, err := rand.Int(rand.Reader, big.NewInt(int64(len(tokenConfig.activeKeyIDs))))
	if err != nil {
		return "", fmt.Errorf("select signing key: %w", err)
	}
	keyID := tokenConfig.activeKeyIDs[index.Int64()]
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{
		"email":  email,
		"userId": userId,
		"exp":    time.Now().Add(tokenConfig.lifetime).Unix(),
	})
	token.Header["kid"] = keyID

	key, ok := tokenConfig.keys[keyID]
	if !ok {
		return "", errors.New("active signing key is not configured")
	}
	return token.SignedString(key)
}

func VerifyToken(token string) (int64, error) {
	claims := jwt.MapClaims{}
	parsedToken, err := jwt.ParseWithClaims(token, claims, func(token *jwt.Token) (interface{}, error) {
		if token.Method != jwt.SigningMethodHS256 {
			return nil, errors.New("unexpected signing method")
		}
		keyID, present := token.Header["kid"]
		if !present {
			// Only the explicitly retained legacy secret accepts pre-rotation tokens.
			if len(tokenConfig.legacyKey) == 0 {
				return nil, errors.New("legacy signing key is not configured")
			}
			return tokenConfig.legacyKey, nil
		}
		id, ok := keyID.(string)
		if !ok || id == "" {
			return nil, errors.New("invalid signing key ID")
		}
		key, ok := tokenConfig.keys[id]
		if !ok {
			return nil, errors.New("unknown signing key ID")
		}
		return key, nil
	}, jwt.WithJSONNumber(), jwt.WithExpirationRequired())

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
