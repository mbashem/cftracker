import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPlus, faTrash } from "@fortawesome/free-solid-svg-icons";
import { faEdit } from "@fortawesome/free-regular-svg-icons";
import Loading from "../common/Loading";
import Button from "../common/Button";
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
    updateListName,
    deleteListButtonClicked,
  } = useListPage();

  return (
    <div className="container pt-3" data-bs-theme={theme.name}>
      {isLoading && <Loading />}
      {error !== undefined && <p role="alert">Failed to load lists.</p>}
      <div className="d-flex flex-wrap align-items-start justify-content-between gap-3 w-100">
        <div className="flex-grow-1" style={{ minWidth: 0 }}>
          <div role="group" aria-label="Lists" className="d-flex flex-wrap align-items-start gap-2">
            {lists.map(list => (
              <Button key={list.id} variant="secondary" className={`text-wrap text-break ${activeList?.id === list.id ? 'active' : ''}`} style={{ maxWidth: '100%' }} aria-pressed={activeList?.id === list.id} onClick={() => listClicked(list.name)}>
                {list.name}
              </Button>
            ))}
          </div>
        </div>

        <div className="flex-shrink-0">
          <TextPromptDialog
            button={<FontAwesomeIcon icon={faPlus} />}
            buttonLabel="Create new list"
            buttonVariant="ghost"
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
              buttonVariant="ghost"
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
                  buttonVariant="ghostDanger"
                  title={`Do you want to delete ${activeList.name}?`}
                  theme={theme}
                  confirmLabel="Yes"
                  cancelLabel="No"
                  cancelVariant="primary"
                  onConfirm={deleteListButtonClicked}
                  onConfirmed={close}
                />
              )}
            />
          </div>
        )}
      </div>
      <div className="pt-3">
        {activeList && <IndividualListPage key={activeList.id} listId={activeList.id} lists={lists} theme={theme} />}
      </div>
    </div>
  );
}

export default ListPage;
