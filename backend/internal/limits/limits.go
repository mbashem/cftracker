package limits

import (
	"errors"
	"fmt"
	"strings"
	"unicode/utf8"

	"github.com/mbashem/cftracker/backend/configs"
)

const (
	RequestBodyBytes               = 16 * 1024
	ListCollectionRequestBodyBytes = configs.ListCollectionBodyMiB * 1024 * 1024
	ListNameCharacters             = 100
	ListsPerUser                   = 20
	ItemsPerList                   = configs.MaxItemsPerList
)

var (
	ErrInvalidListName = errors.New("list name must contain 1 to 100 characters")
	ErrListQuota       = errors.New("maximum of 20 lists per account reached")
	ErrItemQuota       = fmt.Errorf("maximum of %d items per list reached", ItemsPerList)
)

// NormalizeListName is shared by the HTTP boundary and repository writes.
func NormalizeListName(name string) (string, error) {
	name = strings.TrimSpace(name)
	if !utf8.ValidString(name) || name == "" || utf8.RuneCountInString(name) > ListNameCharacters {
		return "", ErrInvalidListName
	}
	return name, nil
}
