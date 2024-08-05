import Theme from "../../util/Theme";
import { processNumber } from "../../util/util";
import InputNumber from "./Forms/InputNumber";

interface PaginationProps {
  perPage: number;
  selected: number;
  pageSelected(selected: number): void;
  pageSize?: (size: number) => void;
  totalCount: number;
  theme: Theme;
}

const Pagination = (props: PaginationProps) => {
  let linkClassName = "page-link " + props.theme.bgText;
  let linkWrapperClassName = "page-item";

  let pageCount =
    props.perPage > 0
      ? Math.floor(
          (Math.floor(props.totalCount) + Math.floor(props.perPage) - 1) /
            Math.floor(props.perPage)
        )
      : 0;

  return (
    <nav
      aria-label="Page navigation example d-flex justify-content-center"
      style={{ height: "50px" }}>
      <ul className="pagination m-0 d-flex justify-content-center">
        <li className={linkWrapperClassName}>
          <button
            className={linkClassName}
            onClick={() => props.pageSelected(0)}
            aria-disabled={props.selected === 0}>
            {"<<"}
          </button>
        </li>
        <li className={linkWrapperClassName}>
          <button
            className={linkClassName}
            onClick={() => props.pageSelected(props.selected - 1)}
            disabled={props.selected === 0}>
            {"<"}
          </button>
        </li>
        <li className={linkWrapperClassName}>
          <button
            className={linkClassName}
            onClick={() => props.pageSelected(props.selected + 1)}
            disabled={props.selected === pageCount - 1}>
            {">"}
          </button>
        </li>
        <li className={linkWrapperClassName}>
          <button
            className={linkClassName}
            onClick={() => props.pageSelected(pageCount - 1)}
            disabled={props.selected === pageCount - 1}>
            {">>"}
          </button>
        </li>
        <li className={linkWrapperClassName + " p-2"}>
          <span>
            Page {props.selected + 1} of {pageCount}
          </span>
        </li>
        <li className={linkWrapperClassName}>
          <div className="pe-2" style={{ width: "200px" }}>
            <InputNumber
              header={"Go to page:"}
              name={"gotoPage"}
              value={props.selected + 1}
              min={1}
              max={pageCount}
              textClass={props.theme.bgText}
              inputClass={props.theme.bgText}
              onChange={(e) => {
                props.pageSelected(e - 1);
              }}
            />
          </div>
        </li>
        <li className={linkWrapperClassName}>
          <div className="d-flex justify-content-between w-100">
            <div className="input-group mb-3">
              <div className="input-group-prepend">
                <label
                  className={"input-group-text " + props.theme.bgText}
                  htmlFor="inputGroupSelect01">
                  Per Page
                </label>
              </div>
              <select
                className={"custom-select " + props.theme.bgText}
                value={props.perPage}
                onChange={(e) => {
                  if (props.pageSize) {
                    props.pageSize(
                      processNumber(
                        parseInt(e.target.value),
                        1,
                        props.totalCount
                      )
                    );
                  }
                }}>
                {[10, 20, 50, 100, props.totalCount].map((pageSize) => (
                  <option key={pageSize} value={pageSize}>
                    {pageSize}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </li>
      </ul>
    </nav>
  );
};

export default Pagination;
