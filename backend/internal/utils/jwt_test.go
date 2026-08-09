package utils

import (
	"strings"
	"testing"
	"time"

	"github.com/golang-jwt/jwt/v5"
)

const (
	testJWTSecret      = "test-secret-with-enough-bytes-for-jwt"
	otherTestJWTSecret = "other-secret-with-enough-bytes-for-jwt"
)

func TestGenerateAndVerifyToken(t *testing.T) {
	Init(testJWTSecret)

	const (
		email  = "user@example.com"
		userID = int64(42)
	)
	token, err := GenerateToken(email, userID)
	if err != nil {
		t.Fatalf("GenerateToken() error = %v", err)
	}

	gotUserID, err := VerifyToken(token)
	if err != nil {
		t.Fatalf("VerifyToken() error = %v", err)
	}
	if gotUserID != userID {
		t.Fatalf("VerifyToken() userID = %d, want %d", gotUserID, userID)
	}

	claims := jwt.MapClaims{}
	parsedToken, err := jwt.ParseWithClaims(token, claims, func(token *jwt.Token) (interface{}, error) {
		return []byte(testJWTSecret), nil
	})
	if err != nil {
		t.Fatalf("ParseWithClaims() error = %v", err)
	}
	if parsedToken.Method != jwt.SigningMethodHS256 {
		t.Fatalf("token method = %v, want %v", parsedToken.Method, jwt.SigningMethodHS256)
	}
	if claims["email"] != email {
		t.Fatalf("email claim = %v, want %s", claims["email"], email)
	}
	if claims["userId"] != float64(userID) {
		t.Fatalf("userId claim = %v, want %d", claims["userId"], userID)
	}

	exp, ok := claims["exp"].(float64)
	if !ok {
		t.Fatalf("exp claim type = %T, want float64", claims["exp"])
	}
	expiresAt := time.Unix(int64(exp), 0)
	minExpectedExpiry := time.Now().Add(119 * time.Minute)
	maxExpectedExpiry := time.Now().Add(121 * time.Minute)
	if expiresAt.Before(minExpectedExpiry) || expiresAt.After(maxExpectedExpiry) {
		t.Fatalf("exp claim = %s, want roughly two hours from now", expiresAt)
	}
}

func TestVerifyTokenRejectsInvalidSignature(t *testing.T) {
	token := signTestToken(t, testJWTSecret, jwt.SigningMethodHS256, jwt.MapClaims{
		"userId": int64(42),
		"exp":    time.Now().Add(time.Hour).Unix(),
	})

	Init(otherTestJWTSecret)
	if _, err := VerifyToken(token); err == nil {
		t.Fatal("VerifyToken() error = nil, want invalid signature error")
	}
}

func TestVerifyTokenRejectsExpiredToken(t *testing.T) {
	Init(testJWTSecret)
	token := signTestToken(t, testJWTSecret, jwt.SigningMethodHS256, jwt.MapClaims{
		"userId": int64(42),
		"exp":    time.Now().Add(-time.Hour).Unix(),
	})

	if _, err := VerifyToken(token); err == nil {
		t.Fatal("VerifyToken() error = nil, want expired token error")
	}
}

func TestVerifyTokenRejectsUnsupportedSigningMethod(t *testing.T) {
	Init(testJWTSecret)
	token := signTestToken(t, testJWTSecret, jwt.SigningMethodHS512, jwt.MapClaims{
		"userId": int64(42),
		"exp":    time.Now().Add(time.Hour).Unix(),
	})

	if _, err := VerifyToken(token); err == nil {
		t.Fatal("VerifyToken() error = nil, want unsupported signing method error")
	}
}

func TestVerifyTokenRejectsInvalidUserIDClaims(t *testing.T) {
	Init(testJWTSecret)

	testCases := []struct {
		name   string
		claims jwt.MapClaims
	}{
		{
			name: "missing userId claim is rejected",
			claims: jwt.MapClaims{
				"exp": time.Now().Add(time.Hour).Unix(),
			},
		},
		{
			name: "string userId claim is rejected",
			claims: jwt.MapClaims{
				"userId": "42",
				"exp":    time.Now().Add(time.Hour).Unix(),
			},
		},
		{
			name: "boolean userId claim is rejected",
			claims: jwt.MapClaims{
				"userId": true,
				"exp":    time.Now().Add(time.Hour).Unix(),
			},
		},
		{
			name: "null userId claim is rejected",
			claims: jwt.MapClaims{
				"userId": nil,
				"exp":    time.Now().Add(time.Hour).Unix(),
			},
		},
		{
			name: "fractional userId claim is rejected",
			claims: jwt.MapClaims{
				"userId": 42.5,
				"exp":    time.Now().Add(time.Hour).Unix(),
			},
		},
	}

	for _, testCase := range testCases {
		t.Run(testCase.name, func(t *testing.T) {
			token := signTestToken(t, testJWTSecret, jwt.SigningMethodHS256, testCase.claims)

			_, err := VerifyToken(token)
			if err == nil {
				t.Fatal("VerifyToken() error = nil, want invalid userId claim error")
			}
			if !strings.Contains(err.Error(), "invalid userId claim") {
				t.Fatalf("VerifyToken() error = %v, want invalid userId claim", err)
			}
		})
	}
}

func signTestToken(t *testing.T, secret string, method jwt.SigningMethod, claims jwt.MapClaims) string {
	t.Helper()

	token, err := jwt.NewWithClaims(method, claims).SignedString([]byte(secret))
	if err != nil {
		t.Fatalf("SignedString() error = %v", err)
	}
	return token
}
