package users

import (
	"context"
	"database/sql"
	"errors"
	"time"
)

var (
	ErrUserNotFound    = errors.New("user not found")
	ErrCFHandleChanged = errors.New("Codeforces handle changed during verification")
)

type UserRepository interface {
	FindByID(ctx context.Context, id int64) (*User, error)
	UpdateCFHandle(ctx context.Context, user *User, cfHandle string, verifiedHandle string) error
	UpdateCFVerifiedHandle(ctx context.Context, user *User, verifiedHandle string) error
}

type AuthUserRepository interface {
	FindByGitHubID(ctx context.Context, githubID int64) (*User, error)
	Save(ctx context.Context, user *User) error
	Update(ctx context.Context, user *User) error
}

type Repository struct {
	db      *sql.DB
	timeout time.Duration
}

func NewRepository(db *sql.DB, timeout time.Duration) *Repository {
	return &Repository{db: db, timeout: timeout}
}

func (repository *Repository) Save(ctx context.Context, user *User) error {
	ctx, cancel := context.WithTimeout(ctx, repository.timeout)
	defer cancel()
	query := `
		INSERT INTO users (github_id, github_username, email, avatar_url, cf_handle, cf_verified_handle)
		VALUES ($1, $2, $3, $4, $5, $6)
		RETURNING id;
	`

	return repository.db.QueryRowContext(ctx,
		query,
		user.GithubID,
		user.GithubUserName,
		user.Email,
		user.AvatarURL,
		user.CFHandle,
		user.CFVerifiedHandle,
	).Scan(&user.ID)
}

func (repository *Repository) Update(ctx context.Context, user *User) error {
	ctx, cancel := context.WithTimeout(ctx, repository.timeout)
	defer cancel()
	query := `
		UPDATE users
		SET github_username = $2, email = $3, avatar_url = $4
		WHERE id = $1
		RETURNING id;
	`

	err := repository.db.QueryRowContext(ctx,
		query,
		user.ID,
		user.GithubUserName,
		user.Email,
		user.AvatarURL,
	).Scan(&user.ID)
	return userQueryError(err)
}

// UpdateCFHandle changes the selected account and its verification together.
// The old handles guard against changes made while the provider was queried.
func (repository *Repository) UpdateCFHandle(ctx context.Context, user *User, cfHandle string, verifiedHandle string) error {
	ctx, cancel := context.WithTimeout(ctx, repository.timeout)
	defer cancel()
	query := `
		UPDATE users SET cf_handle = $2, cf_verified_handle = $3
		WHERE id = $1 AND COALESCE(cf_handle, '') = $4 AND cf_verified_handle = $5
		RETURNING id;
	`
	if err := repository.db.QueryRowContext(ctx, query, user.ID, cfHandle, verifiedHandle, user.CFHandle, user.CFVerifiedHandle).Scan(&user.ID); err != nil {
		return cfHandleUpdateError(err)
	}
	user.CFHandle = cfHandle
	user.CFVerifiedHandle = verifiedHandle
	return nil
}

func (repository *Repository) UpdateCFVerifiedHandle(ctx context.Context, user *User, verifiedHandle string) error {
	ctx, cancel := context.WithTimeout(ctx, repository.timeout)
	defer cancel()
	query := `
		UPDATE users SET cf_verified_handle = $2
		WHERE id = $1 AND COALESCE(cf_handle, '') = $3 AND cf_verified_handle = $4
		RETURNING id;
	`
	if err := repository.db.QueryRowContext(ctx, query, user.ID, verifiedHandle, user.CFHandle, user.CFVerifiedHandle).Scan(&user.ID); err != nil {
		return cfHandleUpdateError(err)
	}
	user.CFVerifiedHandle = verifiedHandle
	return nil
}

func cfHandleUpdateError(err error) error {
	if errors.Is(err, sql.ErrNoRows) {
		return ErrCFHandleChanged
	}
	return err
}

func (repository *Repository) UpdateAdmin(ctx context.Context, user *User, admin bool) error {
	ctx, cancel := context.WithTimeout(ctx, repository.timeout)
	defer cancel()
	query := `
		UPDATE users
		SET admin = $2
		WHERE id = $1
		RETURNING id;
	`

	if err := repository.db.QueryRowContext(ctx, query, user.ID, admin).Scan(&user.ID); err != nil {
		return userQueryError(err)
	}
	user.Admin = admin
	return nil
}

func (repository *Repository) FindByID(ctx context.Context, id int64) (*User, error) {
	ctx, cancel := context.WithTimeout(ctx, repository.timeout)
	defer cancel()
	query := `
		SELECT id, github_id, github_username, email, avatar_url,
			COALESCE(cf_handle, ''), cf_verified_handle, admin
		FROM users
		WHERE id = $1;
	`

	user := &User{}
	err := repository.db.QueryRowContext(ctx, query, id).Scan(
		&user.ID,
		&user.GithubID,
		&user.GithubUserName,
		&user.Email,
		&user.AvatarURL,
		&user.CFHandle,
		&user.CFVerifiedHandle,
		&user.Admin,
	)
	if err != nil {
		return nil, userQueryError(err)
	}
	return user, nil
}

func (repository *Repository) FindByGitHubID(ctx context.Context, githubID int64) (*User, error) {
	ctx, cancel := context.WithTimeout(ctx, repository.timeout)
	defer cancel()
	query := `
		SELECT id, github_id, github_username, email, avatar_url,
			COALESCE(cf_handle, ''), cf_verified_handle, admin
		FROM users
		WHERE github_id = $1;
	`

	user := &User{}
	err := repository.db.QueryRowContext(ctx, query, githubID).Scan(
		&user.ID,
		&user.GithubID,
		&user.GithubUserName,
		&user.Email,
		&user.AvatarURL,
		&user.CFHandle,
		&user.CFVerifiedHandle,
		&user.Admin,
	)
	if err != nil {
		return nil, userQueryError(err)
	}
	return user, nil
}

func (repository *Repository) GetAll(ctx context.Context) ([]User, error) {
	ctx, cancel := context.WithTimeout(ctx, repository.timeout)
	defer cancel()
	query := `
		SELECT id, github_id, github_username, email, avatar_url,
			COALESCE(cf_handle, ''), cf_verified_handle, admin
		FROM users;
	`

	rows, err := repository.db.QueryContext(ctx, query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	users := make([]User, 0)
	for rows.Next() {
		var user User
		if err := rows.Scan(
			&user.ID,
			&user.GithubID,
			&user.GithubUserName,
			&user.Email,
			&user.AvatarURL,
			&user.CFHandle,
			&user.CFVerifiedHandle,
			&user.Admin,
		); err != nil {
			return nil, err
		}
		users = append(users, user)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	return users, nil
}

func userQueryError(err error) error {
	if errors.Is(err, sql.ErrNoRows) {
		return ErrUserNotFound
	}
	return err
}
