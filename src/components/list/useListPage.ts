import { useMemo, useRef, useState } from "react";
import useTheme from "../../data/hooks/useTheme";
import useToast from "../../hooks/useToast";
import { EMPTY_ARRAY, SearchKeys } from "../../util/constants";
import useAppSearchParams from "../../hooks/useSearchParam";
import { Path } from "../../util/route/path";
import useListApi from "../../data/hooks/useListApi";
import useProblemsStore from "../../data/hooks/useProblemsStore";
import useSubmissionsStore from "../../data/hooks/useSubmissionsStore";
import { isDefined } from "../../util/util";
import useAppNavigation from "../../hooks/useAppNavigation";
import type { ListItem, PracticeFields, PracticeHelp, PracticeStatus } from "../../types/list";
import { defaultCsvMapping, exportListCsv, parseListCsv, previewListCsv, type CsvMapping } from "./individual-list/listCsv";
import { codeforcesStatuses, LIST_CAPACITY, parseActiveMinutes, parseLocalSolvedOn, practiceError } from "./individual-list/practiceFields";

interface CsvImportState {
	request: symbol;
	file?: ReturnType<typeof parseListCsv>;
	mapping: CsvMapping;
	unit: "seconds" | "minutes";
	error?: string;
	result?: string;
}

function initialCsvImport(): CsvImportState {
	return { request: Symbol(), mapping: {}, unit: "seconds" };
}

function initialDetails(listId?: number) {
	return {
		listId,
		visit: Symbol(),
		filters: { search: "", status: "", help: "" },
		selection: new Set<string>(),
		copyTo: "",
		busy: false,
		announcement: "",
		csvImport: initialCsvImport(),
	};
}

const practiceFieldPatch = {
	status: (value: string) => ({ status: (value || null) as PracticeStatus | null }),
	helpUsed: (value: string) => ({ helpUsed: (value || null) as PracticeHelp | null }),
	notes: (value: string) => ({ notes: value || null }),
	solvedOn: (value: string) => ({ solvedOn: parseLocalSolvedOn(value) }),
	timeSpent: (value: string) => ({ timeSpent: parseActiveMinutes(value) }),
} satisfies Record<keyof PracticeFields, (value: string) => PracticeFields>;

function useListPage() {
	const { theme } = useTheme();
	const { showGeneralToast, showErrorToast } = useToast();
	const api = useListApi();
	const { data: lists, error, isLoading } = api.useGetAllListsQuery();
	const { getSearchParam, updateSearchParam, deleteSearchParam } = useAppSearchParams();
	const { navigateTo } = useAppNavigation();
	const listId = getSearchParam(SearchKeys.ListId);
	const activeList = lists?.find(list => list.id.toString() === listId);
	const activeListId = activeList?.id;
	const { data: list, isLoading: listLoading, isFetching, error: listError } = api.useGetListQuery(activeListId);
	const { problemsById } = useProblemsStore({ skip: activeListId === undefined });
	const { submissions, hasCompleteHistory } = useSubmissionsStore({ skip: activeListId === undefined });
	const cfStatuses = useMemo(() => codeforcesStatuses(submissions), [submissions]);
	const [details, setDetails] = useState(() => initialDetails(activeListId));
	const pendingWrites = useRef(new Set<symbol>());
	if (details.listId !== activeListId) setDetails(initialDetails(activeListId));

	const { filters, selection, copyTo, csvImport } = details;
	const items = list?.items ?? EMPTY_ARRAY;
	const search = filters.search.trim().toLowerCase();
	const visible = items.filter(item => {
		const problem = problemsById.get(item.problemId);
		return (!filters.status || (effectiveStatus(item) ?? "unset") === filters.status)
			&& (!filters.help || (item.helpUsed ?? "unset") === filters.help)
			&& (item.problemId.toLowerCase().includes(search) || problem?.name.toLowerCase().includes(search));
	});
	const selected = visible.filter(item => selection.has(item.problemId));
	const selectedIds = new Set(selected.map(item => item.problemId));
	const copyLists = (lists ?? EMPTY_ARRAY).filter(candidate => candidate.id !== activeListId);
	const copyDestination = copyLists.find(candidate => String(candidate.id) === copyTo)?.id;
	const busy = details.busy || isFetching;
	const csvPreview = csvImport.file && csvImport.mapping.problemId !== undefined && csvImport.result === undefined
		? previewListCsv(csvImport.file, csvImport.mapping, csvImport.unit, new Set(items.map(item => item.problemId)))
		: undefined;
	const csvOverCapacity = csvPreview !== undefined && csvPreview.items.length + items.length > LIST_CAPACITY;

	function updateDetails(change: (current: typeof details) => Partial<typeof details>) {
		// A response from a previous visit cannot change the current list's controls.
		setDetails(current => current.visit === details.visit ? { ...current, ...change(current) } : current);
	}

	function effectiveStatus(item: ListItem) {
		return item.status ?? cfStatuses.get(item.problemId) ?? (hasCompleteHistory ? "not_started" : undefined);
	}

	function changeFilters(change: Partial<typeof filters>) {
		updateDetails(current => ({ filters: { ...current.filters, ...change }, selection: new Set() }));
	}

	function selectVisible() {
		if (selected.length === visible.length) updateDetails(() => ({ selection: new Set() }));
		else updateDetails(() => ({ selection: new Set(visible.map(item => item.problemId)) }));
	}

	function selectItem(problemId: string, checked: boolean) {
		updateDetails(current => {
			const next = new Set(current.selection);
			if (checked) next.add(problemId);
			else next.delete(problemId);
			return { selection: next };
		});
	}

	async function write<T>(action: (activeId: number) => Promise<T>): Promise<T> {
		if (activeListId === undefined) throw new Error("Choose a list first.");
		if (busy || pendingWrites.current.has(details.visit)) throw new Error("Wait for the current list change to finish.");
		pendingWrites.current.add(details.visit);
		updateDetails(() => ({ busy: true, announcement: "" }));
		try {
			return await action(activeListId);
		} finally {
			pendingWrites.current.delete(details.visit);
			updateDetails(() => ({ busy: false }));
		}
	}

	async function removeSelected() {
		const { removedProblemIds, absentProblemIds } = await write(id => api.removeProblemsFromList(id, [...selectedIds]));
		const alreadyRemoved = absentProblemIds.length ? ` · Already absent ${absentProblemIds.length}` : "";
		updateDetails(current => ({
			selection: new Set([...current.selection].filter(id => !selectedIds.has(id))),
			announcement: `Removed ${removedProblemIds.length}${alreadyRemoved}.`,
		}));
	}

	async function copySelected() {
		if (copyDestination === undefined) return;
		await write(async () => {
			const destination = await api.getListWithItems(copyDestination);
			const existingIds = new Set(destination.items.map(item => item.problemId));
			const additions = selected.filter(item => !existingIds.has(item.problemId));
			const skipped = selected.length - additions.length;
			const result = additions.length > 0 ? await api.addListItems(copyDestination, additions) : undefined;
			const duplicates = skipped + (result?.duplicateProblemIds.length ?? 0);
			updateDetails(() => ({ announcement: `Copied ${result?.added.length ?? 0} · Duplicates skipped ${duplicates}.` }));
		});
	}

	async function savePracticeField(problemId: string, field: keyof PracticeFields, value: string) {
		const patch = practiceFieldPatch[field](value);
		const invalid = practiceError(patch);
		if (invalid !== undefined) throw new Error(invalid);
		await write(id => api.updateListItem(id, problemId, patch));
		updateDetails(() => ({ announcement: `Saved practice details for ${problemId}.` }));
	}

	function reportError(reason: unknown) {
		showErrorToast(reason instanceof Error ? reason.message : "Could not update this list.");
	}

	function resetCsvImport() {
		updateDetails(() => ({ csvImport: initialCsvImport() }));
	}

	function updateCsvImport(request: symbol, change: Partial<CsvImportState>) {
		updateDetails(current => current.csvImport.request === request
			? { csvImport: { ...current.csvImport, ...change } }
			: {});
	}

	function changeCsvMapping(field: keyof CsvMapping, column: number | undefined) {
		updateDetails(current => ({
			csvImport: { ...current.csvImport, mapping: { ...current.csvImport.mapping, [field]: column } },
		}));
	}

	async function readCsvFile(selectedFile?: File) {
		const next = initialCsvImport();
		updateDetails(() => ({ csvImport: next }));
		if (selectedFile === undefined) return;
		try {
			const file = parseListCsv(await selectedFile.text());
			const mapping = defaultCsvMapping(file.headers);
			updateCsvImport(next.request, { file, mapping, unit: mapping.timeSpent === undefined ? "minutes" : "seconds" });
		} catch (reason) {
			updateCsvImport(next.request, { error: reason instanceof Error ? reason.message : "Could not read the CSV file." });
		}
	}

	async function importCsv() {
		if (busy || !csvPreview?.items.length || csvOverCapacity) return;
		updateCsvImport(csvImport.request, { error: undefined });
		try {
			const { added, duplicateProblemIds } = await write(id => api.addListItems(id, csvPreview.items));
			const skipped = csvPreview.rows.length - csvPreview.items.length + duplicateProblemIds.length;
			updateCsvImport(csvImport.request, { result: `Imported ${added.length} · Skipped ${skipped}.` });
		} catch (reason) {
			updateCsvImport(csvImport.request, { error: reason instanceof Error ? reason.message : "CSV import failed." });
		}
	}

	function downloadCsv() {
		if (list === undefined) return;
		const csv = new Blob([exportListCsv(items)], { type: "text/csv;charset=utf-8" });
		const url = URL.createObjectURL(csv);
		const download = document.createElement("a");
		download.href = url;
		download.download = `${list.name}.csv`;
		download.click();
		setTimeout(() => URL.revokeObjectURL(url), 0);
	}

	function listClicked(listName: string) {
		let list = lists?.find(list => list.name === listName);
		if (isDefined(list))
			updateSearchParam(SearchKeys.ListId, list.id.toString());
		else
			deleteSearchParam(SearchKeys.ListId);
	}

	async function createNewList(listName: string) {
		console.log(listName);
		showGeneralToast(`Creating a list with name:${listName}.`);

		try {
			let res = await api.createList(listName);
			console.log(res);
			return true;
		}
		catch (err: any) {
			showErrorToast(err?.message ?? "Failed to create the list!");
			return false;
		}
	}

	async function updateListName(newName: string) {
		showGeneralToast(`Update list ${activeList?.name}, name to ${newName}`);
		if (activeList === undefined) throw new Error("No active list!");

		try {
			let res = await api.updateListName(activeList.id, newName);
			console.log(res);
			return true;
		}
		catch (err: any) {
			showErrorToast(err?.message ?? "Failed to update list name!");
			return false;
		}
	}

	function addButtonClicked() {
		if (activeList === undefined) return;
		navigateTo(Path.PROBLEMS, {
			[SearchKeys.ListId]: activeList.id,
			[SearchKeys.UseFilterStorage]: false,
		});
	}

	async function deleteListButtonClicked() {
		if (activeList === undefined) return false;
		try {
			let res = await api.deleteList(activeList.id);
			console.log(res);
			showGeneralToast("List deleted");
			deleteSearchParam(SearchKeys.ListId);
			return true;
		} catch (err: any) {
			showErrorToast(err?.message ?? "Failed to delete the list");
			return false;
		}
	}

	return {
		lists: lists ?? EMPTY_ARRAY,
		theme,
		listClicked,
		activeList,
		createNewList,
		error,
		isLoading,
		addButtonClicked,
		updateListName,
		deleteListButtonClicked,
		details: {
			list, isLoading: listLoading, error: listError, problemsById, effectiveStatus, busy, filters, changeFilters,
			visible, selection, selectedCount: selected.length, copyLists, selectVisible, selectItem,
			copyDestination,
			changeCopyDestination: (destination: string) => updateDetails(() => ({ copyTo: destination })),
			copySelected, removeSelected, savePracticeField, reportError, downloadCsv, resetCsvImport,
			announcement: details.announcement,
			csvImport: {
				headers: csvImport.file?.headers,
				mapping: csvImport.mapping,
				unit: csvImport.unit,
				error: csvImport.error,
				result: csvImport.result,
				preview: csvPreview && {
					rows: csvPreview.rows,
					readyCount: csvPreview.items.length,
					skippedCount: csvPreview.rows.length - csvPreview.items.length,
				},
				overCapacity: csvOverCapacity,
				readFile: readCsvFile,
				changeMapping: changeCsvMapping,
				changeUnit: (unit: CsvImportState["unit"]) => updateCsvImport(csvImport.request, { unit }),
				submit: importCsv,
			},
		},
	};
}

export default useListPage;
export type ListDetails = ReturnType<typeof useListPage>["details"];
