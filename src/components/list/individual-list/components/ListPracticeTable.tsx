import { useMemo, type Ref } from "react";
import type Problem from "../../../../types/CF/Problem";
import { PRACTICE_STATUS_LABELS, type ListItem, type PracticeFields, type PracticeStatus } from "../../../../types/list";
import type Theme from "../../../../util/Theme";
import { getProblemUrl } from "../../../../util/util";
import ExternalLink from "../../../common/navigation/ExternalLink";
import Table, { type TableColumn } from "../../../common/display/Table";
import Checkbox from "../../../common/forms/Input/Checkbox";
import Select from "../../../common/forms/Input/Select";
import PracticeFieldCell from "./PracticeFieldCell";
import { formatActiveMinutes, formatLocalSolvedOn, HELP_OPTIONS, STATUS_OPTIONS } from "../practiceFields";
import "./ListPracticeTable.css";

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

const getProblemKey = (item: ListItem) => item.problemId;

export default function ListPracticeTable({
    items, selection, problemsById, theme, busy, selectionControl, effectiveStatus,
    onSelectVisible, onSelectItem, onSave, onError,
}: Props) {
    const columns = useMemo<TableColumn<ListItem>[]>(() => [
        {
            id: "selection",
            columnClassName: "practice-column-selection",
            header: (
                <Checkbox
                    ref={selectionControl}
                    className="m-0"
                    aria-label="Select visible problems"
                    disabled={items.length === 0}
                    checked={items.length > 0 && items.every(item => selection.has(item.problemId))}
                    onCheckedChange={onSelectVisible}
                />
            ),
            renderCell: ({ problemId }) => (
                <Checkbox
                    aria-label={`Select ${problemId}`}
                    checked={selection.has(problemId)}
                    onCheckedChange={checked => onSelectItem(problemId, checked)}
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
                return problem && <ExternalLink href={getProblemUrl(problem.contestId, problem.index)}>{problem.name}</ExternalLink>;
            },
        },
        {
            id: "status",
            header: "Status",
            columnClassName: "practice-column-status",
            renderCell: item => {
                const status = effectiveStatus(item);
                const statusLabel = status === undefined ? "Unset" : PRACTICE_STATUS_LABELS[status];
                const statusBackground = {
                    solved: theme.bgSuccess,
                    attempted: theme.bgDanger,
                    in_progress: theme.bgInProgress,
                    not_started: "",
                }[status ?? "not_started"];
                return (
                    <Select
                        compact
                        className={statusBackground}
                        aria-label={`Status for ${item.problemId}`}
                        value={item.status ?? ""}
                        disabled={busy}
                        onValueChange={value => void onSave(item.problemId, "status", value).catch(onError)}
                        options={[["", item.status == null ? `${statusLabel} (CF)` : "Use CF status"], ...STATUS_OPTIONS]}
                    />
                );
            },
        },
        {
            id: "helpUsed",
            header: "Help used",
            columnClassName: "practice-column-help",
            renderCell: ({ problemId, helpUsed }) => (
                <Select
                    compact
                    aria-label={`Help used for ${problemId}`}
                    value={helpUsed ?? ""}
                    disabled={busy}
                    onValueChange={value => void onSave(problemId, "helpUsed", value).catch(onError)}
                    options={[["", "Unrecorded"], ...HELP_OPTIONS]}
                />
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
    ], [busy, effectiveStatus, items, onError, onSave, onSelectItem, onSelectVisible, problemsById, selection, selectionControl, theme]);

    return <Table theme={theme} className="practice-table align-middle" columns={columns} rows={items} getRowKey={getProblemKey} />;
}
