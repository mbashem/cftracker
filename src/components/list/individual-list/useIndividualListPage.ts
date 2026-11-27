import { useCallback, useMemo, useRef, useState } from "react";
import useToast from "../../../hooks/useToast";
import { EMPTY_ARRAY, SearchKeys } from "../../../util/constants";
import { Path } from "../../../util/route/path";
import useListApi from "../../../data/hooks/useListApi";
import useProblemsStore from "../../../data/hooks/useProblemsStore";
import useSubmissionsStore from "../../../data/hooks/useSubmissionsStore";
import { selectProblemSubmissionStatuses } from "../../../data/hooks/problemSubmissionStatuses";
import useAppNavigation from "../../../hooks/useAppNavigation";
import type { List, ListItem, PracticeFields, PracticeHelp, PracticeStatus } from "../../../types/list";
import { parseActiveMinutes, parseLocalSolvedOn, practiceError } from "./practiceFields";
import useListCsv from "./useListCsv";

function initialDetails() {
    return {
        filters: { search: "", status: "", help: "" },
        selection: new Set<string>(),
        copyTo: "",
        busy: false,
        announcement: "",
    };
}

const practiceFieldPatch = {
    status: (value: string) => ({ status: (value || null) as PracticeStatus | null }),
    helpUsed: (value: string) => ({ helpUsed: (value || null) as PracticeHelp | null }),
    notes: (value: string) => ({ notes: value || null }),
    solvedOn: (value: string) => ({ solvedOn: parseLocalSolvedOn(value) }),
    timeSpent: (value: string) => ({ timeSpent: parseActiveMinutes(value) }),
} satisfies Record<keyof PracticeFields, (value: string) => PracticeFields>;

export default function useIndividualListPage(listId: number, lists: readonly List[]) {
    const { showErrorToast } = useToast();
    const { navigateTo } = useAppNavigation();
    const { useGetListQuery, updateListItem, removeProblemsFromList, getListWithItems, addListItems } = useListApi();
    const { data: list, isLoading, isFetching = false, error } = useGetListQuery(listId);
    const { problemsById } = useProblemsStore();
    const { submissions, hasCompleteHistory } = useSubmissionsStore();
    const { solved, attempted } = selectProblemSubmissionStatuses(submissions);
    const [details, setDetails] = useState(initialDetails);
    const pendingWrite = useRef(false);

    const { filters, selection, copyTo } = details;
    const items = list?.items ?? EMPTY_ARRAY;
    const effectiveStatus = useCallback((item: ListItem): PracticeStatus | undefined => {
        if (item.status != null) return item.status;
        if (solved.has(item.problemId)) return "solved";
        if (attempted.has(item.problemId)) return "attempted";
        return hasCompleteHistory ? "not_started" : undefined;
    }, [solved, attempted, hasCompleteHistory]);
    const visible = useMemo(() => {
        const search = filters.search.trim().toLowerCase();
        return items.filter(item => {
            const problem = problemsById.get(item.problemId);
            return (!filters.status || (effectiveStatus(item) ?? "unset") === filters.status)
                && (!filters.help || (item.helpUsed ?? "unset") === filters.help)
                && (item.problemId.toLowerCase().includes(search) || problem?.name.toLowerCase().includes(search));
        });
    }, [effectiveStatus, filters, items, problemsById]);
    const selected = visible.filter(item => selection.has(item.problemId));
    const copyLists = lists.filter(candidate => candidate.id !== listId);
    const copyDestination = copyLists.find(candidate => String(candidate.id) === copyTo)?.id;
    const busy = details.busy || isFetching;

    function changeFilters(change: Partial<typeof filters>) {
        setDetails(current => ({ ...current, filters: { ...current.filters, ...change }, selection: new Set() }));
    }

    const selectVisible = useCallback(() => {
        setDetails(current => ({
            ...current,
            selection: visible.every(item => current.selection.has(item.problemId))
                ? new Set() : new Set(visible.map(item => item.problemId)),
        }));
    }, [visible]);

    const selectItem = useCallback((problemId: string, checked: boolean) => {
        setDetails(current => {
            const next = new Set(current.selection);
            if (checked) next.add(problemId);
            else next.delete(problemId);
            return { ...current, selection: next };
        });
    }, []);

    const write = useCallback(async <T,>(action: (activeId: number) => Promise<T>): Promise<T> => {
        if (isFetching || pendingWrite.current) throw new Error("Wait for the current list change to finish.");
        pendingWrite.current = true;
        setDetails(current => ({ ...current, busy: true, announcement: "" }));
        try {
            return await action(listId);
        } finally {
            pendingWrite.current = false;
            setDetails(current => ({ ...current, busy: false }));
        }
    }, [isFetching, listId]);

    async function removeSelected() {
        const ids = new Set(selected.map(item => item.problemId));
        const { removedProblemIds, absentProblemIds } = await write(id => removeProblemsFromList(id, [...ids]));
        const alreadyRemoved = absentProblemIds.length ? ` · Already absent ${absentProblemIds.length}` : "";
        setDetails(current => ({
            ...current,
            selection: new Set([...current.selection].filter(id => !ids.has(id))),
            announcement: `Removed ${removedProblemIds.length}${alreadyRemoved}.`,
        }));
    }

    async function copySelected() {
        if (copyDestination === undefined) return;
        await write(async () => {
            const destination = await getListWithItems(copyDestination);
            const existingIds = new Set(destination.items.map(item => item.problemId));
            const additions = selected.filter(item => !existingIds.has(item.problemId));
            const skipped = selected.length - additions.length;
            const result = additions.length > 0 ? await addListItems(copyDestination, additions) : undefined;
            const duplicates = skipped + (result?.duplicateProblemIds.length ?? 0);
            setDetails(current => ({ ...current, announcement: `Copied ${result?.added.length ?? 0} · Duplicates skipped ${duplicates}.` }));
        });
    }

    const savePracticeField = useCallback(async (problemId: string, field: keyof PracticeFields, value: string) => {
        const patch = practiceFieldPatch[field](value);
        const invalid = practiceError(patch);
        if (invalid !== undefined) throw new Error(invalid);
        await write(id => updateListItem(id, problemId, patch));
        setDetails(current => ({ ...current, announcement: `Saved practice details for ${problemId}.` }));
    }, [updateListItem, write]);

    const reportError = useCallback((reason: unknown) => {
        showErrorToast(reason instanceof Error ? reason.message : "Could not update this list.");
    }, [showErrorToast]);

    const { csvImport, resetCsvImport, downloadCsv } = useListCsv(list, busy, additions => write(id => addListItems(id, additions)));

    function addProblem() {
        navigateTo(Path.PROBLEMS, {
            [SearchKeys.ListId]: listId,
            [SearchKeys.UseFilterStorage]: false,
        });
    }

    return {
        list, isLoading, error, problemsById, effectiveStatus, busy, filters, changeFilters,
        visible, selection, selectedCount: selected.length, copyLists, selectVisible, selectItem, copyDestination,
        changeCopyDestination: (destination: string) => setDetails(current => ({ ...current, copyTo: destination })),
        copySelected, removeSelected, savePracticeField, reportError, addProblem, downloadCsv, resetCsvImport,
        announcement: details.announcement, csvImport,
    };
}

export type ListDetails = ReturnType<typeof useIndividualListPage>;
