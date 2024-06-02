package users

import (
	"database/sql"
	"errors"

	"github.com/mbashem/cftracker/backend/internal/db"
)

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

func (user *User) Save() error {
	query := `
		INSERT INTO users (github_id, github_username, email, avatar_url, cf_handle, cf_verified)
		VALUES ($1, $2, $3, $4, $5, $6)
		RETURNING id;
	`

	err := db.DB.QueryRow(
		query,
		user.GithubID,
		user.GithubUserName,
		user.Email,
		user.AvatarURL,
		user.CFHandle,
		user.CFVerified).Scan(&user.ID)

	return err
}

// update user
func (user *User) Update() error {
	query := `
		UPDATE users
		SET github_username = $2, email = $3, avatar_url = $4
		WHERE id = $1
		RETURNING id;
	`

	err := db.DB.QueryRow(
		query,
		user.ID,
		user.GithubUserName,
		user.Email,
		user.AvatarURL).Scan(&user.ID)

	return err

}

func (user *User) UpdateCFHandle(cfHandle string) error {
	query := `
		UPDATE users
		SET cf_handle = $2, cf_verified = false
		WHERE id = $1
		RETURNING id;
	`

	err := db.DB.QueryRow(query, user.ID, cfHandle).Scan(&user.ID)
	if err == sql.ErrNoRows {
		return errors.New("user not found")
	}
	user.CFHandle = cfHandle
	return err
}

// update cf verified
func (user *User) UpdateCFVerified(cfVerified bool) error {
	query := `
		UPDATE users
		SET cf_verified = $2
		WHERE id = $1
		RETURNING id;
	`

	err := db.DB.QueryRow(query, user.ID, cfVerified).Scan(&user.ID)
	if err == sql.ErrNoRows {
		return errors.New("user not found")
	}
	user.CFVerified = cfVerified
	return err
}

// UpdateAdmin updates the admin status of a user.
func (user *User) UpdateAdmin(admin bool) error {
	query := `
		UPDATE users
		SET admin = $2
		WHERE id = $1
		RETURNING id;
	`

	err := db.DB.QueryRow(query, user.ID, admin).Scan(&user.ID)
	if err == sql.ErrNoRows {
		return errors.New("user not found")
	}
	user.Admin = admin
	return err
}

// FindUserByID retrieves a user from the database by their ID.
func FindUserByID(id int64) (*User, error) {
	query := `
		SELECT id, github_id, github_username, email, avatar_url, cf_handle, cf_verified, admin
		FROM users
		WHERE id = $1;
	`

	user := &User{}
	err := db.DB.QueryRow(query, id).Scan(&user.ID, &user.GithubID, &user.GithubUserName, &user.Email, &user.AvatarURL, &user.CFHandle, &user.CFVerified, &user.Admin)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, errors.New("user not found")
		}
		return nil, err
	}

	return user, nil
}

// FindUserByGithubID retrieves a user from the database by their GitHub ID.
func FindUserByGithubID(githubID int64) (*User, error) {
	query := `
		SELECT id, github_id, github_username, email, avatar_url, cf_handle, cf_verified, admin
		FROM users
		WHERE github_id = $1;
	`

	user := &User{}
	err := db.DB.QueryRow(query, githubID).Scan(
		&user.ID,
		&user.GithubID,
		&user.GithubUserName,
		&user.Email,
		&user.AvatarURL,
		&user.CFHandle,
		&user.CFVerified,
		&user.Admin)

	if err != nil {
		if err == sql.ErrNoRows {
			return nil, errors.New("user not found")
		}
		return nil, err
	}

	return user, nil
}

// GetAllUsers retrieves all users from the database.
func GetAllUsers() ([]User, error) {
	query := `
		SELECT id, github_id, github_username, email, avatar_url, cf_handle, cf_verified, admin
		FROM users;
	`

	rows, err := db.DB.Query(query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var users []User
	for rows.Next() {
		user := User{}
		err := rows.Scan(&user.ID, &user.GithubID, &user.GithubUserName, &user.Email, &user.AvatarURL, &user.CFHandle, &user.CFVerified, &user.Admin)
		if err != nil {
			return nil, err
		}
		users = append(users, user)
	}

	// Check for errors from iterating over rows.
	if err = rows.Err(); err != nil {
		return nil, err
	}

	return users, nil
}
