import { processNumber } from "../bashforces";
import Theme from "../Theme";

interface PropsType {
  header: string;
  name: string;
  value: number;
  onChange: (val) => void;
  min: number;
  max: number;
  inputClass?: string;
  textClass?: string;
}

const InputNumber = (props: PropsType) => {
  return (
    <div className="input-group">
      <span
        className={"input-group-text " + props.textClass}
        id={props.name + "-input"}>
        {props.header}
      </span>
      <input
        className={"form-control " + props.inputClass}
        type="number"
        placeholder="Max Rating"
        value={props.value}
        name={props.name}
        onChange={(e) => {
          let num: number = parseInt(e.target.value);

          num = processNumber(num, props.min, props.max);

          props.onChange(num);
        }}
      />
    </div>
  );
};

export default InputNumber;
