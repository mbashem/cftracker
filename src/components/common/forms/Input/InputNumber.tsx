import { useState, useEffect } from "react";

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
  disabled?: boolean;
}

const INPUT_RESET_DELAY_MS = 500;

function InputNumber(props: PropsType) {
  const [inputValue, setInputValue] = useState<string>(props.value.toString());

  function validateAndUpdate() {
    let num: number = parseInt(inputValue);
    if (isNaN(num)) return;
    if (isOutsideRange(num))
      return window.setTimeout(() => {
        setInputValue((currentInputValue) => {
          const currentNumber = parseInt(currentInputValue);
          return !isNaN(currentNumber) && isOutsideRange(currentNumber) ? props.value.toString() : currentInputValue;
        });
      }, INPUT_RESET_DELAY_MS);
    if (num !== props.value) props.onChange(num);
  }

  function isOutsideRange(num: number) {
    return num < props.min || num > props.max;
  }
  useEffect(() => {
    setInputValue(props.value.toString());
  }, [props.value]);

  useEffect(() => {
    const timeoutId = validateAndUpdate();
    return () => {
      if (timeoutId !== undefined) window.clearTimeout(timeoutId);
    };
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
        className={"form-control " + (props.inputClass ?? "")}
        type="number"
        placeholder="Max Rating"
        value={inputValue}
        name={props.name}
        min={props.min}
        max={props.max}
        step={props.step ?? 1}
        disabled={props.disabled}
        onChange={(e) => setInputValue(e.target.value)}
      />
    </div>
  );
}

export default InputNumber;
