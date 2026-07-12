import Theme from "../../../../util/Theme";
import { processNumber } from "../../../../util/util";

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
  const boundedMin = processNumber(minValue, min, max);
  const boundedMax = processNumber(maxValue, min, max);
  const selectedMin = Math.min(boundedMin, boundedMax);
  const selectedMax = Math.max(boundedMin, boundedMax);
  const range = max - min;
  const minPercentage = range === 0 ? 0 : ((selectedMin - min) / range) * 100;
  const maxPercentage = range === 0 ? 100 : ((selectedMax - min) / range) * 100;
  const valuesAreEqual = selectedMin === selectedMax;

  const trackBackground = `linear-gradient(to right,
    var(--input-range-slider-track) ${minPercentage}%,
    var(--input-range-slider-selected) ${minPercentage}%,
    var(--input-range-slider-selected) ${maxPercentage}%,
    var(--input-range-slider-track) ${maxPercentage}%)`;

  return (
    <div className={`d-flex flex-column px-2 ${theme.bgText} ${className ?? ""}`}>
      <div className="d-flex justify-content-between align-items-center gap-2 mb-1">
        <span>
          Min {name}: <output>{selectedMin}</output>
        </span>
        <span>
          Max {name}: <output>{selectedMax}</output>
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
          value={selectedMin}
          aria-label={`Minimum ${name.toLowerCase()}`}
          aria-valuemax={selectedMax}
          aria-valuetext={selectedMin.toString()}
          style={{ zIndex: selectedMin >= selectedMax - step ? 4 : 2 }}
          onChange={(event) => onChange(Math.min(Number(event.target.value), selectedMax), selectedMax)}
        />
        <input
          className={`input-range-slider-input input-range-slider-max form-range position-absolute w-100 ${
            valuesAreEqual ? "input-range-slider-equal" : ""
          }`}
          type="range"
          min={min}
          max={max}
          step={step}
          value={selectedMax}
          aria-label={`Maximum ${name.toLowerCase()}`}
          aria-valuemin={selectedMin}
          aria-valuetext={selectedMax.toString()}
          style={{ zIndex: 3 }}
          onChange={(event) => onChange(selectedMin, Math.max(Number(event.target.value), selectedMin))}
        />
      </div>
    </div>
  );
}

export default InputRangeSlider;
