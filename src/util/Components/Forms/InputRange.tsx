import InputNumber from "./InputNumber";

interface PropsType {
  min: number;
  max: number;
  step: number;
  onMaxChange: (num: number) => void;
  onMinChange: (num: number) => void;
  name: string;
  minValue: number;
  maxValue: number;
  minTitle?: string;
  maxTitle?: string;
  className?: string;
}

const InputRange = (props: PropsType) => {
  return (
    <div className={"d-flex " + (props.className ? props.className : "")}>
      <InputNumber
        header={"Min " + props.name}
        min={props.min}
        max={props.max}
        value={props.minValue}
        name={"min" + props.name}
        step={props.step}
        title={props.minTitle}
        className="pe-1"
        onChange={(num) => {
          props.onMinChange(num);
        }}
      />
      <InputNumber
        header={"Max " + props.name}
        min={props.min}
        max={props.max}
        value={props.maxValue}
        name={"max" + props.name}
        title={props.maxTitle}
        step={props.step}
        className="ps-1"
        onChange={(num) => {
          props.onMaxChange(num);
        }}
      />
    </div>
  );
};

export default InputRange;
