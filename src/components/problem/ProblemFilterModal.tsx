import type { AppState } from "../../data/reducers/appSlice";
import { Verdict } from "../../types/CF/Submission";
import Theme from "../../util/Theme";
import CustomModal from "../common/CustomModal";
import CheckList from "../common/forms/CheckList";
import InputRange from "../common/forms/Input/InputRange";
import type { ProblemFilter, ProblemFilterState, UpdateProblemFilter } from "./useProblemPage";

interface ProblemFilterModalProps {
  theme: Theme;
  appState: AppState;
  filter: ProblemFilter;
  filterState: ProblemFilterState;
  selectableVerdictStatuses: Verdict[];
  solveStatus: Set<Verdict>;
  tags: string[];
  updateFilter: (value: UpdateProblemFilter) => void;
  setSolveStatus: (status: Set<Verdict>) => void;
  setTags: (tags: Set<string>) => void;
}

function ProblemFilterModal({
  theme,
  appState,
  filter,
  filterState,
  selectableVerdictStatuses,
  solveStatus,
  tags,
  updateFilter,
  setSolveStatus,
  setTags,
}: ProblemFilterModalProps) {
  return (
    <CustomModal title="Filter" theme={theme}>
      <CheckList
        items={selectableVerdictStatuses}
        active={solveStatus}
        name={"Solve Status"}
        onClickSet={setSolveStatus}
        theme={theme}
      />
      <InputRange
        min={appState.minRating}
        max={appState.maxRating}
        minValue={filter.minRating}
        maxValue={filter.maxRating}
        theme={theme}
        name="Rating"
        step={100}
        minTitle="Set 0 to show Unrated Problems"
        className="p-2 pb-0"
        onMinChange={(num: number) => updateFilter({ minRating: num })}
        onMaxChange={(num: number) => updateFilter({ maxRating: num })}
      />
      <InputRange
        min={appState.minContestId}
        max={appState.maxContestId}
        minValue={filter.minContestId}
        maxValue={filter.maxContestId}
        theme={theme}
        name="ContestId"
        step={1}
        className="p-2"
        onMinChange={(num: number) => updateFilter({ minContestId: num })}
        onMaxChange={(num: number) => updateFilter({ maxContestId: num })}
      />
      <CheckList
        items={tags}
        active={filterState.tags}
        name={"Tags"}
        onClickSet={setTags}
        selectAll={true}
        deselectAll={true}
      />
    </CustomModal>
  );
}

export default ProblemFilterModal;
