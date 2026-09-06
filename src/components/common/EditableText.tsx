import { useEffect, useState } from "react";
import TextInputForm from "./TextInputForm";
import TextView from "./TextView";

interface EditableTextProps {
  value: string;
  label: string;
  placeholder?: string;
  displayValue?: string;
  formClassName?: string;
  inputClassName?: string;
  viewClassName?: string;
  editTitle?: string;
  onSubmit: (value: string) => void;
}

function EditableText({
  value,
  label,
  placeholder,
  displayValue = value,
  formClassName = "",
  inputClassName = "",
  viewClassName = "",
  editTitle = "Click to edit",
  onSubmit,
}: EditableTextProps) {
  const isEmpty = value.trim().length === 0;
  const [isEditing, setIsEditing] = useState(isEmpty);

  useEffect(() => {
    setIsEditing(value.trim().length === 0);
  }, [value]);

  function submit(inputValue: string) {
    onSubmit(inputValue);
    if (inputValue.trim().length > 0) setIsEditing(false);
  }

  if (isEditing || isEmpty) {
    return (
      <TextInputForm
        label={label}
        placeholder={placeholder}
        initialValue={value}
        formClassName={formClassName}
        inputClassName={inputClassName}
        allowEmpty
        onBlur={(inputValue) => {
          if (!isEmpty && inputValue.trim() === value.trim()) setIsEditing(false);
        }}
        onSubmit={submit}
      />
    );
  }

  return (
    <TextView
      text={displayValue}
      label={label}
      className={viewClassName}
      title={editTitle}
      onClick={() => setIsEditing(true)}
    />
  );
}

export default EditableText;
