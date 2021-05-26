import { processNumber } from "../bashforces";

interface PropsType {
  header: string;
  name: string;
  value: number;
  onChange: (val) => void;
  min: number;
  max: number;
  inputClass?: string;
  textClass?: string;
  title?: string;
  step?: number;
}

const InputNumber = (props: PropsType) => {
  if (props.title === undefined) props = { ...props, title: "" };
  if (props.step === undefined || isNaN(props.step))
    props = { ...props, step: 1 };

  return (
    <div className="input-group" title={props.title}>
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
        step={props.step}
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
