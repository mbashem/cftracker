package users

import (
	"sync"
	"time"
)

type VerificationTokenStore struct {
	mu       sync.Mutex
	tokens   map[int64]string
	expiries map[int64]time.Time
}

var tokenStore = VerificationTokenStore{
	tokens:   make(map[int64]string),
	expiries: make(map[int64]time.Time),
}

// SetToken stores a token for a user with an expiration time
func (store *VerificationTokenStore) SetToken(userID int64, token string, duration time.Duration) {
	store.mu.Lock()
	defer store.mu.Unlock()

	store.tokens[userID] = token
	store.expiries[userID] = time.Now().Add(duration)
}

// GetToken retrieves the token for a user
func (store *VerificationTokenStore) GetToken(userID int64) (string, bool) {
	store.mu.Lock()
	defer store.mu.Unlock()

	token, exists := store.tokens[userID]
	if !exists {
		return "", false
	}

	if time.Now().After(store.expiries[userID]) {
		delete(store.tokens, userID)
		delete(store.expiries, userID)
		return "", false
	}

	return token, true
}

// DeleteToken removes the token for a user
func (store *VerificationTokenStore) DeleteToken(userID int64) {
	store.mu.Lock()
	defer store.mu.Unlock()

	delete(store.tokens, userID)
	delete(store.expiries, userID)
}