import { InputGroup } from "react-bootstrap";

interface PropsType {
  header: string;
  name: string;
  checked: boolean;
  onChange: (val: boolean) => void;
  inputClass?: string;
  textClass?: string;
  title?: string;
  className?: string;
}

const InputChecked = (props: PropsType) => {
  return (
    <InputGroup
      className={
        "d-flex justify-content-end " + (props.className ? props.className : "")
      }
      title={props.title}>
      <InputGroup.Text>{props.header}</InputGroup.Text>

      <InputGroup.Checkbox
        checked={props.checked}
        aria-label="Checkbox for following text input"
        name={props.name}
        onChange={() => {
          props.onChange(!props.checked);
        }}
      />
    </InputGroup>
  );
};

export default InputChecked;
