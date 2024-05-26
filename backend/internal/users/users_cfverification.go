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
func (s *VerificationTokenStore) SetToken(userID int64, token string, duration time.Duration) {
	s.mu.Lock()
	defer s.mu.Unlock()

	s.tokens[userID] = token
	s.expiries[userID] = time.Now().Add(duration)
}

// GetToken retrieves the token for a user
func (s *VerificationTokenStore) GetToken(userID int64) (string, bool) {
	s.mu.Lock()
	defer s.mu.Unlock()

	token, exists := s.tokens[userID]
	if !exists {
		return "", false
	}

	if time.Now().After(s.expiries[userID]) {
		delete(s.tokens, userID)
		delete(s.expiries, userID)
		return "", false
	}

	return token, true
}

// DeleteToken removes the token for a user
func (s *VerificationTokenStore) DeleteToken(userID int64) {
	s.mu.Lock()
	defer s.mu.Unlock()

	delete(s.tokens, userID)
	delete(s.expiries, userID)
}