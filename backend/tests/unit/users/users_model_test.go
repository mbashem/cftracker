package users_test

import (
	"encoding/json"
	"testing"
)

type userVerificationPayload struct {
	VerifiedHandle string `json:"cf_verified_handle"`
}

func TestUserVerificationUsesHandles(t *testing.T) {
	for _, testCase := range []struct {
		name           string
		handle         string
		verifiedHandle string
		wantVerified   bool
	}{
		{name: "no selected or verified account"},
		{name: "selected account has no proof", handle: "tourist"},
		{name: "proof without a selected account", verifiedHandle: "tourist"},
		{name: "matching handles", handle: "tourist", verifiedHandle: "tourist", wantVerified: true},
		{name: "handles match ignoring case", handle: "TOURIST", verifiedHandle: "tourist", wantVerified: true},
		{name: "proof belongs to a different account", handle: "Petr", verifiedHandle: "tourist"},
	} {
		t.Run(testCase.name, func(t *testing.T) {
			user := newUserHandlerFixture()
			user.CFHandle = testCase.handle
			user.CFVerifiedHandle = testCase.verifiedHandle
			if got := user.IsCFVerified(); got != testCase.wantVerified {
				t.Fatalf("IsCFVerified() = %v, want %v", got, testCase.wantVerified)
			}
			encoded, err := json.Marshal(user)
			if err != nil {
				t.Fatal(err)
			}
			var payload userVerificationPayload
			if err := json.Unmarshal(encoded, &payload); err != nil {
				t.Fatal(err)
			}
			if payload.VerifiedHandle != testCase.verifiedHandle {
				t.Fatalf("API verified handle = %q, want %q", payload.VerifiedHandle, testCase.verifiedHandle)
			}
		})
	}
}
