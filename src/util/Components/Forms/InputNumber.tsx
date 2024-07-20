import { useState, useEffect, useRef } from "react";
import { processNumber } from "../../util";

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
  const [inputValue, setInputValue] = useState<string>(props.value.toString());

  const validateAndUpdate = () => {
    let num: number = parseInt(inputValue);
    if (!isNaN(num)) {
      let processedNum = processNumber(num, props.min, props.max);
      if (processedNum != num) {
        // TODO:- It causes infinite rendering
        // setInputValue(processedNum.toString()); // converting num to string
      }
      props.onChange(num);
    }
  };

  const firstTime = useRef(true);
  useEffect(() => {
    if (firstTime.current) firstTime.current = false;
    else validateAndUpdate();
  }, [inputValue]);

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
        className={"form-control " + (props.inputClass || "")}
        type="number"
        placeholder="Max Rating"
        value={inputValue}
        name={props.name}
        step={props.step ? props.step : 1}
        onChange={(e) => setInputValue(e.target.value)}
      />
    </div>
  );
};

export default InputNumber;
