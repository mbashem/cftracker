package users

import (
	"database/sql"
	"errors"
)

type Repository struct {
	db *sql.DB
}

func NewRepository(db *sql.DB) *Repository {
	return &Repository{
		db: db,
	}
}

func (repository *Repository) Save(user *User) error {
	query := `
		INSERT INTO users (github_id, github_username, email, avatar_url, cf_handle, cf_verified)
		VALUES ($1, $2, $3, $4, $5, $6)
		RETURNING id;
	`

	err := repository.db.QueryRow(
		query,
		user.GithubID,
		user.GithubUserName,
		user.Email,
		user.AvatarURL,
		user.CFHandle,
		user.CFVerified).Scan(&user.ID)

	return err
}

func (repository *Repository) Update(user *User) error {
	query := `
		UPDATE users
		SET github_username = $2, email = $3, avatar_url = $4
		WHERE id = $1
		RETURNING id;
	`
	err := repository.db.QueryRow(
		query,
		user.ID,
		user.GithubUserName,
		user.Email,
		user.AvatarURL).Scan(&user.ID)
	return err
}

func (repository *Repository) UpdateCFHandle(user *User, cfHandle string) error {
	query := `
		UPDATE users
		SET cf_handle = $2, cf_verified = false
		WHERE id = $1
		RETURNING id;
	`
	err := repository.db.QueryRow(query, user.ID, cfHandle).Scan(&user.ID)
	if err == sql.ErrNoRows {
		return errors.New("user not found")
	}
	user.CFHandle = cfHandle
	return err
}

func (repository *Repository) UpdateCFVerified(user *User, cfVerified bool) error {
	query := `
		UPDATE users
		SET cf_verified = $2
		WHERE id = $1
		RETURNING id;
	`
	err := repository.db.QueryRow(query, user.ID, cfVerified).Scan(&user.ID)
	if err == sql.ErrNoRows {
		return errors.New("user not found")
	}
	user.CFVerified = cfVerified
	return err
}

func (repository *Repository) UpdateAdmin(user *User, admin bool) error {
	query := `
		UPDATE users
		SET admin = $2
		WHERE id = $1
		RETURNING id;
	`
	err := repository.db.QueryRow(query, user.ID, admin).Scan(&user.ID)
	if err == sql.ErrNoRows {
		return errors.New("user not found")
	}
	user.Admin = admin
	return err
}

func (repository *Repository) FindUserByID(id int64) (*User, error) {
	query := `
		SELECT id, github_id, github_username, email, avatar_url, cf_handle, cf_verified, admin
		FROM users
		WHERE id = $1;
	`
	user := &User{}
	err := repository.db.QueryRow(query, id).Scan(
		&user.ID, &user.GithubID, &user.GithubUserName, &user.Email, &user.AvatarURL,
		&user.CFHandle, &user.CFVerified, &user.Admin)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, errors.New("user not found")
		}
		return nil, err
	}
	return user, nil
}

func (repository *Repository) FindUserByGithubID(githubID int64) (*User, error) {
	query := `
		SELECT id, github_id, github_username, email, avatar_url, cf_handle, cf_verified, admin
		FROM users
		WHERE github_id = $1;
	`
	user := &User{}
	err := repository.db.QueryRow(query, githubID).Scan(
		&user.ID, &user.GithubID, &user.GithubUserName, &user.Email, &user.AvatarURL,
		&user.CFHandle, &user.CFVerified, &user.Admin)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, errors.New("user not found")
		}
		return nil, err
	}
	return user, nil
}

func (repository *Repository) GetAllUsers() ([]User, error) {
	query := `
		SELECT id, github_id, github_username, email, avatar_url, cf_handle, cf_verified, admin
		FROM users;
	`
	rows, err := repository.db.Query(query)
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

	if err = rows.Err(); err != nil {
		return nil, err
	}

	return users, nil
}