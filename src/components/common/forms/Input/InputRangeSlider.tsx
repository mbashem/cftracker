import Theme from "../../../../util/Theme";
import { clampNumber } from "../../../../util/util";

interface InputRangeSliderProps {
  name: string;
  min: number;
  max: number;
  minValue: number;
  maxValue: number;
  step: number;
  theme: Theme;
  className?: string;
  onChange: (minValue: number, maxValue: number) => void;
}

function InputRangeSlider({
  name,
  min,
  max,
  minValue,
  maxValue,
  step,
  theme,
  className,
  onChange,
}: InputRangeSliderProps) {
  const boundedMinValue = clampNumber(minValue, min, max);
  const boundedMaxValue = clampNumber(maxValue, min, max);
  const range = max - min;
  const minPercentage = range === 0 ? 0 : ((boundedMinValue - min) / range) * 100;
  const maxPercentage = range === 0 ? 100 : ((boundedMaxValue - min) / range) * 100;
  const valuesAreEqual = boundedMinValue === boundedMaxValue;

  const trackBackground = `linear-gradient(to right,
    var(--input-range-slider-track) ${minPercentage}%,
    var(--input-range-slider-selected) ${minPercentage}%,
    var(--input-range-slider-selected) ${maxPercentage}%,
    var(--input-range-slider-track) ${maxPercentage}%)`;

  return (
    <div className={`d-flex flex-column px-2 ${theme.bgText} ${className ?? ""}`}>
      <div className="d-flex justify-content-between align-items-center gap-2 mb-1">
        <span>
          Min {name}: <output>{boundedMinValue}</output>
        </span>
        <span>
          Max {name}: <output>{boundedMaxValue}</output>
        </span>
      </div>

      <div className={`input-range-slider input-range-slider-${theme.name} position-relative`}>
        <div
          className="input-range-slider-track position-absolute w-100"
          style={{ background: trackBackground }}
        />
        <input
          className={`input-range-slider-input input-range-slider-min form-range position-absolute w-100 ${
            valuesAreEqual ? "input-range-slider-equal" : ""
          }`}
          type="range"
          min={min}
          max={max}
          step={step}
          value={boundedMinValue}
          aria-label={`Minimum ${name.toLowerCase()}`}
          aria-valuemax={boundedMaxValue}
          aria-valuetext={boundedMinValue.toString()}
          style={{ zIndex: boundedMinValue >= boundedMaxValue - step ? 4 : 2 }}
          onChange={(event) =>
            onChange(Math.min(Number(event.target.value), boundedMaxValue), boundedMaxValue)
          }
        />
        <input
          className={`input-range-slider-input input-range-slider-max form-range position-absolute w-100 ${
            valuesAreEqual ? "input-range-slider-equal" : ""
          }`}
          type="range"
          min={min}
          max={max}
          step={step}
          value={boundedMaxValue}
          aria-label={`Maximum ${name.toLowerCase()}`}
          aria-valuemin={boundedMinValue}
          aria-valuetext={boundedMaxValue.toString()}
          style={{ zIndex: 3 }}
          onChange={(event) =>
            onChange(boundedMinValue, Math.max(Number(event.target.value), boundedMinValue))
          }
        />
      </div>
    </div>
  );
}

export default InputRangeSlider;
