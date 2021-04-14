import ReactPaginate from "react-paginate";

interface PaginationProps {
  perPage: number;
  selected: number;
  pageSelected(selected: number): void;
  totalCount: number;
}

const Pagination = (props: PaginationProps) => {
  let linkClassName = "page-link text-light bg-dark";
  let linkWrapperClassName = "page-item";

  let pageCount =
    props.perPage > 0
      ? Math.floor(
          (Math.floor(props.totalCount) + Math.floor(props.perPage) - 1) /
            Math.floor(props.perPage)
        )
      : 0;

  return (
    <nav aria-label="Page navigation example">
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
        containerClassName={"pagination text-light justify-content-center"}
        subContainerClassName={"pages pagination"}
        activeClassName={"active border-success"}
      />
    </nav>
  );
};

export default Pagination;
