package limits

import (
	"errors"
	"strings"
	"unicode/utf8"
)

const (
	RequestBodyBytes   = 16 * 1024
	ListNameCharacters = 100
	ListsPerUser       = 20
	ItemsPerList       = 1000
)

var (
	ErrInvalidListName = errors.New("list name must contain 1 to 100 characters")
	ErrListQuota       = errors.New("maximum of 20 lists per account reached")
	ErrItemQuota       = errors.New("maximum of 1000 items per list reached")
)

// NormalizeListName is shared by the HTTP boundary and repository writes.
func NormalizeListName(name string) (string, error) {
	name = strings.TrimSpace(name)
	if !utf8.ValidString(name) || name == "" || utf8.RuneCountInString(name) > ListNameCharacters {
		return "", ErrInvalidListName
	}
	return name, nil
}
