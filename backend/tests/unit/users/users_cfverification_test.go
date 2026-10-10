package users

import (
	"fmt"
	"sync"
	"testing"
	"time"
)

const (
	testVerificationUserID          = int64(1)
	testVerificationOtherUserID     = int64(2)
	testVerificationMissingUserID   = int64(100)
	testVerificationValidDuration   = time.Hour
	testVerificationExpiredDuration = -time.Second
	testVerificationWorkerCount     = 20
	testVerificationUserCount       = 5
	testVerificationIterationCount  = 100
	testVerificationDeleteEvery     = 10
)

func TestVerificationTokenStoreSetGetReplaceAndDelete(t *testing.T) {
	store := NewVerificationTokenStore()
	firstToken := "first-token"
	replacementToken := "replacement-token"
	otherUserToken := "other-user-token"

	if token, found := store.GetToken(testVerificationUserID); found || token != "" {
		t.Fatalf("GetToken() = %q, %v; want empty token and false", token, found)
	}

	store.SetToken(testVerificationUserID, firstToken, testVerificationValidDuration)
	if token, found := store.GetToken(testVerificationUserID); !found || token != firstToken {
		t.Fatalf("GetToken() = %q, %v; want %s and true", token, found, firstToken)
	}

	store.SetToken(testVerificationUserID, replacementToken, testVerificationValidDuration)
	if token, found := store.GetToken(testVerificationUserID); !found || token != replacementToken {
		t.Fatalf("GetToken() = %q, %v; want %s and true", token, found, replacementToken)
	}

	store.SetToken(testVerificationOtherUserID, otherUserToken, testVerificationValidDuration)
	if token, found := store.GetToken(testVerificationOtherUserID); !found || token != otherUserToken {
		t.Fatalf("GetToken() for second user = %q, %v; want %s and true", token, found, otherUserToken)
	}

	store.DeleteToken(testVerificationUserID)
	if token, found := store.GetToken(testVerificationUserID); found || token != "" {
		t.Fatalf("GetToken() after delete = %q, %v; want empty token and false", token, found)
	}
	if token, found := store.GetToken(testVerificationOtherUserID); !found || token != otherUserToken {
		t.Fatalf("GetToken() for second user after first delete = %q, %v; want %s and true", token, found, otherUserToken)
	}

	store.DeleteToken(testVerificationMissingUserID)
}

func TestVerificationTokenStoreExpiresImmediately(t *testing.T) {
	store := NewVerificationTokenStore()

	store.SetToken(testVerificationUserID, "expired-token", testVerificationExpiredDuration)

	if token, found := store.GetToken(testVerificationUserID); found || token != "" {
		t.Fatalf("GetToken() = %q, %v; want expired token removed", token, found)
	}
	if token, found := store.GetToken(testVerificationUserID); found || token != "" {
		t.Fatalf("GetToken() after cleanup = %q, %v; want empty token and false", token, found)
	}
}

func TestVerificationTokenStoreConcurrentAccess(t *testing.T) {
	store := NewVerificationTokenStore()
	startSignal := make(chan struct{})
	var waitGroup sync.WaitGroup

	for workerIndex := 0; workerIndex < testVerificationWorkerCount; workerIndex++ {
		workerIndex := workerIndex
		waitGroup.Add(1)
		go func() {
			defer waitGroup.Done()
			<-startSignal

			userID := int64(workerIndex % testVerificationUserCount)
			for iterationIndex := 0; iterationIndex < testVerificationIterationCount; iterationIndex++ {
				token := fmt.Sprintf("token-%d-%d", workerIndex, iterationIndex)
				store.SetToken(userID, token, testVerificationValidDuration)
				store.GetToken(userID)
				if iterationIndex%testVerificationDeleteEvery == 0 {
					store.DeleteToken(userID)
				}
			}
		}()
	}

	close(startSignal)
	waitGroup.Wait()
}
