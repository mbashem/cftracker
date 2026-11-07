package configs

import (
	"encoding/json"
	"errors"
	"fmt"
	"strings"
)

func loadJWTKeys(legacySecret string) (map[string]string, []string, error) {
	rawActiveIDs := getEnv(JWT_ACTIVE_KEY_IDS)
	rawKeys := getEnv(JWT_KEYS)
	if rawKeys == "" {
		if rawActiveIDs != "" {
			return nil, nil, fmt.Errorf("%s requires %s", JWT_ACTIVE_KEY_IDS, JWT_KEYS)
		}
		// Existing installations keep working without adding rotation settings.
		return map[string]string{"default": legacySecret}, []string{"default"}, nil
	}
	var keys map[string]string
	if err := json.Unmarshal([]byte(rawKeys), &keys); err != nil || len(keys) == 0 {
		// Do not include decoder errors: they may contain secret input.
		return nil, nil, fmt.Errorf("%s must be a nonempty JSON object of key IDs to secrets", JWT_KEYS)
	}
	var validationErrors []error
	for id, secret := range keys {
		if strings.TrimSpace(id) == "" || strings.TrimSpace(id) != id {
			validationErrors = append(validationErrors, fmt.Errorf("%s key IDs must be nonempty without surrounding whitespace", JWT_KEYS))
		}
		if len([]byte(secret)) < MinimumJWTSecretLength {
			validationErrors = append(validationErrors, fmt.Errorf("%s secrets must be at least %d bytes", JWT_KEYS, MinimumJWTSecretLength))
		}
	}
	var activeIDs []string
	if err := json.Unmarshal([]byte(rawActiveIDs), &activeIDs); err != nil || len(activeIDs) == 0 {
		validationErrors = append(validationErrors, fmt.Errorf("%s must be a nonempty JSON array of key IDs", JWT_ACTIVE_KEY_IDS))
	}
	seen := make(map[string]bool, len(activeIDs))
	for _, id := range activeIDs {
		if strings.TrimSpace(id) == "" || strings.TrimSpace(id) != id || seen[id] {
			validationErrors = append(validationErrors, fmt.Errorf("%s must contain unique nonempty key IDs without surrounding whitespace", JWT_ACTIVE_KEY_IDS))
		}
		seen[id] = true
		if _, found := keys[id]; !found {
			validationErrors = append(validationErrors, fmt.Errorf("%s must identify keys in %s", JWT_ACTIVE_KEY_IDS, JWT_KEYS))
		}
	}
	return keys, activeIDs, errors.Join(validationErrors...)
}
