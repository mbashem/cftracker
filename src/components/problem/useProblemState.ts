import { useCallback, useMemo, useState } from "react";
import useAdvancedState, { type SearchRecord } from "../../hooks/useAdvancedState";
import { type ValidatorRecord, validators } from "../../util/validators";
import { Verdict } from "../../types/CF/Submission";
import { StorageService } from "../../util/StorageService";
import { SearchKeys } from "../../util/constants";

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

export type UpdateProblemFilter = Partial<ProblemFilter> | ((filter: ProblemFilter) => Partial<ProblemFilter>);

interface ProblemState extends ProblemFilter {
  tags: string[];
  solveStatus: Verdict[];
  selected: number;
}

const DEFAULT_SOLVE_STATUS = [Verdict.SOLVED, Verdict.ATTEMPTED, Verdict.UNSOLVED];

function createDefaultProblemState(
  minRating: number,
  maxRating: number,
  minContestId: number,
  maxContestId: number,
): ProblemState {
  return {
    perPage: 100,
    minRating,
    maxRating,
    showUnrated: true,
    minContestId,
    maxContestId,
    minContestDate: undefined,
    maxContestDate: undefined,
    search: "",
    tags: [],
    solveStatus: DEFAULT_SOLVE_STATUS,
    selected: 0,
  };
}
const problemSearchKeys = {
  perPage: SearchKeys.PerPage,
  minRating: SearchKeys.MinRating,
  maxRating: SearchKeys.MaxRating,
  showUnrated: SearchKeys.ShowUnrated,
  minContestId: SearchKeys.MinContestId,
  maxContestId: SearchKeys.MaxContestId,
  minContestDate: SearchKeys.MinContestDate,
  maxContestDate: SearchKeys.MaxContestDate,
  search: SearchKeys.Search,
  tags: SearchKeys.Tags,
  solveStatus: SearchKeys.Status,
  selected: SearchKeys.Page,
} satisfies SearchRecord<ProblemState>;

const problemValidators = {
  perPage: validators.positiveInteger,
  minRating: validators.nonNegativeInteger,
  maxRating: validators.nonNegativeInteger,
  showUnrated: validators.boolean,
  minContestId: validators.positiveInteger,
  maxContestId: validators.positiveInteger,
  minContestDate: validators.date,
  maxContestDate: validators.date,
  search: validators.string,
  tags: validators.stringArray,
  solveStatus: validators.enumArray(DEFAULT_SOLVE_STATUS),
  selected: validators.nonNegativeInteger,
} satisfies ValidatorRecord<ProblemState>;

function useProblemState(
  useStorage: boolean,
  minRating: number,
  maxRating: number,
  minContestId: number,
  maxContestId: number,
) {
  const [defaultState] = useState(() => createDefaultProblemState(
    minRating,
    maxRating,
    minContestId,
    maxContestId,
  ));
  const [state, setState] = useAdvancedState(
    defaultState,
    useStorage ? StorageService.Keys.Problem.State : undefined,
    problemSearchKeys,
    problemValidators,
  );
  const filter: ProblemFilter = state;
  const tags = useMemo(() => new Set(state.tags), [state.tags]);
  const solveStatus = useMemo(() => new Set(state.solveStatus), [state.solveStatus]);

  const updateFilter = useCallback((value: UpdateProblemFilter) => {
    setState((previousState) => ({
      ...previousState,
      ...(typeof value === "function" ? value(previousState) : value),
    }));
  }, [setState]);
  const setTags = useCallback((tags: Set<string>) => {
    setState((previousState) => ({ ...previousState, tags: [...tags] }));
  }, [setState]);
  const setSolveStatus = useCallback((solveStatus: Set<Verdict>) => {
    setState((previousState) => ({ ...previousState, solveStatus: [...solveStatus] }));
  }, [setState]);
  const setSelected = useCallback((selected: number) => {
    setState((previousState) => ({ ...previousState, selected }));
  }, [setState]);

  return {
    filter,
    tags,
    solveStatus,
    selected: state.selected,
    updateFilter,
    setTags,
    setSolveStatus,
    setSelected,
  };
}

export default useProblemState;
