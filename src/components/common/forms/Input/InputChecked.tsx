import { InputGroup } from "react-bootstrap";
import Theme from "../../../../util/Theme";

interface PropsType {
  header: string;
  name: string;
  checked: boolean;
  onChange: (val: boolean) => void;
  inputClass?: string;
  textClass?: string;
  title?: string;
  theme: Theme;
  className?: string;
}

const InputChecked = (props: PropsType) => {
  return (
    <InputGroup className={"d-flex " + (props.className ? props.className : "")} title={props.title}>
      <InputGroup.Text className={props.textClass + " " + props.theme.bgText}>{props.header}</InputGroup.Text>

      {/* <InputGroup.Checkbox
        checked={props.checked}
        name={props.name}
        variant="dark"
        className={props.inputClass}
        onChange={() => {
          props.onChange(!props.checked);
        }}
      /> */}
      <div className={"input-group-text " + props.inputClass + " " + props.theme.bgText}>
        <input
          name={props.name}
          className={"form-check-input mt-0 " + props.inputClass + " "}
          type="checkbox"
          checked={props.checked}
          onChange={() => {
            props.onChange(!props.checked);
          }}
        />
      </div>
    </InputGroup>
  );
};

export default InputChecked;
