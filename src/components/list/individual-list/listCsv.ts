import type { ListItemInput } from "../../../types/list";
import { HELP_OPTIONS, STATUS_OPTIONS, normalizeSolvedOn, practiceError } from "./practiceFields";

export const CSV_FIELDS = [
    ["problemId", "Problem ID", "problem_id"],
    ["status", "Status", "status"],
    ["helpUsed", "Help used", "help_used"],
    ["solvedOn", "Solved on (date, time, timezone)", "solved_on"],
    ["timeSpent", "Active time", "time_spent_seconds"],
    ["notes", "Notes", "notes"],
] as const;

type CsvField = typeof CSV_FIELDS[number][0];
export type CsvMapping = Partial<Record<CsvField, number>>;
const EXPORT_HEADERS = CSV_FIELDS.map(([, , header]) => header);
const LEGACY_ESCAPE_HEADER = "cftracker_escaped_text";

export function parseListCsv(text: string) {
    const rows: string[][] = [];
    let row: string[] = [];
    let field = "";
    let state: "unquoted" | "quoted" | "closed" = "unquoted";
    const input = text.replace(/^\uFEFF/, "");

    function finishField() {
        row.push(field);
        field = "";
        state = "unquoted";
    }

    for (let index = 0; index < input.length; index++) {
        const character = input[index];
        if (state === "quoted") {
            if (character !== '"') field += character;
            else if (input[index + 1] === '"') {
                field += '"';
                index++;
            } else state = "closed";
        } else if (character === ",") {
            finishField();
        } else if (character === "\r" || character === "\n") {
            finishField();
            rows.push(row);
            row = [];
            if (character === "\r" && input[index + 1] === "\n") index++;
        } else if (state === "closed" || (character === '"' && field !== "")) {
            throw new Error(`Unexpected character in CSV row ${rows.length + 1}.`);
        } else if (character === '"') {
            state = "quoted";
        } else field += character;
    }
    if (state === "quoted") throw new Error(`Unclosed quote in CSV row ${rows.length + 1}.`);
    if (row.length > 0 || field !== "" || state === "closed") {
        finishField();
        rows.push(row);
    }
    const [headers, ...records] = rows;
    if (!headers?.some(header => header.trim() !== "")) throw new Error("The CSV needs a header row.");
    return { headers, records };
}

export function defaultCsvMapping(headers: string[]): CsvMapping {
    const normalized = headers.map(header => header.trim().toLowerCase().replace(/\s+/g, "_"));
    const mapping: CsvMapping = {};
    for (const [field, , header] of CSV_FIELDS) {
        const index = normalized.findIndex(value => value === header);
        if (index >= 0) mapping[field] = index;
    }
    return mapping;
}

function enumValue<T extends string>(value: string, options: readonly [T, string][]) {
    return options.find(([key, label]) => key === value || label.toLowerCase() === value)?.[0];
}

function csvTime(value: string, unit: "seconds" | "minutes") {
    if (!/^\d+(\.\d+)?$/.test(value)) return NaN;
    const [whole, fraction = ""] = value.split(".");
    const decimal = fraction.replace(/0+$/, "");
    if (unit === "seconds") return decimal === "" ? Number(whole) : NaN;
    // Exact decimal minutes that resolve to a whole second need at most two decimal places.
    if (decimal.length > 2) return NaN;
    return Number(whole) * 60 + Number(decimal.padEnd(2, "0")) * 60 / 100;
}

export function previewListCsv(
    { headers, records }: ReturnType<typeof parseListCsv>,
    mapping: CsvMapping,
    timeUnit: "seconds" | "minutes",
    existingIds: ReadonlySet<string>,
) {
    const seen = new Set(existingIds);
    const legacyEscapeColumn = headers.indexOf(LEGACY_ESCAPE_HEADER);
    const hasExportHeaders = headers.length === EXPORT_HEADERS.length
        && EXPORT_HEADERS.every((header, index) => headers[index] === header);
    const items: ListItemInput[] = [];
    const rows: { number: number; problemId: string; result: string }[] = [];
    for (const [index, row] of records.entries()) {
        if (row.every(cell => cell === "")) continue;
        const cell = (key: CsvField) => row[mapping[key] ?? -1] ?? "";
        const text = (key: "problemId" | "notes", header: string) => {
            const value = cell(key);
            if (headers[mapping[key] ?? -1] !== header || !value.startsWith("'")) return value;
            const unescaped = value.slice(1);
            const wasEscaped = row[legacyEscapeColumn] === "1"
                || (hasExportHeaders && spreadsheetText(unescaped) === value);
            return wasEscaped ? unescaped : value;
        };
        const problemId = text("problemId", "problem_id").replace(/^\p{White_Space}+|\p{White_Space}+$/gu, "");
        const statusText = cell("status").trim().toLowerCase();
        const helpText = cell("helpUsed").trim().toLowerCase();
        const timeText = cell("timeSpent").trim();
        const solvedOn = cell("solvedOn").trim() || undefined;
        const item: ListItemInput = {
            problemId,
            status: enumValue(statusText, STATUS_OPTIONS),
            helpUsed: enumValue(helpText, HELP_OPTIONS),
            solvedOn: solvedOn === undefined ? undefined : normalizeSolvedOn(solvedOn) ?? solvedOn,
            timeSpent: timeText === "" ? undefined : csvTime(timeText, timeUnit),
            notes: text("notes", "notes") || undefined,
        };
        let result = "Ready";
        if (row.length !== headers.length) result = "Column count differs from the header.";
        else if (!problemId || [...problemId].length > 100 || problemId.includes("/") || problemId.includes("\0")) {
            result = "Enter a problem ID of 1–100 characters without slashes or null characters.";
        } else if (statusText && item.status === undefined) result = "Unknown status.";
        else if (helpText && item.helpUsed === undefined) result = "Unknown help level.";
        else if (seen.has(problemId)) result = existingIds.has(problemId) ? "Already in this list." : "Repeated problem ID.";
        else {
            const error = practiceError(item);
            if (error !== undefined) result = error;
            else {
                items.push(item);
                seen.add(problemId);
            }
        }
        rows.push({ number: index + 2, problemId, result });
    }
    return { rows, items };
}

function spreadsheetText(value: string) {
    // A leading apostrophe keeps formulas inert. Doubling literal leading apostrophes keeps exports reversible.
    return /^['\t\r\n]|^\s*[=+\-@＝＋－＠]/u.test(value) ? "'" + value : value;
}

export function exportListCsv(items: readonly ListItemInput[]) {
    const rows: string[][] = [EXPORT_HEADERS];
    for (const item of items) {
        rows.push([
            spreadsheetText(item.problemId), item.status ?? "", item.helpUsed ?? "", item.solvedOn ?? "",
            item.timeSpent?.toString() ?? "", spreadsheetText(item.notes ?? ""),
        ]);
    }
    return rows.map(row => row.map(value => '"' + value.replace(/"/g, '""') + '"').join(",")).join("\r\n") + "\r\n";
}
