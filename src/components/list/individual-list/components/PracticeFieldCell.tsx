import { useId, useState } from "react";
import { faCheck, faXmark } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import Button from "../../../common/buttons/Button";
import Form from "../../../common/forms/Form";
import DateTimeInput from "../../../common/forms/Input/DateTimeInput";
import Input from "../../../common/forms/Input/Input";
import Textarea from "../../../common/forms/Input/Textarea";
import { formatCompactSolvedOn, MAX_ACTIVE_SECONDS, MAX_NOTES_LENGTH } from "../practiceFields";

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
    const [showDateInput, setShowDateInput] = useState(false);
    const [draft, setDraft] = useState<string>();
    const [error, setError] = useState<string>();
    const changed = draft !== undefined && draft !== (value ?? "");
    const fieldLabel = FIELD_LABELS[field];
    const label = `${fieldLabel} for ${problemId}`;
    const actionLabel = `${fieldLabel.toLowerCase()} for ${problemId}`;

    function cancel() {
        setDraft(undefined);
        setError(undefined);
        setShowDateInput(false);
    }

    async function submit() {
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
        compact: true,
        value: draft ?? value ?? "",
        readOnly: busy,
        onValueChange: (value: string) => {
            setDraft(value);
            setError(undefined);
        },
    };
    const dateLabel = field === "solvedOn" && control.value ? formatCompactSolvedOn(control.value) : "dd/mm/yy hh:mm";

    return (
        <Form onSubmit={submit} onKeyDown={event => {
            if (event.key === "Escape" && !busy) cancel();
        }}>
            {field === "notes" && <Textarea {...control} rows={2} className="practice-notes-input" placeholder="Add notes" />}
            {field === "solvedOn" && (
                <DateTimeInput
                    {...control}
                    label={label}
                    displayValue={dateLabel}
                    expanded={showDateInput}
                    onExpand={() => setShowDateInput(true)}
                    step="any"
                    title="Local date and time"
                />
            )}
            {field === "timeSpent" && (
                <Input {...control} type="number" inputMode="numeric" min={0} max={Math.floor(MAX_ACTIVE_SECONDS / 60)} step={1} placeholder="Minutes" />
            )}
            {(changed || showDateInput) && (
                <div className="d-flex align-items-center mt-1">
                    {field === "notes" && changed && <small className="theme-text-muted me-auto">{[...draft].length}/{MAX_NOTES_LENGTH}</small>}
                    <Button type="submit" variant="ghost" compact aria-label={`Save ${actionLabel}`} disabled={busy || !changed}>
                        <FontAwesomeIcon icon={faCheck} />
                    </Button>
                    <Button variant="ghost" compact aria-label={`Cancel ${actionLabel}`} disabled={busy} onClick={cancel}>
                        <FontAwesomeIcon icon={faXmark} />
                    </Button>
                </div>
            )}
            {error && <small id={errorId} role="alert" className="theme-text-danger d-block mt-1">{error}</small>}
        </Form>
    );
}
