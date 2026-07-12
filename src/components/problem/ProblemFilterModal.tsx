import type { AppState } from "../../data/reducers/appSlice";
import { Verdict } from "../../types/CF/Submission";
import Theme from "../../util/Theme";
import CustomModal from "../common/CustomModal";
import CheckList from "../common/forms/CheckList";
import InputChecked from "../common/forms/Input/InputChecked";
import InputDateRange from "../common/forms/Input/InputDateRange";
import InputRange from "../common/forms/Input/InputRange";
import InputRangeSlider from "../common/forms/Input/InputRangeSlider";
import type { ProblemFilter, ProblemFilterState, ProblemRatingRange, UpdateProblemFilter } from "./useProblemPage";

interface ProblemFilterModalProps {
  theme: Theme;
  appState: AppState;
  filter: ProblemFilter;
  filterState: ProblemFilterState;
  ratingRange: ProblemRatingRange;
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
  ratingRange,
  selectableVerdictStatuses,
  solveStatus,
  tags,
  updateFilter,
  setSolveStatus,
  setTags,
}: ProblemFilterModalProps) {
  return (
    <CustomModal title="Filter" theme={theme} size="lg">
      <CheckList
        items={selectableVerdictStatuses}
        active={solveStatus}
        name={"Solve Status"}
        className="pb-2"
        onClickSet={setSolveStatus}
        theme={theme}
      />
      <div className="d-flex flex-column flex-md-row align-items-md-end gap-2 pb-2">
        <InputRangeSlider
          min={ratingRange.min}
          max={ratingRange.max}
          minValue={ratingRange.minValue}
          maxValue={ratingRange.maxValue}
          step={ratingRange.step}
          theme={theme}
          name="Rating"
          className="flex-grow-1"
          onChange={(minRating, maxRating) => updateFilter({ minRating, maxRating })}
        />
        <InputChecked
          header="Unrated Problems"
          name="showUnrated"
          checked={filter.showUnrated}
          title="Include unrated problems"
          theme={theme}
          className="w-auto flex-shrink-0 align-self-md-end"
          onChange={(showUnrated) => updateFilter({ showUnrated })}
        />
      </div>
      <InputRange
        min={appState.minContestId}
        max={appState.maxContestId}
        minValue={filter.minContestId}
        maxValue={filter.maxContestId}
        theme={theme}
        name="ContestId"
        step={1}
        className="pb-2"
        onMinChange={(num: number) => updateFilter({ minContestId: num })}
        onMaxChange={(num: number) => updateFilter({ maxContestId: num })}
      />
      <InputDateRange
        name="Date"
        minValue={filter.minContestDate}
        maxValue={filter.maxContestDate}
        theme={theme}
        className="pb-2"
        onMinChange={(minContestDate) => updateFilter({ minContestDate })}
        onMaxChange={(maxContestDate) => updateFilter({ maxContestDate })}
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
