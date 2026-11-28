package items

import (
	"errors"
	"regexp"
	"strings"
	"time"
	"unicode/utf8"
)

type PracticeStatus string
type PracticeHelp string

const (
	StatusNotStarted PracticeStatus = "not_started"
	StatusAttempted  PracticeStatus = "attempted"
	StatusInProgress PracticeStatus = "in_progress"
	StatusSolved     PracticeStatus = "solved"
	HelpNone         PracticeHelp   = "none"
	HelpTestCase     PracticeHelp   = "test_case"
	HelpHint         PracticeHelp   = "hint"
	HelpEditorial    PracticeHelp   = "editorial"
	HelpSolution     PracticeHelp   = "solution"
	NotesCharacters                 = 512
	MaxTimeSpent                    = 2147483647 // Active seconds; matches PostgreSQL INTEGER.
)

var ErrInvalidPractice = errors.New("invalid practice fields")
var solvedTimestampPattern = regexp.MustCompile(`^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{1,3})?(Z|[+-]([01]\d|2[0-3]):[0-5]\d)$`)

type Practice struct {
	Status    *PracticeStatus `json:"status"`
	HelpUsed  *PracticeHelp   `json:"help_used"`
	SolvedOn  *string         `json:"solved_on"`
	TimeSpent *int64          `json:"time_spent"`
	Notes     *string         `json:"notes"`
}

// Normalize enforces nullable practice-field constraints, converts solve times to UTC, and clears empty notes.
// Status changes never derive or clear other fields; whitespace in nonempty notes is preserved.
func (practice *Practice) Normalize() error {
	if practice.Status != nil {
		switch *practice.Status {
		case StatusNotStarted, StatusAttempted, StatusInProgress, StatusSolved:
		default:
			return ErrInvalidPractice
		}
	}
	if practice.HelpUsed != nil {
		switch *practice.HelpUsed {
		case HelpNone, HelpTestCase, HelpHint, HelpEditorial, HelpSolution:
		default:
			return ErrInvalidPractice
		}
	}
	if practice.SolvedOn != nil {
		if !solvedTimestampPattern.MatchString(*practice.SolvedOn) {
			return ErrInvalidPractice
		}
		solvedAt, err := time.Parse(time.RFC3339Nano, *practice.SolvedOn)
		if err != nil || solvedAt.Year() < 1 || solvedAt.UTC().Year() < 1 || solvedAt.UTC().Year() > 9999 {
			return ErrInvalidPractice
		}
		utc := solvedAt.UTC().Format(time.RFC3339Nano)
		practice.SolvedOn = &utc
	}
	if practice.TimeSpent != nil && (*practice.TimeSpent < 0 || *practice.TimeSpent > MaxTimeSpent) {
		return ErrInvalidPractice
	}
	if practice.Notes != nil {
		if !utf8.ValidString(*practice.Notes) || strings.ContainsRune(*practice.Notes, '\x00') || utf8.RuneCountInString(*practice.Notes) > NotesCharacters {
			return ErrInvalidPractice
		}
		if *practice.Notes == "" {
			practice.Notes = nil
		}
	}
	return nil
}
