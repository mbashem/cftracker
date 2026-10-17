package testutil

// APIResponse encapsulates the JSON envelope used in HTTP response assertions.
// Resource fields accept package-specific models without importing those packages.
type APIResponse struct {
	Error   string `json:"error,omitempty"`
	Message string `json:"message,omitempty"`
	Token   string `json:"token,omitempty"`
	User    any    `json:"user,omitempty"`
	List    any    `json:"list,omitempty"`
	Lists   any    `json:"lists,omitempty"`
	Item    any    `json:"item,omitempty"`
	Items   any    `json:"items,omitempty"`
}
