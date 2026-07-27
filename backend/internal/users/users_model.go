package users

type User struct {
	ID             int64  `json:"id"`
	GithubID       int64  `json:"github_id"`
	GithubUserName string `json:"github_username"`
	Email          string `json:"email"`
	AvatarURL      string `json:"avatar_url"`
	CFHandle       string `json:"cf_handle"`
	CFVerified     bool   `json:"cf_verified"`
	Admin          bool   `json:"admin"`
}
