import { useId, useRef, useState, type ChangeEvent, type FormEvent } from "react";
import { faCheck, faXmark } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { formatCompactSolvedOn, MAX_ACTIVE_SECONDS, MAX_NOTES_LENGTH } from "./practiceFields";

const FIELD_LABELS = { notes: "Notes", solvedOn: "Solved on", timeSpent: "Active time" };

interface Props {
    field: keyof typeof FIELD_LABELS;
    problemId: string;
    value?: string | null;
    busy: boolean;
    save: (value: string) => Promise<void>;
}

export default function PracticeFieldCell({ field, problemId, value, busy, save }: Props) {
    const errorId = useId();
    const dateInput = useRef<HTMLInputElement>(null);
    const [showDateInput, setShowDateInput] = useState(false);
    const [draft, setDraft] = useState<string>();
    const [error, setError] = useState<string>();
    const changed = draft !== undefined && draft !== (value ?? "");
    const fieldLabel = FIELD_LABELS[field];
    const label = `${fieldLabel} for ${problemId}`;
    const actionLabel = `${fieldLabel.toLowerCase()} for ${problemId}`;

    function openDatePicker() {
        const input = dateInput.current;
        if (input === null) return;
        if (typeof input.showPicker === "function") {
            try {
                input.showPicker();
                return;
            } catch {
                // The native input remains usable when programmatic opening is blocked.
            }
        }
        setShowDateInput(true);
        input.focus();
    }

    function cancel() {
        setDraft(undefined);
        setError(undefined);
        setShowDateInput(false);
    }

    async function submit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        if (!changed || busy) return;
        setError(undefined);
        try {
            await save(draft);
            setDraft(undefined);
            setShowDateInput(false);
        } catch (reason) {
            setError(reason instanceof Error ? reason.message : "Could not save this field.");
        }
    }

    const control = {
        "aria-label": label,
        "aria-invalid": error !== undefined,
        "aria-describedby": error === undefined ? undefined : errorId,
        className: "form-control form-control-sm",
        value: draft ?? value ?? "",
        readOnly: busy,
        onChange: (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
            setDraft(event.target.value);
            setError(undefined);
        },
    };
    const dateLabel = field === "solvedOn" && control.value ? formatCompactSolvedOn(control.value) : "dd/mm/yy hh:mm";

    return (
        <form onSubmit={submit} onKeyDown={event => {
            if (event.key === "Escape" && !busy) cancel();
        }}>
            {field === "notes" && <textarea {...control} rows={2} placeholder="Add notes" />}
            {field === "solvedOn" && (
                <div className="position-relative">
                    <input
                        {...control}
                        ref={dateInput}
                        type="datetime-local"
                        step="any"
                        title="Local date and time"
                        tabIndex={showDateInput ? undefined : -1}
                        className={showDateInput ? control.className : "practice-date-picker-input"}
                    />
                    {!showDateInput && (
                        <button
                            type="button"
                            className="btn btn-ghost btn-sm px-1"
                            aria-label={`${label}: ${dateLabel}`}
                            aria-describedby={control["aria-describedby"]}
                            disabled={busy}
                            onClick={openDatePicker}
                        >
                            {dateLabel}
                        </button>
                    )}
                </div>
            )}
            {field === "timeSpent" && (
                <input {...control} type="number" inputMode="numeric" min={0} max={Math.floor(MAX_ACTIVE_SECONDS / 60)} step={1} placeholder="Minutes" />
            )}
            {(changed || showDateInput) && (
                <div className="d-flex align-items-center mt-1">
                    {field === "notes" && changed && <small className="theme-text-muted me-auto">{[...draft].length}/{MAX_NOTES_LENGTH}</small>}
                    <button type="submit" className="btn btn-sm btn-ghost" aria-label={`Save ${actionLabel}`} disabled={busy || !changed}>
                        <FontAwesomeIcon icon={faCheck} />
                    </button>
                    <button type="button" className="btn btn-sm btn-ghost" aria-label={`Cancel ${actionLabel}`} disabled={busy} onClick={cancel}>
                        <FontAwesomeIcon icon={faXmark} />
                    </button>
                </div>
            )}
            {error && <small id={errorId} role="alert" className="theme-text-danger d-block mt-1">{error}</small>}
        </form>
    );
}
