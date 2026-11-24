import {
    PRACTICE_STATUS_LABELS, PRACTICE_HELP_LABELS,
    type PracticeFields, type PracticeStatus, type PracticeHelp,
} from "../../../types/list";
import { Verdict, type default as Submission } from "../../../types/CF/Submission";

export const LIST_CAPACITY = 1_000;
export const MAX_ACTIVE_SECONDS = 2_147_483_647;
export const MAX_NOTES_LENGTH = 512;

export const STATUS_OPTIONS = Object.entries(PRACTICE_STATUS_LABELS) as [PracticeStatus, string][];
export const HELP_OPTIONS = Object.entries(PRACTICE_HELP_LABELS) as [PracticeHelp, string][];

function utcTimestamp(date: Date) {
    return date.toISOString().replace(/(\.\d*?[1-9])0+Z$|\.000Z$/, "$1Z");
}

export function normalizeSolvedOn(value: string) {
    const match = /^(\d{4}-\d{2}-\d{2})T([01]\d|2[0-3]):[0-5]\d:[0-5]\d(?:\.\d{1,3})?(?:Z|[+-](?:[01]\d|2[0-3]):[0-5]\d)$/.exec(value);
    if (match === null || match[1].startsWith("0000")) return undefined;
    const calendarDate = new Date(match[1] + "T00:00:00Z");
    if (Number.isNaN(calendarDate.getTime()) || calendarDate.toISOString().slice(0, 10) !== match[1]) return undefined;
    const instant = new Date(value);
    if (Number.isNaN(instant.getTime()) || instant.getUTCFullYear() < 1 || instant.getUTCFullYear() > 9999) return undefined;
    return utcTimestamp(instant);
}

function localDateTime(date: Date) {
    const year = String(date.getFullYear()).padStart(4, "0");
    const [month, day, hour, minute, second] = [
        date.getMonth() + 1, date.getDate(), date.getHours(), date.getMinutes(), date.getSeconds(),
    ].map(part => String(part).padStart(2, "0"));
    const local = `${year}-${month}-${day}T${hour}:${minute}`;
    if (date.getMilliseconds() !== 0) {
        const fraction = String(date.getMilliseconds()).padStart(3, "0").replace(/0+$/, "");
        return `${local}:${second}.${fraction}`;
    }
    return date.getSeconds() === 0 ? local : `${local}:${second}`;
}

export function formatLocalSolvedOn(value: string) {
    return localDateTime(new Date(value));
}

export function formatCompactSolvedOn(value: string) {
    const [date, time] = value.split("T");
    const [year, month, day] = date.split("-");
    return `${day}/${month}/${year.slice(-2)} ${time.slice(0, 5)}`;
}

export function parseLocalSolvedOn(value: string) {
    if (value === "") return null;
    const date = new Date(value);
    // Verify the local components so a clock change cannot silently shift the entered time.
    const normalizedLocal = value.replace(/(\.\d*?[1-9])0+$|\.0+$/, "$1").replace(/(T\d{2}:\d{2}):00$/, "$1");
    if (Number.isNaN(date.getTime()) || localDateTime(date) !== normalizedLocal
        || date.getUTCFullYear() < 1 || date.getUTCFullYear() > 9999) {
        throw new Error("Enter a valid local solve date and time.");
    }
    return utcTimestamp(date);
}

export function codeforcesStatuses(submissions: readonly Submission[]) {
    const statuses = new Map<string, PracticeStatus>();
    for (const submission of submissions) {
        const id = submission.problem.id;
        if (submission.verdict === Verdict.OK) statuses.set(id, "solved");
        else if (!statuses.has(id)) statuses.set(id, "attempted");
    }
    return statuses;
}

export function practiceError({ solvedOn, timeSpent, notes }: PracticeFields) {
    if (solvedOn != null && normalizeSolvedOn(solvedOn) === undefined) {
        return "Enter a valid solve date and time with a timezone (RFC 3339).";
    }
    if (timeSpent != null && (!Number.isInteger(timeSpent) || timeSpent < 0 || timeSpent > MAX_ACTIVE_SECONDS)) {
        return "Active time must be between 0 and 2,147,483,647 whole seconds.";
    }
    if (notes != null && (notes.includes("\0") || [...notes].length > MAX_NOTES_LENGTH)) {
        return "Notes must contain at most 512 characters and contain no null characters.";
    }
}

export function formatActiveMinutes(seconds: number) {
    return String(Number((seconds / 60).toFixed(2)));
}

export function parseActiveMinutes(value?: string) {
    const input = value?.trim();
    if (!input) return null;
    if (!/^\d+$/.test(input)) throw new Error("Enter a whole number of minutes.");
    return Number(input) * 60;
}
