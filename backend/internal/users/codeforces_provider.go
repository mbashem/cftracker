package users

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"net/url"
	"strings"
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
	GetCurrentHandle(context.Context, string) (string, error)
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
	user, err := client.getUserInfo(ctx, handle, false)
	if err != nil {
		return "", err
	}
	if !strings.EqualFold(user.Handle, handle) {
		return "", ErrCodeforcesInvalidResponse
	}
	return user.VerificationValue, nil
}

// GetCurrentHandle resolves an already verified account through handle history.
func (client *CodeforcesClient) GetCurrentHandle(ctx context.Context, handle string) (string, error) {
	user, err := client.getUserInfo(ctx, handle, true)
	if err != nil {
		return "", err
	}
	return user.Handle, nil
}

type codeforcesUserInfo struct {
	Handle            string `json:"handle"`
	VerificationValue string `json:"firstName"`
}

func (client *CodeforcesClient) getUserInfo(ctx context.Context, handle string, historic bool) (codeforcesUserInfo, error) {
	providerContext, cancel := context.WithTimeout(ctx, client.timeout)
	defer cancel()
	request, err := http.NewRequestWithContext(providerContext, http.MethodGet,
		codeforcesUserInfoURL+url.QueryEscape(handle)+"&checkHistoricHandles="+fmt.Sprint(historic), nil)
	if err != nil {
		return codeforcesUserInfo{}, fmt.Errorf("%w: %w", ErrCodeforcesRequestCreation, err)
	}
	request.Header.Add("Content-Type", "application/json")
	response, err := client.httpClient.Do(request)
	if err != nil {
		return codeforcesUserInfo{}, fmt.Errorf("%w: %w", ErrCodeforcesRequest, err)
	}
	defer response.Body.Close()
	if response.StatusCode != http.StatusOK {
		return codeforcesUserInfo{}, fmt.Errorf("%w: status %d", ErrCodeforcesRejectedResponse, response.StatusCode)
	}
	var payload struct {
		Status string               `json:"status"`
		Result []codeforcesUserInfo `json:"result"`
	}
	if err := json.NewDecoder(response.Body).Decode(&payload); err != nil {
		return codeforcesUserInfo{}, fmt.Errorf("%w: %w", ErrCodeforcesInvalidResponse, err)
	}
	if payload.Status != "OK" {
		return codeforcesUserInfo{}, ErrCodeforcesInvalidResponse
	}
	if len(payload.Result) == 0 {
		return codeforcesUserInfo{}, ErrCodeforcesUserNotFound
	}
	if len(payload.Result) != 1 || payload.Result[0].Handle == "" {
		return codeforcesUserInfo{}, ErrCodeforcesInvalidResponse
	}
	return payload.Result[0], nil
}
