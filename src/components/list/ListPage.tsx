import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import CustomModal from "../common/CustomModal";
import CheckList from "../common/forms/CheckList";
import useListPage from "./useListPage";
import { useEffect, useState } from "react";
import { faPlus, faTrash } from "@fortawesome/free-solid-svg-icons";
import IndividualListPage from "./individual-list/IndividualListPage";
import { faEdit } from "@fortawesome/free-regular-svg-icons";

function ListPage() {
  const {
    theme,
    activeList,
    lists,
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
      <div className="d-flex align-items-center justify-content-between w-100">
        <div className="flex-fill">
          <CheckList
            items={lists.map((list) => list.name)}
            active={new Set<string>(activeList === undefined ? [] : [activeList.name])}
            name={""}
            onClick={(str) => listClicked(str)}
            activeClass="btn-secondary active"
            inactiveClass="btn-secondary"
            btnClass="p-1 btn"
          />
        </div>

        <div className="flex-fill">
          <CustomModal title="Create New List" theme={theme} button={<FontAwesomeIcon icon={faPlus} />}>
            {({ closeModal }) => (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  createNewList(newListName).then(() => {
                    setNewListName("");
                    closeModal();
                  });
                }}
              >
                <div className="form-group">
                  <label htmlFor="listName">List Name</label>
                  <input
                    type="text"
                    className="form-control"
                    id="listName"
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
          <div className="flex-fill d-flex justify-content-end">
            <button type="button" className={"btn " + theme.btn} onClick={addButtonClicked}>
              <FontAwesomeIcon icon={faPlus} /> Add Problem
            </button>
            <CustomModal title={`Update ${activeList?.name}:`} theme={theme} button={<FontAwesomeIcon icon={faEdit} />}>
              {({ closeModal }) => (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    updateListName(updateListNameValue).then(() => {
                      closeModal();
                    });
                  }}
                >
                  <div className="form-group">
                    <div className="d-flex align-items-center justify-content-between">
                      <label htmlFor="listName">Enter New Name</label>
                      <CustomModal
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
                                deleteListButtonClicked().then(() => {
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
                      id="listName"
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
