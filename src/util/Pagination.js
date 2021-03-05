import ReactPaginate from "react-paginate";
import PropTypes from "prop-types";

const Pagination = (props) => {
  let linkClassName = "page-link text-light bg-dark";
  let linkWrapperClassName = "page-item";

  let pageCount =
    props.perPage > 0
      ? Math.floor(
          (parseInt(props.totalCount) + parseInt(props.perPage) - 1) /
            parseInt(props.perPage)
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

Pagination.propTypes = {
  perPage: PropTypes.number.isRequired,
  selected: PropTypes.number.isRequired,
  pageSelected: PropTypes.func,
  totalCount: PropTypes.number.isRequired,
};

export default Pagination;
