package users

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"net/url"
	"time"
)

const codeforcesUserInfoURL = "https://codeforces.com/api/user.info?handles="

var (
	ErrCodeforcesRequestCreation  = errors.New("codeforces request creation failed")
	ErrCodeforcesRequest          = errors.New("codeforces request failed")
	ErrCodeforcesRejectedResponse = errors.New("codeforces rejected request")
	ErrCodeforcesInvalidResponse  = errors.New("codeforces returned an invalid response")
	ErrCodeforcesUserNotFound     = errors.New("codeforces user not found")
)

type CodeforcesProvider interface {
	GetVerificationValue(context.Context, string) (string, error)
}

type CodeforcesClient struct {
	httpClient *http.Client
	timeout    time.Duration
}

func NewCodeforcesClient(httpClient *http.Client, timeout time.Duration) *CodeforcesClient {
	return &CodeforcesClient{
		httpClient: httpClient,
		timeout:    timeout,
	}
}

func (client *CodeforcesClient) GetVerificationValue(ctx context.Context, handle string) (string, error) {
	providerContext, cancel := context.WithTimeout(ctx, client.timeout)
	defer cancel()

	request, err := http.NewRequestWithContext(
		providerContext,
		http.MethodGet,
		codeforcesUserInfoURL+url.QueryEscape(handle),
		nil,
	)
	if err != nil {
		return "", fmt.Errorf("%w: %w", ErrCodeforcesRequestCreation, err)
	}
	request.Header.Add("Content-Type", "application/json")

	response, err := client.httpClient.Do(request)
	if err != nil {
		return "", fmt.Errorf("%w: %w", ErrCodeforcesRequest, err)
	}
	defer response.Body.Close()

	if response.StatusCode != http.StatusOK {
		return "", fmt.Errorf("%w: status %d", ErrCodeforcesRejectedResponse, response.StatusCode)
	}

	var payload struct {
		Result []struct {
			VerificationValue string `json:"firstName"`
		} `json:"result"`
	}
	if err := json.NewDecoder(response.Body).Decode(&payload); err != nil {
		return "", fmt.Errorf("%w: %w", ErrCodeforcesInvalidResponse, err)
	}
	if len(payload.Result) == 0 {
		return "", ErrCodeforcesUserNotFound
	}

	return payload.Result[0].VerificationValue, nil
}
