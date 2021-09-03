import { processNumber } from "../../bashforces";

interface PropsType {
  header: string;
  name: string;
  value: number;
  onChange: (val: number) => void;
  min: number;
  max: number;
  inputClass?: string;
  textClass?: string;
  title?: string;
  step?: number;
  className?: string;
}

const InputNumber = (props: PropsType) => {
  return (
    <div
      className={"input-group " + (props.className ? props.className : "")}
      title={props.title ? props.title : ""}
    >
      <span
        className={
          "input-group-text " + (props.textClass ? props.textClass : "")
        }
        id={props.name + "-input"}
      >
        {props.header}
      </span>
      <input
        className={"form-control " + props.inputClass}
        type="number"
        placeholder="Max Rating"
        value={props.value}
        name={props.name}
        step={props.step ? props.step : 1}
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
