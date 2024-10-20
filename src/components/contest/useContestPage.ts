import { useCallback, useEffect, useMemo, useState } from "react";
import useSubmissionsStore from "../../data/hooks/useSubmissionsStore";
import useTheme from "../../data/hooks/useTheme";
import { useAppSelector } from "../../data/store";
import useAppSearchParams from "../../hooks/useSearchParam";
import Contest, { ContestCat } from "../../types/CF/Contest";
import { Verdict } from "../../types/CF/Submission";
import { StorageService } from "../../util/StorageService";
import { SearchKeys } from "../../util/constants";
import { ParticipantType } from "../../types/CF/Party";
import useContestStore from "../../data/hooks/useContestStore";

interface Filter {
	perPage: number;
	showDate: boolean;
	showRating: boolean;
	showColor: boolean;
	search: string;
	selectedCategories: ContestCat[];
	canSelectMultipleCategories: boolean;
}

function useContestPage() {
	const state = useAppSelector((state) => {
		return {
			appState: state.appState,
			problemList: state.problemList,
		};
	});

	const { theme } = useTheme();
	const { searchParams, updateSearchParam, deleteSearchParam } = useAppSearchParams();
	const { submissions: userSubmissions } = useSubmissionsStore();
	const { contests } = useContestStore();

	const [contestList, setContestList] = useState<{
		contests: Contest[];
		error: string;
	}>({ contests: [], error: "" });

	const [randomContest, setRandomContest] = useState(-1);

	const defaultFilt: Filter = {
		perPage: 100,
		showDate: false,
		showRating: true,
		showColor: true,
		selectedCategories: [ContestCat.DIV2],
		search: searchParams.get(SearchKeys.Search) ?? "",
		canSelectMultipleCategories: false,
	};

	enum ContestSave {
		SolveStatus = "CONTEST_SOLVE_STATUS",
		ParticipantType = "PARTICIPANT_TYPE",
		Filter = "CONTEST_FILTER",
	}

	const [filter, setFilter] = useState<Filter>(StorageService.getObject(ContestSave.Filter, defaultFilt));

	const categoryFilter = useMemo(() => {
		return {
			selectedCategories: filter.selectedCategories,
			canSelectMultipleCategories: filter.canSelectMultipleCategories
		};
	}, [filter.selectedCategories, filter.canSelectMultipleCategories]);

	const selectableVerdictStatuses = useMemo(() => [Verdict.SOLVED, Verdict.ATTEMPTED, Verdict.UNSOLVED], []);

	const allParticipantType = useMemo(() => Object.keys(ParticipantType), []);

	const [selected, setSelected] = useState(0);
	const [solveStatus, setSolveStatus] = useState(StorageService.getSet(ContestSave.SolveStatus, selectableVerdictStatuses));
	const [participant, setParticipant] = useState(StorageService.getSet(ContestSave.ParticipantType, allParticipantType));

	const currentPageContests = useMemo(() => {
		if (randomContest !== -1) {
			return [contestList.contests[randomContest]];
		}

		return getCurrentPageContests();
	}, [contestList, filter.perPage, randomContest]);

	const submissions = useMemo(() => {
		let currRec: Map<number, Map<Verdict, Set<string>>> = new Map();
		for (let sub of userSubmissions) {
			if (sub.contestId === undefined || sub.index === undefined || !participant.has(sub.author.participantType))
				continue;
			let ver = sub.verdict === Verdict.OK ? Verdict.SOLVED : Verdict.ATTEMPTED;
			if (!currRec.has(sub.contestId)) currRec.set(sub.contestId, new Map<Verdict, Set<string>>());
			if (!currRec.get(sub.contestId)!.has(ver)) currRec.get(sub.contestId)!.set(ver, new Set());
			currRec.get(sub.contestId)!.get(ver)!.add(sub.index);
		}
		return currRec;
	}, [userSubmissions, participant]);

	function contestStatus(contest: Contest) {
		if (!submissions.has(contest.id)) return Verdict.UNSOLVED;
		if (submissions.get(contest.id)?.has(Verdict.SOLVED)) return Verdict.SOLVED;
		return Verdict.ATTEMPTED;
	};

	function filterContest(contest: Contest) {
		let status = solveStatus.has(contestStatus(contest));

		let searchIncluded = true;

		let text = filter.search.toLowerCase().trim();

		if (text.length) searchIncluded = contest.name.toLowerCase().includes(text) || contest.id.toString().includes(text);

		let catIn = false;

		if (
			filter.selectedCategories.length === 0 ||
			(contest.category !== undefined && filter.selectedCategories.includes(contest.category))
		)
			catIn = true;

		return status && searchIncluded && contest.count !== 0 && catIn;
	};

	function getCurrentPageContests() {
		let lo = selected * filter.perPage;
		let high = Math.min(contestList.contests.length, lo + filter.perPage);

		if (lo > high) return [];
		return contestList.contests.slice(lo, high);
	}

	useEffect(() => {
		StorageService.saveObject(ContestSave.Filter, filter);
		if (filter.search.trim().length) updateSearchParam(SearchKeys.Search, filter.search.trim());
		else deleteSearchParam(SearchKeys.Search);

		const newContestList = contests.filter((contest) => filterContest(contest));

		setContestList({ ...contestList, contests: newContestList });
		setRandomContest(-1);
	}, [state.problemList.problems, filter, solveStatus, submissions]);

	useEffect(() => {
		if (!filter.canSelectMultipleCategories) {
			let newSelectedCategory = filter.selectedCategories.length === 0 ? ContestCat.DIV2 : filter.selectedCategories[0];
			updateFilter({ selectedCategories: [newSelectedCategory] });
		}
	}, [filter.canSelectMultipleCategories]);

	useEffect(() => {
		setSelected(0);
	}, [filter.selectedCategories]);

	function updateSolveStatus(status: Set<Verdict>) {
		setSolveStatus(status);
		StorageService.saveSet(ContestSave.SolveStatus, status);
	}

	function updateParticipantsType(participantType: Set<string>) {
		setParticipant(participantType);
		StorageService.saveSet(ContestSave.ParticipantType, participantType);
	}

	const updateFilter = useCallback((partialFilter: Partial<Filter>) => {
		setFilter((prvFilter) => ({ ...prvFilter, ...partialFilter }));
	}, [setFilter]);

	const setCategories = useCallback(
		(categories: ContestCat[]) => updateFilter({ selectedCategories: Array.from(categories) }),
		[updateFilter]
	);

	const setUpdatedCanSelectMultipleCategories = useCallback(
		(updatedCanSelectMultipleCategories: boolean) =>
			updateFilter({ canSelectMultipleCategories: updatedCanSelectMultipleCategories }),
		[updateFilter]
	);

	return {
		state,
		theme,
		contestList,
		selected,
		filter,
		solveStatus,
		submissions,
		allParticipantType,
		participant,
		currentPageContests,
		selectableVerdictStatuses,
		categoryFilter,
		updateFilter,
		setSelected,
		setSolveStatus: updateSolveStatus,
		setParticipant: updateParticipantsType,
		setRandomContest,
		setCategories,
		setUpdatedCanSelectMultipleCategories
	};
}

export default useContestPage;