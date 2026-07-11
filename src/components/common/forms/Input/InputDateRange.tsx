import { faCalendarDays, faXmark } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { useRef } from "react";
import Theme from "../../../../util/Theme";
import { formatDateInputValue } from "../../../../util/time";

const earliestDate = "1970-01-01";

interface InputDateRangeProps {
  name: string;
  minValue: string | undefined;
  maxValue: string | undefined;
  theme: Theme;
  className?: string;
  onMinChange: (value: string | undefined) => void;
  onMaxChange: (value: string | undefined) => void;
}

interface DateInputProps {
  label: string;
  value: string | undefined;
  min: string;
  max: string;
  theme: Theme;
  onChange: (value: string) => void;
  onClear: () => void;
}

function isValidDate(value: string, min: string, max: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || value < min || value > max) return false;

  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(year, month - 1, day);

  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day;
}

function DateInput({ label, value, min, max, theme, onChange, onClear }: DateInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const fieldName = label.toLowerCase();

  const openPicker = () => {
    if (inputRef.current === null) return;
    if (typeof inputRef.current.showPicker === "function") inputRef.current.showPicker();
    else inputRef.current.focus();
  };

  return (
    <div className="input-group flex-nowrap ps-1">
      <span className={`input-group-text ${theme.bgText}`}>{label}</span>
      <div
        className={`form-control d-flex align-items-center p-0 ${theme.bgText}`}
        style={{ minWidth: 0 }}
        onClick={openPicker}
      >
        <input
          ref={inputRef}
          className={`date-range-input border-0 bg-transparent py-1 ps-2 ${theme.text}`}
          type="date"
          aria-label={fieldName}
          min={min}
          max={max}
          value={value ?? ""}
          style={{ colorScheme: theme.name, minWidth: 0, width: "8rem" }}
          onChange={(event) => onChange(event.target.value)}
        />
        {value !== undefined && (
          <button
            type="button"
            className={`btn border-0 bg-transparent p-0 ${theme.textDanger}`}
            aria-label={`Clear ${fieldName}`}
            title={`Clear ${fieldName}`}
            onClick={(event) => {
              event.stopPropagation();
              onClear();
            }}
          >
            <FontAwesomeIcon icon={faXmark} size="xs" />
          </button>
        )}
        <button
          type="button"
          className={`btn ms-auto border-0 bg-transparent px-2 ${theme.text}`}
          aria-label={`Open ${fieldName} picker`}
          title={`Open ${fieldName} picker`}
          onClick={(event) => {
            event.stopPropagation();
            openPicker();
          }}
        >
          <FontAwesomeIcon icon={faCalendarDays} />
        </button>
      </div>
    </div>
  );
}

function InputDateRange({ name, minValue, maxValue, theme, className, onMinChange, onMaxChange }: InputDateRangeProps) {
  const today = formatDateInputValue(new Date());

  const updateMin = (value: string) => {
    if (value.length === 0) return onMinChange(undefined);
    if (isValidDate(value, earliestDate, maxValue ?? today)) onMinChange(value);
  };

  const updateMax = (value: string) => {
    if (value.length === 0) return onMaxChange(undefined);
    if (isValidDate(value, minValue ?? earliestDate, today)) onMaxChange(value);
  };

  return (
    <div className={`d-flex ${className ?? ""}`}>
      <DateInput
        label={`Min ${name}`}
        value={minValue}
        min={earliestDate}
        max={maxValue ?? today}
        theme={theme}
        onChange={updateMin}
        onClear={() => onMinChange(undefined)}
      />
      <DateInput
        label={`Max ${name}`}
        value={maxValue}
        min={minValue ?? earliestDate}
        max={today}
        theme={theme}
        onChange={updateMax}
        onClear={() => onMaxChange(undefined)}
      />
    </div>
  );
}

export default InputDateRange;
