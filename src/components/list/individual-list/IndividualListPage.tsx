import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import Loading from "../../Common/Loading";
import useIndividualListPage from "./useIndividualListPage";
import { faTrash } from "@fortawesome/free-solid-svg-icons";

interface Props {
  id: number;
}

function IndividualListPage({ id }: Props) {
  const { theme, lists, isLoading, error, deleteButtonClicked } = useIndividualListPage({ id });

  return (
    <>
      {isLoading && <Loading />}
      {!isLoading && error === undefined && (
        <table className={"table table-bordered m-0 " + theme.table}>
          <thead className={theme.thead}>
            <tr>
              <th scope="col">ID</th>
              <th scope="col">Name</th>
              <th scope="col">Action</th>
            </tr>
          </thead>
          <tbody className={theme.bg}>
            {lists?.items.map((item) => (
              <tr key={item.listId}>
                <td>{item.problemId}</td>
                <td>{item.name ?? ""}</td>
                <td>
                  <button
                    type="button"
                    className={"btn " + theme.btn}
                    onClick={() => deleteButtonClicked(item.problemId)}
                  >
                    <FontAwesomeIcon icon={faTrash} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </>
  );
}

export default IndividualListPage;
