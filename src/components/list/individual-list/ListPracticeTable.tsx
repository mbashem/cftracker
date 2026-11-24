import type { Ref } from "react";
import type Problem from "../../../types/CF/Problem";
import { PRACTICE_STATUS_LABELS, type ListItem, type PracticeFields, type PracticeStatus } from "../../../types/list";
import type Theme from "../../../util/Theme";
import { getProblemUrl } from "../../../util/util";
import Table, { type TableColumn } from "../../common/Table";
import PracticeFieldCell from "./PracticeFieldCell";
import { formatActiveMinutes, formatLocalSolvedOn, HELP_OPTIONS, STATUS_OPTIONS } from "./practiceFields";

interface Props {
    items: readonly ListItem[];
    selection: ReadonlySet<string>;
    problemsById: ReadonlyMap<string, Problem>;
    theme: Theme;
    busy: boolean;
    selectionControl: Ref<HTMLInputElement>;
    effectiveStatus: (item: ListItem) => PracticeStatus | undefined;
    onSelectVisible: () => void;
    onSelectItem: (problemId: string, checked: boolean) => void;
    onSave: (problemId: string, field: keyof PracticeFields, value: string) => Promise<void>;
    onError: (error: unknown) => void;
}

export default function ListPracticeTable({
    items, selection, problemsById, theme, busy, selectionControl, effectiveStatus,
    onSelectVisible, onSelectItem, onSave, onError,
}: Props) {
    const statusBackgrounds = {
        solved: theme.bgSuccess,
        attempted: theme.bgDanger,
        in_progress: theme.bgInProgress,
        not_started: "",
    };
    const columns: TableColumn<ListItem>[] = [
        {
            id: "selection",
            columnClassName: "practice-column-selection",
            header: (
                <input
                    ref={selectionControl}
                    type="checkbox"
                    className="form-check-input m-0"
                    aria-label="Select visible problems"
                    disabled={items.length === 0}
                    checked={items.length > 0 && items.every(item => selection.has(item.problemId))}
                    onChange={onSelectVisible}
                />
            ),
            renderCell: ({ problemId }) => (
                <input
                    className="form-check-input"
                    type="checkbox"
                    aria-label={`Select ${problemId}`}
                    checked={selection.has(problemId)}
                    onChange={event => onSelectItem(problemId, event.target.checked)}
                />
            ),
        },
        {
            id: "id",
            header: "ID",
            columnClassName: "practice-column-id",
            rowHeader: true,
            renderCell: ({ problemId }) => problemId,
        },
        {
            id: "name",
            header: "Name",
            renderCell: ({ problemId }) => {
                const problem = problemsById.get(problemId);
                return problem && <a href={getProblemUrl(problem.contestId, problem.index)} target="_blank" rel="noreferrer">{problem.name}</a>;
            },
        },
        {
            id: "status",
            header: "Status",
            columnClassName: "practice-column-status",
            renderCell: item => {
                const status = effectiveStatus(item);
                const statusLabel = status === undefined ? "Unset" : PRACTICE_STATUS_LABELS[status];
                return (
                    <select
                        className={`form-select form-select-sm ${statusBackgrounds[status ?? "not_started"]}`}
                        aria-label={`Status for ${item.problemId}`}
                        value={item.status ?? ""}
                        disabled={busy}
                        onChange={event => void onSave(item.problemId, "status", event.target.value).catch(onError)}
                    >
                        <option value="">{item.status == null ? `${statusLabel} (CF)` : "Use CF status"}</option>
                        {STATUS_OPTIONS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                    </select>
                );
            },
        },
        {
            id: "helpUsed",
            header: "Help used",
            columnClassName: "practice-column-help",
            renderCell: ({ problemId, helpUsed }) => (
                <select
                    className="form-select form-select-sm"
                    aria-label={`Help used for ${problemId}`}
                    value={helpUsed ?? ""}
                    disabled={busy}
                    onChange={event => void onSave(problemId, "helpUsed", event.target.value).catch(onError)}
                >
                    <option value="">Unrecorded</option>
                    {HELP_OPTIONS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                </select>
            ),
        },
        {
            id: "solvedOn",
            header: "Solved on",
            headerTitle: "Local date and time",
            columnClassName: "practice-column-date",
            cellClassName: "practice-date",
            renderCell: ({ problemId, solvedOn }) => (
                <PracticeFieldCell
                    field="solvedOn"
                    problemId={problemId}
                    value={solvedOn == null ? undefined : formatLocalSolvedOn(solvedOn)}
                    busy={busy}
                    save={value => onSave(problemId, "solvedOn", value)}
                />
            ),
        },
        {
            id: "timeSpent",
            header: "Active time (min)",
            columnClassName: "practice-column-time",
            renderCell: ({ problemId, timeSpent }) => (
                <PracticeFieldCell
                    field="timeSpent"
                    problemId={problemId}
                    value={timeSpent == null ? undefined : formatActiveMinutes(timeSpent)}
                    busy={busy}
                    save={value => onSave(problemId, "timeSpent", value)}
                />
            ),
        },
        {
            id: "notes",
            header: "Notes",
            cellClassName: "practice-notes",
            renderCell: ({ problemId, notes }) => (
                <PracticeFieldCell field="notes" problemId={problemId} value={notes} busy={busy} save={value => onSave(problemId, "notes", value)} />
            ),
        },
    ];

    return <Table theme={theme} className="practice-table align-middle" columns={columns} rows={items} getRowKey={item => item.problemId} />;
}
