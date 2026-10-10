package users_test

import (
	"fmt"
	"sync"
	"testing"
	"time"

	"github.com/mbashem/cftracker/backend/internal/users"
)

const (
	testVerificationHandle          = "tourist"
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
	store := users.NewVerificationTokenStore()
	firstToken := "first-token"
	replacementToken := "replacement-token"
	otherUserToken := "other-user-token"

	if token, found := store.GetToken(testVerificationUserID, testVerificationHandle); found || token != "" {
		t.Fatalf("GetToken() = %q, %v; want empty token and false", token, found)
	}

	store.SetToken(testVerificationUserID, testVerificationHandle, firstToken, testVerificationValidDuration)
	if token, found := store.GetToken(testVerificationUserID, testVerificationHandle); !found || token != firstToken {
		t.Fatalf("GetToken() = %q, %v; want %s and true", token, found, firstToken)
	}

	store.SetToken(testVerificationUserID, testVerificationHandle, replacementToken, testVerificationValidDuration)
	if token, found := store.GetToken(testVerificationUserID, testVerificationHandle); !found || token != replacementToken {
		t.Fatalf("GetToken() = %q, %v; want %s and true", token, found, replacementToken)
	}

	store.SetToken(testVerificationOtherUserID, testVerificationHandle, otherUserToken, testVerificationValidDuration)
	if token, found := store.GetToken(testVerificationOtherUserID, testVerificationHandle); !found || token != otherUserToken {
		t.Fatalf("GetToken() for second user = %q, %v; want %s and true", token, found, otherUserToken)
	}

	store.DeleteToken(testVerificationUserID, testVerificationHandle)
	if token, found := store.GetToken(testVerificationUserID, testVerificationHandle); found || token != "" {
		t.Fatalf("GetToken() after delete = %q, %v; want empty token and false", token, found)
	}
	if token, found := store.GetToken(testVerificationOtherUserID, testVerificationHandle); !found || token != otherUserToken {
		t.Fatalf("GetToken() for second user after first delete = %q, %v; want %s and true", token, found, otherUserToken)
	}

	store.DeleteToken(testVerificationMissingUserID, testVerificationHandle)
}

func TestVerificationTokenStoreExpiresImmediately(t *testing.T) {
	store := users.NewVerificationTokenStore()

	store.SetToken(testVerificationUserID, testVerificationHandle, "expired-token", testVerificationExpiredDuration)

	if token, found := store.GetToken(testVerificationUserID, testVerificationHandle); found || token != "" {
		t.Fatalf("GetToken() = %q, %v; want expired token removed", token, found)
	}
	if token, found := store.GetToken(testVerificationUserID, testVerificationHandle); found || token != "" {
		t.Fatalf("GetToken() after cleanup = %q, %v; want empty token and false", token, found)
	}
}

func TestVerificationTokenStoreConcurrentAccess(t *testing.T) {
	store := users.NewVerificationTokenStore()
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
				store.SetToken(userID, testVerificationHandle, token, testVerificationValidDuration)
				store.GetToken(userID, testVerificationHandle)
				if iterationIndex%testVerificationDeleteEvery == 0 {
					store.DeleteToken(userID, testVerificationHandle)
				}
			}
		}()
	}

	close(startSignal)
	waitGroup.Wait()
}

func TestVerificationTokensAreBoundToHandles(t *testing.T) {
	store := users.NewVerificationTokenStore()
	store.SetToken(testVerificationUserID, testVerificationHandle, "original-proof", time.Hour)
	if _, found := store.GetToken(testVerificationUserID, "Petr"); found {
		t.Fatal("proof leaked to a different handle")
	}
	if token, found := store.GetToken(testVerificationUserID, "TOURIST"); !found || token != "original-proof" {
		t.Fatal("handle comparison should ignore case")
	}
	store.SetToken(testVerificationUserID, "Petr", "new-proof", time.Hour)
	store.DeleteToken(testVerificationUserID, testVerificationHandle)
	if token, found := store.GetToken(testVerificationUserID, "Petr"); !found || token != "new-proof" {
		t.Fatal("deleting the old proof removed the new handle proof")
	}
}
