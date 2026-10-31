import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import Loading from "../common/Loading";
import CustomModal from "../common/CustomModal";
import useListPage from "./useListPage";
import { useEffect, useId, useState } from "react";
import { faPlus, faTrash } from "@fortawesome/free-solid-svg-icons";
import IndividualListPage from "./individual-list/IndividualListPage";
import { faEdit } from "@fortawesome/free-regular-svg-icons";

function ListPage() {
  const createListNameId = useId();
  const updateListNameId = useId();
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
  } = useListPage();
  const [newListName, setNewListName] = useState("");
  const [updateListNameValue, setUpdateListNameValue] = useState("");
  useEffect(() => setUpdateListNameValue(activeList?.name ?? ""), [activeList]);

  return (
    <div className="container pt-3">
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
          <CustomModal buttonLabel="Create new list" buttonClassName="btn-ghost" title="Create New List" theme={theme} button={<FontAwesomeIcon icon={faPlus} />}>
            {({ closeModal }) => (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  createNewList(newListName).then((success) => {
                    if (!success) return;
                    setNewListName("");
                    closeModal();
                  });
                }}
              >
                <div className="form-group">
                  <label htmlFor={createListNameId}>List Name</label>
                  <input
                    type="text"
                    className="form-control"
                    id={createListNameId}
                    placeholder="Enter list name"
                    value={newListName}
                    onChange={(e) => setNewListName(e.target.value)}
                    required
                  />
                </div>
                <button type="submit" className="btn btn-primary mt-2">
                  Create List
                </button>
              </form>
            )}
          </CustomModal>
        </div>
        {activeList && (
          <div className="d-flex flex-wrap justify-content-end gap-2">
            <button type="button" className={"btn " + theme.btn} onClick={addButtonClicked}>
              <FontAwesomeIcon icon={faPlus} /> Add Problem
            </button>
            <CustomModal buttonLabel="Edit list" buttonClassName="btn-ghost" title={`Update ${activeList?.name}:`} theme={theme} button={<FontAwesomeIcon icon={faEdit} />}>
              {({ closeModal }) => (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    updateListName(updateListNameValue).then((success) => {
                      if (!success) return;
                      closeModal();
                    });
                  }}
                >
                  <div className="form-group">
                    <div className="d-flex align-items-center justify-content-between">
                      <label htmlFor={updateListNameId}>Enter New Name</label>
                      <CustomModal
                        buttonLabel="Delete list"
                        buttonClassName="btn-ghost btn-ghost-danger"
                        title={`Do you want to delete ${activeList.name}?`}
                        theme={theme}
                        button={<FontAwesomeIcon className={theme.textDanger} icon={faTrash} />}
                      >
                        {({ closeModal: closeDeleteAlertModal }) => (
                          <div className="d-flex justify-content-start">
                            <button
                              type="button"
                              className={theme.btnDanger + " me-2 "}
                              onClick={() => {
                                deleteListButtonClicked().then((success) => {
                                  if (!success) return;
                                  closeDeleteAlertModal();
                                  closeModal();
                                });
                              }}
                            >
                              Yes
                            </button>

                            <button type="button" className={theme.btnPrimary} onClick={() => closeDeleteAlertModal()}>
                              No
                            </button>
                          </div>
                        )}
                      </CustomModal>
                    </div>
                    <input
                      type="text"
                      className="form-control mt-1"
                      id={updateListNameId}
                      placeholder="Enter list name"
                      value={updateListNameValue}
                      onChange={(e) => setUpdateListNameValue(e.target.value)}
                      required
                    />
                  </div>
                  <button type="submit" className="btn btn-primary mt-2">
                    Update List
                  </button>
                </form>
              )}
            </CustomModal>
          </div>
        )}
      </div>
      <div className="pt-3">{activeList && <IndividualListPage listId={activeList.id} />}</div>
    </div>
  );
}

export default ListPage;
