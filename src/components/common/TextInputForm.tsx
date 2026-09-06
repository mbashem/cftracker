import { useEffect, useState } from "react";

interface TextInputFormProps {
  label: string;
  placeholder?: string;
  initialValue?: string;
  formClassName?: string;
  inputClassName?: string;
  allowEmpty?: boolean;
  onBlur?: (value: string) => void;
  onSubmit: (value: string) => void;
}

function TextInputForm({
  label,
  placeholder,
  initialValue = "",
  formClassName = "",
  inputClassName = "",
  allowEmpty = false,
  onBlur,
  onSubmit,
}: TextInputFormProps) {
  const [value, setValue] = useState(initialValue);

  useEffect(() => {
    setValue(initialValue);
  }, [initialValue]);

  return (
    <form
      className={formClassName}
      onSubmit={(event) => {
        event.preventDefault();
        const submittedValue = value.trim();
        if (!allowEmpty && submittedValue.length === 0) return;
        onSubmit(submittedValue);
        setValue("");
      }}
    >
      <input
        className={`form-control ${inputClassName}`.trim()}
        type="text"
        value={value}
        placeholder={placeholder}
        aria-label={label}
        autoFocus
        onChange={(event) => setValue(event.target.value)}
        onBlur={() => onBlur?.(value)}
      />
    </form>
  );
}

export default TextInputForm;
