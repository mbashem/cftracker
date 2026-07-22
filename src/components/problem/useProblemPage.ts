import { useCallback, useEffect, useMemo, useState } from "react";
import { SearchKeys } from "../../util/constants";
import useSubmissionsStore from "../../data/hooks/useSubmissionsStore";
import useTheme from "../../data/hooks/useTheme";
import useList from "../../data/hooks/useListApi";
import useAppSearchParams from "../../hooks/useSearchParam";
import usePersistentState from "../../hooks/usePersistentState";
import useProblemsStore from "../../data/hooks/useProblemsStore";
import { useAppSelector } from "../../data/store";
import useToast from "../../hooks/useToast";
import { List } from "../../types/list";
import Problem from "../../types/CF/Problem";
import { Verdict } from "../../types/CF/Submission";
import { StorageService } from "../../util/StorageService";
import { RATING_CONSTANTS } from "../../util/cf";
import { formatDateInputValue } from "../../util/time";
import { clampNumber, isDefined, overrideObject } from "../../util/util";
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
	const { searchParams, updateSearchParam, deleteSearchParam } = useAppSearchParams();
	const searchTextFromUrl = searchParams.get(SearchKeys.Search) ?? undefined;
	const [listId, setListId] = useState<number | undefined>(undefined);
	const [list, setList] = useState<List | undefined>(undefined);
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

	const selectableVerdictStatuses = useMemo(() => [Verdict.SOLVED, Verdict.ATTEMPTED, Verdict.UNSOLVED], []);
	const defaultSolveStatus = useMemo(() => new Set(selectableVerdictStatuses), [selectableVerdictStatuses]);
	const [filter, setFilter] = usePersistentState(
		StorageService.Keys.Problem.Filter,
		defaultFilter,
		searchTextFromUrl === undefined
			? undefined
			: () => overrideObject(StorageService.getObject(StorageService.Keys.Problem.Filter, defaultFilter), { search: searchTextFromUrl })
	);
	const [tags, setTags] = usePersistentState(StorageService.Keys.Problem.Tags, new Set<string>());
	const [filterSortState, setFilterSortState] = useState<ProblemSortState>({
		sortBy: SortProblemBy.SolveCount,
		order: SortOrder.Descending,
	});
	const [solveStatus, setSolveStatus] = usePersistentState<Set<Verdict>>(
		StorageService.Keys.Problem.SolveStatus,
		defaultSolveStatus
	);
	const [randomProblem, setRandomProblem] = useState<number | undefined>(undefined);
	const [selected, setSelected] = useState(0);

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

		for (const submission of submissions) {
			const problemId = submission.contestId.toString() + submission.index;
			if (submission.verdict === Verdict.OK) solved.add(problemId);
			else attempted.add(problemId);
		}

		return { solved, attempted };
	}, [submissions]);

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

		api.getListWithItems(listId).then(listWithItems => {
			setList(listWithItems);
			setProblemsAddedToList(new Set(listWithItems.items.map(listItem => listItem.problemId)));
		}).catch(err => {
			showErrorToast(err?.message ?? "Failed to find allready added problems");
		});

	}, [listId]);

	useEffect(() => {
		let listIdString = searchParams.get(SearchKeys.ListId);
		setListId(listIdString ? parseInt(listIdString) : undefined);
	}, [searchParams]);

	useEffect(() => {
		const trimmedSearch = filter.search.trim();
		if (trimmedSearch.length) updateSearchParam(SearchKeys.Search, trimmedSearch);
		else deleteSearchParam(SearchKeys.Search);
	}, [filter]);

	useEffect(() => {
		setRandomProblem(undefined);
		setSelected(0);
	}, [filteredProblems]);

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
			let res = await api.addProblemToList(listId, problemId);
			console.log(res);
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
		selectableVerdictStatuses,
		showAddToList: isDefined(listId),
		problemsAddedToList,
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
