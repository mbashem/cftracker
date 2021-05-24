import ReactPaginate from "react-paginate";
import Theme from "./Theme";

interface PaginationProps {
  perPage: number;
  selected: number;
  pageSelected(selected: number): void;
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
    <nav aria-label="Page navigation example d-flex justify-content-end">
      <ReactPaginate
        previousLabel={"previous"}
        nextLabel={"next"}
        breakLabel={"..."}
        breakClassName={"break-me"}
        pageCount={props.perPage > 0 ? pageCount : 0}
        marginPagesDisplayed={2}
        pageRangeDisplayed={5}
        nextClassName={linkWrapperClassName}
        initialPage={props.selected}
        forcePage={props.selected}
        pageClassName={linkWrapperClassName}
        previousClassName={linkWrapperClassName}
        pageLinkClassName={linkClassName}
        nextLinkClassName={linkClassName}
        previousLinkClassName={linkClassName}
        onPageChange={(e) => props.pageSelected(e.selected)}
        containerClassName={
          "pagination justify-content-center m-0 " + props.theme.text
        }
        subContainerClassName={"pages pagination"}
        activeClassName={"active border-success"}
      />
      {/* <div className="justify-content-center">
        | Go to page:{" "}
        <input
          type="number"
          defaultValue={props.selected + 1}
          onChange={(e) => {
            let page = e.target.value ? Number(e.target.value) - 1 : 0;
            if (page < 1) page = 0;
            else if (page > pageCount) page = pageCount - 1;
            console.log(page);
            console.log(pageCount);
            console.log(props.selected);
            props.pageSelected(page);
          }}
          style={{ width: "100px" }}
        />
      </div> */}
    </nav>
  );
};

export default Pagination;
