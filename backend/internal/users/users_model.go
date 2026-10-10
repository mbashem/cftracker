package users

import "strings"

type User struct {
	ID               int64  `json:"id"`
	GithubID         int64  `json:"github_id"`
	GithubUserName   string `json:"github_username"`
	Email            string `json:"email"`
	AvatarURL        string `json:"avatar_url"`
	CFHandle         string `json:"cf_handle"`
	CFVerifiedHandle string `json:"cf_verified_handle"`
	Admin            bool   `json:"admin"`
}

func (user User) IsCFVerified() bool {
	return user.CFHandle != "" && strings.EqualFold(user.CFHandle, user.CFVerifiedHandle)
}
