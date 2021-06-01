import { faRandom, faRedo } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { getRandomInteger } from "../bashforces";
import Theme from "../Theme";

interface PropsType {
  children: React.ReactNode;
  search: string;
  searchPlaceHolder: string;
  searchName: string;
  length: number;
  selected: number;
  perPage: number;
  onSearch: (s: string) => void;
  setRandom: (num: number) => void;
  theme: Theme;
  name: string;
}

const Filter = (props: PropsType) => {
  let lo = props.selected * props.perPage;
  let high = Math.min(props.length, lo + props.perPage);

  return (
    <div className="menu">
      <ul className="navbar w-100 pt-3 mb-0 container d-flex justify-content-between list-unstyled">
        <li className="nav-item col-6">
          <input
            className={"form-control mr-sm-2 " + props.theme.bgText}
            type="text"
            placeholder={props.searchPlaceHolder}
            name={props.searchName}
            autoComplete="on"
            value={props.search}
            onChange={(e) => {
              props.onSearch(e.target.value);
            }}
          />
        </li>
        <li className="nav-item text-secondary">
          Showing {high - lo} of {props.length}
        </li>
        <li className="nav-item">
          <div className="btn-group" role="group" aria-label="Basic example">
            <button
              type="button"
              className={"btn btn-transparent text-secondary"}
              onClick={() => {
                if (props.length > 0)
                  props.setRandom(getRandomInteger(0, props.length - 1));
              }}
              title={"Find Random " + props.name}>
              <FontAwesomeIcon icon={faRandom} />
            </button>
            <button
              type="button"
              className={"btn btn-transparent text-secondary"}
              title="Cancel Random"
              onClick={() => props.setRandom(-1)}>
              <FontAwesomeIcon icon={faRedo} />
            </button>
          </div>
        </li>
        <li className="nav-item">{props.children}</li>
      </ul>
    </div>
  );
};

export default Filter;
