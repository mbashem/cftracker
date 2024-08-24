import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import CustomModal from "../Common/CustomModal";
import CheckList from "../Common/Forms/CheckList";
import useListPage from "./useListPage";
import { faEdit } from "@fortawesome/free-regular-svg-icons";
import { useState } from "react";

function ListPage() {
  const { theme, activeList, lists, listClicked, createNewList } = useListPage();
  const [newListName, setNewListName] = useState<string>("");

  return (
    <div className="container pt-3">
      <div className="row justify-content-center w-100">
        <div className="col">
          <CheckList
            items={lists.map((list) => list.name)}
            active={new Set<string>(activeList === undefined ? [] : [activeList])}
            name={""}
            onClick={(str) => {
              console.log(str);
              listClicked(str);
            }}
            activeClass="btn-secondary active"
            inactiveClass="btn-secondary"
            btnClass="p-1 btn"
          />
        </div>
        <div className="col">
          <CustomModal title="Create New List" theme={theme} button={<FontAwesomeIcon icon={faEdit} />}>
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
      </div>
    </div>
  );
}

export default ListPage;
