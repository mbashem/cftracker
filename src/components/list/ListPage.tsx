import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPlus, faTrash } from "@fortawesome/free-solid-svg-icons";
import { faEdit } from "@fortawesome/free-regular-svg-icons";
import Loading from "../common/Loading";
import ConfirmationDialog from "../common/ConfirmationDialog";
import TextPromptDialog from "../common/TextPromptDialog";
import IndividualListPage from "./individual-list/IndividualListPage";
import useListPage from "./useListPage";

function ListPage() {
  const {
    theme,
    activeList,
    lists,
    isLoading,
    error,
    listClicked,
    createNewList,
    addButtonClicked,
    updateListName,
    deleteListButtonClicked,
    details,
  } = useListPage();

  return (
    <div className="container pt-3" data-bs-theme={theme.name}>
      {isLoading && <Loading />}
      {error !== undefined && <p role="alert">Failed to load lists.</p>}
      <div className="d-flex flex-wrap align-items-start justify-content-between gap-3 w-100">
        <div className="flex-grow-1" style={{ minWidth: 0 }}>
          <div role="group" aria-label="Lists" className="d-flex flex-wrap align-items-start gap-2">
            {lists.map(list => (
              <button key={list.id} type="button" className={`btn btn-secondary text-wrap text-break ${activeList?.id === list.id ? 'active' : ''}`} style={{ maxWidth: '100%' }} aria-pressed={activeList?.id === list.id} onClick={() => listClicked(list.name)}>
                {list.name}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-shrink-0">
          <TextPromptDialog
            button={<FontAwesomeIcon icon={faPlus} />}
            buttonLabel="Create new list"
            buttonClassName="btn-ghost"
            title="Create New List"
            theme={theme}
            label="List Name"
            placeholder="Enter list name"
            submitLabel="Create List"
            onSubmit={createNewList}
          />
        </div>
        {activeList && (
          <div className="d-flex flex-wrap justify-content-end gap-2">
            <TextPromptDialog
              key={activeList.id}
              button={<FontAwesomeIcon icon={faEdit} />}
              buttonLabel="Edit list"
              buttonClassName="btn-ghost"
              title={`Update ${activeList.name}:`}
              theme={theme}
              label="Enter New Name"
              placeholder="Enter list name"
              initialValue={activeList.name}
              submitLabel="Update List"
              onSubmit={updateListName}
              renderFieldAction={close => (
                <ConfirmationDialog
                  button={<FontAwesomeIcon icon={faTrash} />}
                  buttonLabel="Delete list"
                  buttonClassName="btn-ghost btn-ghost-danger"
                  title={`Do you want to delete ${activeList.name}?`}
                  theme={theme}
                  confirmLabel="Yes"
                  cancelLabel="No"
                  cancelClassName={theme.btnPrimary}
                  onConfirm={deleteListButtonClicked}
                  onConfirmed={close}
                />
              )}
            />
          </div>
        )}
      </div>
      <div className="pt-3">
        {activeList && <IndividualListPage key={activeList.id} details={details} theme={theme} onAddProblem={addButtonClicked} />}
      </div>
    </div>
  );
}

export default ListPage;
