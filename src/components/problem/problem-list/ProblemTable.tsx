import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faSort, faSortDown, faSortUp } from "@fortawesome/free-solid-svg-icons";
import Problem from "../../../types/CF/Problem";
import type { List } from "../../../types/list";
import Theme from "../../../util/Theme";
import { SortOrder, SortProblemBy } from "../../../util/sortMethods";
import type { ProblemFilterState } from "../useProblemPage";
import ProblemList from "./ProblemList";

interface ProblemTableProps {
  problems: Problem[];
  perPage: number;
  pageSelected: number;
  theme: Theme;
  filterState: ProblemFilterState;
  solved: Set<string>;
  attempted: Set<string>;
  showAddToList: boolean;
  list?: List;
  problemsAddedToList: Set<string>;
  sortList: (sortBy: SortProblemBy) => void;
  addToList: (id: string) => void;
  deleteFromList: (id: string) => void;
}

function ProblemTable({
  problems,
  perPage,
  pageSelected,
  theme,
  filterState,
  solved,
  attempted,
  showAddToList,
  list,
  problemsAddedToList,
  sortList,
  addToList,
  deleteFromList,
}: ProblemTableProps) {
  const getSortIcon = (sortBy: SortProblemBy) => {
    if (filterState.sortBy !== sortBy) return <FontAwesomeIcon icon={faSort} />;
    return <FontAwesomeIcon icon={filterState.order === SortOrder.Ascending ? faSortUp : faSortDown} />;
  };

  return (
    <table className={"table table-bordered m-0 " + theme.table}>
      <thead className={theme.thead}>
        <tr>
          <th scope="col">#</th>
          <th scope="col" role="button" onClick={() => sortList(SortProblemBy.Id)}>
            <div className="d-flex justify-content-between">
              <div>ID</div>
              <div>{getSortIcon(SortProblemBy.Id)}</div>
            </div>
          </th>
          <th scope="col">Name</th>
          <th scope="col" role="button" onClick={() => sortList(SortProblemBy.Rating)}>
            <div className="d-flex justify-content-between">
              <div>Rating</div>
              <div>{getSortIcon(SortProblemBy.Rating)}</div>
            </div>
          </th>
          <th scope="col" role="button" onClick={() => sortList(SortProblemBy.SolveCount)}>
            <div className="d-flex justify-content-between">
              <div>Solve Count</div>
              <div>{getSortIcon(SortProblemBy.SolveCount)}</div>
            </div>
          </th>
          {showAddToList && <th scope="col">Add To {list?.name}</th>}
        </tr>
      </thead>
      <tbody className={theme.bg}>
        <ProblemList
          problems={problems}
          solved={solved}
          attempted={attempted}
          perPage={perPage}
          pageSelected={pageSelected}
          theme={theme}
          showAddToList={showAddToList}
          addToList={addToList}
          problemsAddedToList={problemsAddedToList}
          deleteFromList={deleteFromList}
        />
      </tbody>
    </table>
  );
}

export default ProblemTable;
