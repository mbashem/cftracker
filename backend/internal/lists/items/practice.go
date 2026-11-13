package items

import (
	"errors"
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

type Practice struct {
	Status    *PracticeStatus `json:"status"`
	HelpUsed  *PracticeHelp   `json:"help_used"`
	SolvedOn  *string         `json:"solved_on"`
	TimeSpent *int64          `json:"time_spent"`
	Notes     *string         `json:"notes"`
}

// Normalize validates supplied values without deriving anything from status.
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
		date, err := time.Parse(time.DateOnly, *practice.SolvedOn)
		if err != nil || date.Year() < 1 || date.Format(time.DateOnly) != *practice.SolvedOn {
			return ErrInvalidPractice
		}
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
