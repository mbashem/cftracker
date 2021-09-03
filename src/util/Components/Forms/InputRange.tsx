import Theme from "../../Theme";
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
  theme: Theme;
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
        className={"ps-1 " + props.theme.bgText}
        inputClass={props.theme.bgText}
        textClass={props.theme.bgText}
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
        className={"ps-1 " + props.theme.bgText}
        textClass={props.theme.bgText}
        inputClass={props.theme.bgText}
        onChange={(num) => {
          props.onMaxChange(num);
        }}
      />
    </div>
  );
};

export default InputRange;
