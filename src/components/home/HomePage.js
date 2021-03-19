import React, { useEffect,useState } from "react";
import { useDispatch } from "react-redux";
import { useHistory } from "react-router";
import { fetchUsers } from "../../data/actions/userActions";
import { CONTESTS } from "../../util/constants";

const HomePage = (props) => {

  const [handle, setHandle] = useState("");
	const dispatch = useDispatch();

	const history = useHistory();
	history.push(CONTESTS);

	const submitUser = () => {
		fetchUsers(dispatch,handle);
	}

  useEffect(() => {
    // fetchProblemList(dispatch);
    // fetchContestList(dispatch);
  }, []);

  return (
    <div className="container">
			{/* <form
          className="form-inline d-flex my-2 my-lg-0"
          onSubmit={(e) => {
            e.preventDefault();
            submitUser();
          }}>
          <input
            className="form-control mr-sm-2"
            type="search"
            placeholder="Handle"
            aria-label="Search"
            value={handle}
            onChange={(e) => setHandle(e.target.value)}
          />
        </form> */}
    </div>
  );
}

export default HomePage;
