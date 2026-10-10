package users

import (
	"strings"
	"sync"
	"time"
)

// VerificationTokenStore intentionally keeps one-hour verification tokens in
// process memory. The app currently runs as a single instance, and losing a
// pending token on restart is an accepted tradeoff. Use shared storage before
// running multiple backend instances.
type VerificationTokenStore struct {
	mu     sync.Mutex
	tokens map[verificationTokenKey]verificationToken
}

type verificationTokenKey struct {
	userID int64
	handle string
}

type verificationToken struct {
	value     string
	expiresAt time.Time
}

func NewVerificationTokenStore() *VerificationTokenStore {
	return &VerificationTokenStore{
		tokens: make(map[verificationTokenKey]verificationToken),
	}
}

// SetToken stores a proof for one user and handle with an expiration time.
func (store *VerificationTokenStore) SetToken(userID int64, handle string, token string, duration time.Duration) {
	store.mu.Lock()
	defer store.mu.Unlock()
	key := verificationTokenKey{userID, strings.ToLower(handle)}

	store.tokens[key] = verificationToken{
		value:     token,
		expiresAt: time.Now().Add(duration),
	}
}

// GetToken retrieves the proof for the selected user and handle.
func (store *VerificationTokenStore) GetToken(userID int64, handle string) (string, bool) {
	store.mu.Lock()
	defer store.mu.Unlock()
	key := verificationTokenKey{userID, strings.ToLower(handle)}

	token, exists := store.tokens[key]
	if !exists {
		return "", false
	}

	if time.Now().After(token.expiresAt) {
		delete(store.tokens, key)
		return "", false
	}

	return token.value, true
}

// DeleteToken removes only the proof for the selected user and handle.
func (store *VerificationTokenStore) DeleteToken(userID int64, handle string) {
	store.mu.Lock()
	defer store.mu.Unlock()
	key := verificationTokenKey{userID, strings.ToLower(handle)}

	delete(store.tokens, key)
}
