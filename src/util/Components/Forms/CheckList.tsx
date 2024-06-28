import Theme from "../../Theme";
import { getSet } from "../../../util/save";

interface PropsType {
  items: string[];
  active: Set<string>;
  selectAll?: boolean;
  deselectAll?: boolean;
  onClickSet?: (a: Set<string>) => void;
  onClick?: (a: string) => void;
  theme?: Theme;
  name: string;
  activeClass?: string;
  inactiveClass?: string;
  btnClass?: string;
}

const CheckList = (props: PropsType) => {
  let activeClass = props.activeClass;
  let inactiveClass = props.inactiveClass;
  let btnClass = props.btnClass;

  if (!btnClass) btnClass = "m-1 btn text-light";
  if (!inactiveClass) inactiveClass = "btn-secondary active";
  if (!activeClass) activeClass = "btn-success active";

  const selectAll = () => {
    let newSet:string;
    props.onClickSet(getSet(newSet, props.items));
  };
  const deselectAll = () => {
    let newSet = new Set<string>();
    props.onClickSet(newSet);
  };

  return (
    <div className="d-flex flex-column">
      <div className="d-inline-flex gap-2 align-items-center">
        {props.name.length ? <div className="">{props.name}</div> : ""}
        {props.selectAll ? (
          <button
            className={btnClass + " btn btn-secondary"}
            onClick={() => selectAll()}
          >
            Select All
          </button>
        ) : (
          ""
        )}
        {props.deselectAll != null ? (
          <button className="btn btn-secondary" onClick={() => deselectAll()}>
            Deselect All
          </button>
        ) : (
          ""
        )}
      </div>
      <div
        className="btn-group rounded-0 btn-group d-flex flex-wrap"
        role="group"
        aria-label="First group"
      >
        {props.items.map((item) => (
          <button
            className={
              btnClass +
              " " +
              (props.active.has(item) ? activeClass : inactiveClass)
            }
            key={item}
            onClick={() => {
              if (props.onClickSet) {
                let newSet = new Set<string>(props.active);
                if (newSet.has(item)) newSet.delete(item);
                else newSet.add(item);
                props.onClickSet(newSet);
              }
              if (props.onClick) {
                props.onClick(item);
              }
            }}
          >
            {item}
          </button>
        ))}
      </div>
    </div>
  );
};

export default CheckList;
