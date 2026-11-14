package items

import (
	"encoding/json"
	"time"
	"unicode/utf8"
)

type ListItem struct {
	Practice
	ListId    int64     `json:"list_id"`
	ProblemId string    `json:"problem_id"`
	Position  int       `json:"position"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

// Field distinguishes an omitted JSON property from an explicit null.
type Field[T any] struct {
	Set   bool
	Value *T
}

func (field *Field[T]) UnmarshalJSON(data []byte) error {
	if !utf8.Valid(data) {
		return ErrInvalidPractice
	}
	field.Set = true
	return json.Unmarshal(data, &field.Value)
}

func (field Field[T]) suppliedValue() *T {
	if !field.Set {
		return nil
	}
	return field.Value
}

// ItemPatch is the partial-update contract for an item. New editable fields can
// extend this type and the existing PATCH endpoint.
type ItemPatch struct {
	Status    Field[PracticeStatus] `json:"status"`
	HelpUsed  Field[PracticeHelp]   `json:"help_used"`
	SolvedOn  Field[string]         `json:"solved_on"`
	TimeSpent Field[int64]          `json:"time_spent"`
	Notes     Field[string]         `json:"notes"`
}

func (patch ItemPatch) Empty() bool {
	return !patch.Status.Set && !patch.HelpUsed.Set && !patch.SolvedOn.Set && !patch.TimeSpent.Set && !patch.Notes.Set
}

func (patch ItemPatch) Values() Practice {
	return Practice{
		Status: patch.Status.suppliedValue(), HelpUsed: patch.HelpUsed.suppliedValue(), SolvedOn: patch.SolvedOn.suppliedValue(),
		TimeSpent: patch.TimeSpent.suppliedValue(), Notes: patch.Notes.suppliedValue(),
	}
}

// Normalize validates only fields marked Set, preserving explicit nulls.
func (patch *ItemPatch) Normalize() error {
	values := patch.Values()
	if err := values.Normalize(); err != nil {
		return err
	}
	patch.Status.Value = values.Status
	patch.HelpUsed.Value = values.HelpUsed
	patch.SolvedOn.Value = values.SolvedOn
	patch.TimeSpent.Value = values.TimeSpent
	patch.Notes.Value = values.Notes
	return nil
}
