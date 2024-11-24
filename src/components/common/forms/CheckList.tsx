import Theme from "../../../util/Theme";

export interface ButtonItems {
  label: React.ReactNode;
  isActive?: React.ReactNode;
  onClick: () => void;
}

interface PropsType<T> {
  items: T[];
  active: Set<T>;
  selectAll?: boolean;
  deselectAll?: boolean;
  onClickSet?: (a: Set<T>) => void;
  onClick?: (a: T) => void;
  theme?: Theme;
  name: string;
  activeClass?: string;
  inactiveClass?: string;
  btnClass?: string;
  appendButtonsEnd?: ButtonItems[];
}

const CheckList = <T extends React.Key>(props: PropsType<T>) => {
  let activeClass = props.activeClass;
  let inactiveClass = props.inactiveClass;
  let btnClass = props.btnClass;

  if (!btnClass) btnClass = "m-1 btn text-light";
  if (!inactiveClass) inactiveClass = "btn-secondary active";
  if (!activeClass) activeClass = "btn-success active";

  return (
    <div className="d-flex flex-column">
      <div className="d-inline-flex gap-2 align-items-center">
        {props.name.length ? <div className="">{props.name}</div> : ""}
        {props.selectAll ? (
          <button
            className={btnClass + " btn btn-secondary"}
            onClick={() => {
              props.onClickSet?.(new Set(props.items));
            }}
          >
            Select All
          </button>
        ) : (
          ""
        )}
        {props.deselectAll != null ? (
          <button
            className="btn btn-secondary"
            onClick={() => {
              props.onClickSet?.(new Set());
            }}
          >
            Deselect All
          </button>
        ) : (
          ""
        )}
      </div>
      <div className="btn-group rounded-0 btn-group d-flex flex-wrap" role="group" aria-label="First group">
        {props.items.map((item) => (
          <button
            className={btnClass + " " + (props.active.has(item) ? activeClass : inactiveClass)}
            key={item}
            onClick={() => {
              if (props.onClickSet) {
                let newSet = new Set(props.active);
                if (newSet.has(item)) newSet.delete(item);
                else newSet.add(item);
                props.onClickSet(newSet);
              }
              if (props.onClick) {
                props.onClick(item);
              }
            }}
          >
            <>{item}</>
          </button>
        ))}
        {props.appendButtonsEnd?.map((buttonElement) => (
          <button
            className={btnClass + " " + (buttonElement.isActive ? activeClass : inactiveClass)}
            key={`end-${buttonElement.label}`}
            onClick={buttonElement.onClick}
          >
            {buttonElement.label}
          </button>
        ))}
      </div>
    </div>
  );
};

export default CheckList;
