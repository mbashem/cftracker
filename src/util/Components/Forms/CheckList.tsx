import Theme from "../../Theme";

interface PropsType {
  items: string[];
  present: Set<string>;
  onClick: (a: Set<string>) => void;
  theme?: Theme;
}

const CheckList = (props: PropsType) => {
  return (
    <div
      className="btn-group me-2 d-flex flex-wrap"
      role="group"
      aria-label="First group">
      {props.items.map((item) => (
        <button
          className={
            (props.present.has(item) ? "btn bg-success" : "btn bg-dark") +
            " h-6 m-1 p-1 text-light"
          }
          key={item}
          onClick={() => {
            let newSet = new Set<string>(props.present);
            if (newSet.has(item)) newSet.delete(item);
            else newSet.add(item);
            props.onClick(newSet);
          }}>
          {item}
        </button>
      ))}
    </div>
  );
};

export default CheckList;
