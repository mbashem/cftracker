import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import CustomModal from "../Common/CustomModal";
import CheckList from "../Common/Forms/CheckList";
import useListPage from "./useListPage";
import { useState } from "react";
import { faPlus } from "@fortawesome/free-solid-svg-icons";
import IndividualListPage from "./individual-list/IndividualListPage";
import { faEdit } from "@fortawesome/free-regular-svg-icons";

function ListPage() {
  const { theme, activeList, lists, listClicked, createNewList, addButtonClicked } = useListPage();
  const [newListName, setNewListName] = useState<string>("");

  return (
    <div className="container pt-3">
      <div className="d-flex justify-content-center w-100">
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
        <div className="flex-fill">
          <button type="button" className={"btn " + theme.btn} onClick={addButtonClicked}>
            <FontAwesomeIcon icon={faEdit} />
          </button>
        </div>
      </div>
      <div className="pt-3">{activeList && <IndividualListPage id={activeList.id} />}</div>
    </div>
  );
}

export default ListPage;
