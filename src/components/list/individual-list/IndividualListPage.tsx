import { useRef } from "react";
import type Theme from "../../../util/Theme";
import Loading from "../../common/display/Loading";
import type { List } from "../../../types/list";
import ListPracticeTable from "./components/ListPracticeTable";
import ListSelectionActions from "./components/ListSelectionActions";
import ListToolbar from "./components/ListToolbar";
import useIndividualListPage from "./useIndividualListPage";

interface Props {
  listId: number;
  lists: readonly List[];
  theme: Theme;
}

export default function IndividualListPage({ listId, lists, theme }: Props) {
  const details = useIndividualListPage(listId, lists);
  const { list, visible, problemsById, busy } = details;
  const selectionControl = useRef<HTMLInputElement>(null);

  if (details.isLoading) return <Loading />;
  if (list === undefined) return details.error === undefined ? null : <p role="alert">Failed to load this list.</p>;

  return (
    <>
      {details.error !== undefined && <p role="alert">Could not refresh the list. Reload to see the latest records.</p>}
      <ListToolbar
        theme={theme}
        busy={busy}
        filters={details.filters}
        onFilterChange={details.changeFilters}
        onAddProblem={details.addProblem}
        csvImport={details.csvImport}
        onImportOpen={details.resetCsvImport}
        onExport={details.downloadCsv}
      />
      <ListSelectionActions
        count={details.selectedCount}
        copyLists={details.copyLists}
        theme={theme}
        busy={busy}
        copyDestination={details.copyDestination}
        onCopyDestinationChange={details.changeCopyDestination}
        onCopy={details.copySelected}
        onRemove={details.removeSelected}
        onRemoved={() => selectionControl.current?.focus()}
        onError={details.reportError}
      />
      <div role="status" aria-live="polite" className={details.announcement ? "mb-2" : "visually-hidden"}>{details.announcement}</div>
      <ListPracticeTable
        items={visible}
        selection={details.selection}
        problemsById={problemsById}
        theme={theme}
        busy={busy}
        selectionControl={selectionControl}
        effectiveStatus={details.effectiveStatus}
        onSelectVisible={details.selectVisible}
        onSelectItem={details.selectItem}
        onSave={details.savePracticeField}
        onError={details.reportError}
      />
      {visible.length === 0 && <p className="mt-2">{list.items.length === 0 ? "This list is empty." : "No problems match these filters."}</p>}
    </>
  );
}
