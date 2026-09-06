import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { SearchKeys } from "../../util/constants";
import useSubmissionsStore from "../../data/hooks/useSubmissionsStore";
import useTheme from "../../data/hooks/useTheme";
import useList from "../../data/hooks/useListApi";
import useAppSearchParams from "../../hooks/useSearchParam";
import usePersistentState from "../../hooks/usePersistentState";
import useProblemsStore from "../../data/hooks/useProblemsStore";
import { useAppSelector } from "../../data/store";
import useToast from "../../hooks/useToast";
import { ListWithItem } from "../../types/list";
import Problem from "../../types/CF/Problem";
import { Verdict } from "../../types/CF/Submission";
import { StorageService } from "../../util/StorageService";
import { RATING_CONSTANTS } from "../../util/cf";
import { formatDateInputValue } from "../../util/time";
import {
	clampNumber,
	getRandomInteger,
	isDefined,
	overrideObject,
	parseNonNegativeSafeInteger,
	parsePositiveSafeInteger,
} from "../../util/util";
import { sortByContestId, sortByRating, sortBySolveCount, SortOrder, SortProblemBy } from "../../util/sortMethods";
import useContestStore from "../../data/hooks/useContestStore";

export interface ProblemFilter {
	perPage: number;
	minRating: number;
	maxRating: number;
	showUnrated: boolean;
	minContestId: number;
	maxContestId: number;
	minContestDate: string | undefined;
	maxContestDate: string | undefined;
	search: string;
}

export interface ProblemFilterState {
	tags: Set<string>;
	sortBy: SortProblemBy;
	order: SortOrder;
}

export interface ProblemRatingRange {
	min: number;
	max: number;
	step: number;
	minValue: number;
	maxValue: number;
}

export type UpdateProblemFilter = Partial<ProblemFilter> | ((filter: ProblemFilter) => Partial<ProblemFilter>);

type ProblemSortState = Omit<ProblemFilterState, "tags">;

const SELECTABLE_VERDICT_STATUSES = [Verdict.SOLVED, Verdict.ATTEMPTED, Verdict.UNSOLVED];
const DEFAULT_SOLVE_STATUS = new Set(SELECTABLE_VERDICT_STATUSES);

function getRequestedSolveStatus(value: string | null): Verdict | undefined {
	switch (value) {
		case Verdict.SOLVED:
		case Verdict.ATTEMPTED:
		case Verdict.UNSOLVED:
			return value;
		default:
			return undefined;
	}
}

function getTimestampParam(value: string | null): number | undefined {
	if (value === null) return undefined;

	const timestamp = Number(value);
	return Number.isFinite(timestamp) && timestamp >= 0 ? timestamp : undefined;
}

function getNumberParam(value: string | null): number | undefined {
	if (value === null) return undefined;
	const number = Number(value);
	return Number.isFinite(number) ? number : undefined;
}

function getStringSet(value: string | null): Set<string> | undefined {
	if (value === null) return undefined;
	return new Set(value.split(",").map((item) => item.trim()).filter(Boolean));
}

function getSolveStatuses(value: string | null): Set<Verdict> | undefined {
	if (value === null) return undefined;
	const statuses = new Set<Verdict>();
	for (const item of value.split(",")) {
		const status = getRequestedSolveStatus(item);
		if (status !== undefined) statuses.add(status);
	}
	return statuses;
}

function getRatingRange(minRating: number, maxRating: number): ProblemRatingRange {
	const { min, max, interval: step } = RATING_CONSTANTS;
	const boundedMin = clampNumber(minRating, min, max);
	const boundedMax = clampNumber(maxRating, min, max);
	const steppedMin = min + Math.floor((boundedMin - min) / step) * step;
	const steppedMax = min + Math.ceil((boundedMax - min) / step) * step;

	return {
		min,
		max,
		step,
		minValue: Math.min(steppedMin, steppedMax),
		maxValue: Math.max(steppedMin, steppedMax),
	};
}

function useProblemPage() {
	const { searchParams, updateSearchParams, consumeSearchParams } = useAppSearchParams();
	const isRandomRequested = searchParams.get(SearchKeys.Random) === "true";
	const acceptedAfter = getTimestampParam(searchParams.get(SearchKeys.AcceptedAfter));
	const acceptedBefore = getTimestampParam(searchParams.get(SearchKeys.AcceptedBefore));
	const submissionSolveStatus = getSolveStatuses(searchParams.get(SearchKeys.SubmissionStatus));
	const useFilterStorage = searchParams.get(SearchKeys.UseFilterStorage) !== "false";
	const [listId, setListId] = useState<number | undefined>(undefined);
	const [list, setList] = useState<ListWithItem | undefined>(undefined);
	const nextListPosition = useRef(0);
	const { submissions } = useSubmissionsStore();
	const { theme } = useTheme();
	const api = useList();
	const { problemList: problemStore } = useProblemsStore();
	const [problemsAddedToList, setProblemsAddedToList] = useState<Set<string>>(new Set());
	const appState = useAppSelector((state) => state.appState);
	const { contests } = useContestStore();
	const { showErrorToast } = useToast();

	const defaultFilter: ProblemFilter = {
		perPage: 100,
		minRating: RATING_CONSTANTS.min,
		maxRating: RATING_CONSTANTS.max,
		showUnrated: true,
		minContestId: appState.minContestId,
		maxContestId: appState.maxContestId,
		minContestDate: undefined,
		maxContestDate: undefined,
		search: "",
	};

	const getFilterFromUrl = useCallback((baseFilter: ProblemFilter): ProblemFilter => overrideObject(baseFilter, {
		...(searchParams.has(SearchKeys.Search) ? { search: searchParams.get(SearchKeys.Search) ?? "" } : {}),
		...(parsePositiveSafeInteger(searchParams.get(SearchKeys.PerPage)) !== undefined
			? { perPage: parsePositiveSafeInteger(searchParams.get(SearchKeys.PerPage)) } : {}),
		...(getNumberParam(searchParams.get(SearchKeys.MinRating)) !== undefined
			? { minRating: getNumberParam(searchParams.get(SearchKeys.MinRating)) } : {}),
		...(getNumberParam(searchParams.get(SearchKeys.MaxRating)) !== undefined
			? { maxRating: getNumberParam(searchParams.get(SearchKeys.MaxRating)) } : {}),
		...(searchParams.has(SearchKeys.ShowUnrated)
			? { showUnrated: searchParams.get(SearchKeys.ShowUnrated) !== "false" } : {}),
		...(getNumberParam(searchParams.get(SearchKeys.MinContestId)) !== undefined
			? { minContestId: getNumberParam(searchParams.get(SearchKeys.MinContestId)) } : {}),
		...(getNumberParam(searchParams.get(SearchKeys.MaxContestId)) !== undefined
			? { maxContestId: getNumberParam(searchParams.get(SearchKeys.MaxContestId)) } : {}),
		...(searchParams.has(SearchKeys.MinContestDate)
			? { minContestDate: searchParams.get(SearchKeys.MinContestDate) || undefined } : {}),
		...(searchParams.has(SearchKeys.MaxContestDate)
			? { maxContestDate: searchParams.get(SearchKeys.MaxContestDate) || undefined } : {}),
	}), [searchParams]);
	const getInitialFilter = () => getFilterFromUrl(
		useFilterStorage
			? StorageService.getObject(StorageService.Keys.Problem.Filter, defaultFilter)
			: defaultFilter
	);
	const [filter, setFilter] = usePersistentState(
		StorageService.Keys.Problem.Filter,
		defaultFilter,
		getInitialFilter,
		useFilterStorage,
	);
	const [tags, setTags] = usePersistentState(
		StorageService.Keys.Problem.Tags,
		new Set<string>(),
		() => getStringSet(searchParams.get(SearchKeys.Tags)) ?? (
			useFilterStorage
				? StorageService.getSet(StorageService.Keys.Problem.Tags, []) as Set<string>
				: new Set<string>()
		),
		useFilterStorage,
	);
	const [filterSortState, setFilterSortState] = useState<ProblemSortState>({
		sortBy: SortProblemBy.SolveCount,
		order: SortOrder.Descending,
	});
	const [solveStatus, setSolveStatus] = usePersistentState<Set<Verdict>>(
		StorageService.Keys.Problem.SolveStatus,
		submissionSolveStatus ?? getSolveStatuses(searchParams.get(SearchKeys.Status)) ?? DEFAULT_SOLVE_STATUS,
		() => submissionSolveStatus ?? getSolveStatuses(searchParams.get(SearchKeys.Status)) ?? (
			useFilterStorage
				? StorageService.getSet(StorageService.Keys.Problem.SolveStatus, DEFAULT_SOLVE_STATUS) as Set<Verdict>
				: DEFAULT_SOLVE_STATUS
		),
		useFilterStorage,
	);
	const [randomProblem, setRandomProblem] = useState<number | undefined>(undefined);
	const [hasPendingRandomRequest, setHasPendingRandomRequest] = useState(false);
	const [selected, setSelected] = usePersistentState(
		StorageService.Keys.Problem.Page,
		0,
		() => parseNonNegativeSafeInteger(searchParams.get(SearchKeys.Page)) ?? (
			useFilterStorage ? StorageService.getObject(StorageService.Keys.Problem.Page, 0) : 0
		),
		useFilterStorage,
	);

	const filterState = useMemo<ProblemFilterState>(
		() => ({
			tags,
			sortBy: filterSortState.sortBy,
			order: filterSortState.order,
		}),
		[filterSortState.order, filterSortState.sortBy, tags]
	);

	const ratingRange = useMemo(
		() => getRatingRange(filter.minRating, filter.maxRating),
		[filter.maxRating, filter.minRating]
	);

	const state = useMemo(() => {
		return {
			appState,
			problemList: problemStore,
		};
	}, [appState, problemStore]);

	const contestDates = useMemo(() => {
		const dates = new Map<number, string>();

		for (const contest of contests) {
			if (contest.startTimeSeconds === undefined) continue;
			dates.set(contest.id, formatDateInputValue(new Date(contest.startTimeSeconds * 1000)));
		}

		return dates;
	}, [contests]);

	const { solved, attempted } = useMemo(() => {
		const solved = new Set<string>();
		const attempted = new Set<string>();
		const filterByAcceptedSubmission = acceptedAfter !== undefined
			|| acceptedBefore !== undefined;

		for (const submission of submissions) {
			if (filterByAcceptedSubmission && (
				submission.verdict !== Verdict.OK
				|| (acceptedAfter !== undefined && submission.creationTimeSeconds < acceptedAfter)
				|| (acceptedBefore !== undefined && submission.creationTimeSeconds >= acceptedBefore)
			)) continue;

			const problemId = submission.contestId.toString() + submission.index;
			if (submission.verdict === Verdict.OK) solved.add(problemId);
			else attempted.add(problemId);
		}

		return { solved, attempted };
	}, [acceptedAfter, acceptedBefore, submissions]);

	const getProblemStatus = useCallback(
		(problem: Problem) => {
			if (solved.has(problem.id)) return Verdict.SOLVED;
			if (attempted.has(problem.id)) return Verdict.ATTEMPTED;
			return Verdict.UNSOLVED;
		},
		[attempted, solved]
	);

	const filterProblem = useCallback(
		(problem: Problem) => {
			let containTags = false;

			if (filterState.tags.size === 0) containTags = true;
			else
				for (const tag of problem.tags)
					if (filterState.tags.has(tag)) {
						containTags = true;
						break;
					}

			const ratingInside = problem.rating > 0
				? problem.rating <= ratingRange.maxValue && problem.rating >= ratingRange.minValue
				: filter.showUnrated;
			const contestIdInside = problem.contestId <= filter.maxContestId && problem.contestId >= filter.minContestId;
			const contestDate = contestDates.get(problem.contestId);
			const contestDateInside = contestDate === undefined || (
				(filter.minContestDate === undefined || contestDate >= filter.minContestDate) &&
				(filter.maxContestDate === undefined || contestDate <= filter.maxContestDate)
			);
			const status = solveStatus.has(getProblemStatus(problem));

			let searchIncluded = true;
			const text = filter.search.toLowerCase().trim();
			if (text.length) searchIncluded = problem.name.toLowerCase().includes(text) || problem.id.toLowerCase().includes(text);

			return status && ratingInside && containTags && searchIncluded && contestIdInside && contestDateInside;
		},
		[contestDates, filter, filterState.tags, getProblemStatus, ratingRange, solveStatus]
	);

	const filteredProblems = useMemo(() => {
		const newProblemsList = problemStore.problems.filter((problem: Problem) => filterProblem(problem));

		if (filterState.sortBy === SortProblemBy.Rating) newProblemsList.sort(sortByRating);
		else if (filterState.sortBy === SortProblemBy.Id) newProblemsList.sort(sortByContestId);
		else newProblemsList.sort(sortBySolveCount);

		if (filterState.order === SortOrder.Descending) newProblemsList.reverse();

		return newProblemsList;
	}, [filterProblem, filterState.order, filterState.sortBy, problemStore.problems]);

	const problemList = useMemo(() => {
		return {
			problems: filteredProblems,
			error: problemStore.error,
		};
	}, [filteredProblems, problemStore.error]);

	const tagList = useMemo(() => ({ tags: [...problemStore.tags] }), [problemStore.tags]);

	const currentPageProblems = useMemo(() => {
		if (randomProblem !== undefined) {
			const problem = problemList.problems[randomProblem];
			return problem ? [problem] : [];
		}

		const lo = selected * filter.perPage;
		const high = Math.min(problemList.problems.length, lo + filter.perPage);

		if (lo > high) return [];
		return problemList.problems.slice(lo, high);
	}, [filter.perPage, problemList.problems, randomProblem, selected]);

	useEffect(() => {
		if (listId === undefined) return;
		nextListPosition.current = 0;

		api.getListWithItems(listId).then(listWithItems => {
			setList(listWithItems);
			nextListPosition.current = listWithItems.items.reduce(
				(max, item) => Math.max(max, item.position),
				-1
			) + 1;
			setProblemsAddedToList(new Set(listWithItems.items.map(listItem => listItem.problemId)));
		}).catch(err => {
			showErrorToast(err?.message ?? "Failed to find allready added problems");
		});

	}, [listId]);

	useEffect(() => {
		let listIdString = searchParams.get(SearchKeys.ListId);
		setListId(listIdString ? parseInt(listIdString) : undefined);
	}, [searchParams]);

	const searchParamsKey = searchParams.toString();
	const lastAppliedSearchParams = useRef(searchParamsKey);
	const isApplyingSearchParams = useRef(false);

	useEffect(() => {
		if (lastAppliedSearchParams.current === searchParamsKey) return;
		lastAppliedSearchParams.current = searchParamsKey;
		isApplyingSearchParams.current = true;
		const baseFilter = useFilterStorage
			? StorageService.getObject(StorageService.Keys.Problem.Filter, defaultFilter)
			: defaultFilter;
		setFilter(getFilterFromUrl(baseFilter));
		setTags(getStringSet(searchParams.get(SearchKeys.Tags)) ?? (
			useFilterStorage
				? StorageService.getSet(StorageService.Keys.Problem.Tags, []) as Set<string>
				: new Set<string>()
		));
		const statuses = getSolveStatuses(searchParams.get(SearchKeys.SubmissionStatus))
			?? getSolveStatuses(searchParams.get(SearchKeys.Status));
		setSolveStatus(statuses ?? (
			useFilterStorage
				? StorageService.getSet(StorageService.Keys.Problem.SolveStatus, DEFAULT_SOLVE_STATUS) as Set<Verdict>
				: DEFAULT_SOLVE_STATUS
		));
		setSelected(parseNonNegativeSafeInteger(searchParams.get(SearchKeys.Page)) ?? (
			useFilterStorage ? StorageService.getObject(StorageService.Keys.Problem.Page, 0) : 0
		));
	}, [defaultFilter, getFilterFromUrl, searchParams, searchParamsKey, setFilter, setSelected, setSolveStatus, setTags, useFilterStorage]);

	useEffect(() => {
		if (isApplyingSearchParams.current) {
			isApplyingSearchParams.current = false;
			return;
		}

		const statusKey = searchParams.has(SearchKeys.SubmissionStatus)
			? SearchKeys.SubmissionStatus
			: SearchKeys.Status;
		const otherStatusKey = statusKey === SearchKeys.Status
			? SearchKeys.SubmissionStatus
			: SearchKeys.Status;
		updateSearchParams(new Map<SearchKeys, string | undefined>([
			[SearchKeys.Search, filter.search.trim() || undefined],
			[SearchKeys.PerPage, String(filter.perPage)],
			[SearchKeys.MinRating, String(filter.minRating)],
			[SearchKeys.MaxRating, String(filter.maxRating)],
			[SearchKeys.ShowUnrated, String(filter.showUnrated)],
			[SearchKeys.MinContestId, String(filter.minContestId)],
			[SearchKeys.MaxContestId, String(filter.maxContestId)],
			[SearchKeys.MinContestDate, filter.minContestDate],
			[SearchKeys.MaxContestDate, filter.maxContestDate],
			[SearchKeys.Tags, tags.size > 0 ? [...tags].sort().join(",") : undefined],
			[statusKey, [...solveStatus].join(",")],
			[otherStatusKey, undefined],
			[SearchKeys.Page, selected > 0 ? String(selected) : undefined],
		]));
	}, [filter, searchParams, searchParamsKey, selected, solveStatus, tags, updateSearchParams]);

	useEffect(() => {
		setRandomProblem(undefined);
	}, [filteredProblems]);

	useEffect(() => {
		if (!isRandomRequested) return;
		setHasPendingRandomRequest(true);
		consumeSearchParams([SearchKeys.Random]);
	}, [consumeSearchParams, isRandomRequested]);

	useEffect(() => {
		if (!hasPendingRandomRequest || problemStore.loading) return;

		setHasPendingRandomRequest(false);
		setRandomProblem(
			filteredProblems.length > 0
				? getRandomInteger(0, filteredProblems.length)
				: undefined
		);
	}, [filteredProblems, hasPendingRandomRequest, problemStore.loading]);

	const updateFilter = useCallback((value: UpdateProblemFilter) => {
		setFilter((previousFilter) => ({
			...previousFilter,
			...(typeof value === "function" ? value(previousFilter) : value),
		}));
	}, []);

	const updateSolveStatus = useCallback((status: Set<Verdict>) => {
		setSolveStatus(status);
	}, []);

	const updateTags = useCallback((tags: Set<string>) => {
		setTags(tags);
	}, []);

	const sortList = useCallback((sortBy: SortProblemBy) => {
		setFilterSortState((previousFilterState) => {
			if (previousFilterState.sortBy === sortBy) {
				return {
					...previousFilterState,
					order: (previousFilterState.order ^ 1) as SortOrder,
				};
			}

			return {
				...previousFilterState,
				order: sortBy === SortProblemBy.Rating ? SortOrder.Ascending : SortOrder.Descending,
				sortBy,
			};
		});
	}, []);

	async function addProblemToList(problemId: string) {
		if (listId === undefined) throw new Error("ListId is undefined");
		try {
			const position = nextListPosition.current;
			nextListPosition.current += 1;
			const item = await api.addProblemToList(listId, problemId, position);
			setList((currentList) => currentList === undefined
				? currentList
				: { ...currentList, items: [...currentList.items, item] }
			);
			let newProblemsAddedToList = new Set(problemsAddedToList);
			newProblemsAddedToList.add(problemId);
			setProblemsAddedToList(newProblemsAddedToList);
			return;
		} catch (err) {
			throw err;
		}
	}

	async function deleteProblemFromList(problemId: string) {
		if (listId === undefined) throw new Error("ListId is undefined");
		try {
			let res = await api.deleteProblemFromList(listId, problemId);
			console.log(res);
			let newProblemsAddedToList = new Set(problemsAddedToList);
			newProblemsAddedToList.delete(problemId);
			setProblemsAddedToList(newProblemsAddedToList);
			return;
		} catch (err) {
			throw err;
		}
	}

	return {
		state,
		theme,
		list,
		problemList,
		tagList,
		selected,
		filter,
		filterState,
		ratingRange,
		solveStatus,
		solved,
		attempted,
		currentPageProblems,
		selectableVerdictStatuses: SELECTABLE_VERDICT_STATUSES,
		showAddToList: isDefined(listId),
		problemsAddedToList,
		isRandomActive: randomProblem !== undefined,
		acceptedRange: {
			after: acceptedAfter,
			before: acceptedBefore,
		},
		updateFilter,
		setSelected,
		setSolveStatus: updateSolveStatus,
		setTags: updateTags,
		setRandomProblem,
		sortList,
		addProblemToList,
		deleteProblemFromList,
	};
}

export default useProblemPage;
