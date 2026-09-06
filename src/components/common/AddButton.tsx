import { faPlus } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";

interface AddButtonProps {
  label?: string;
  onClick: () => void;
}

function AddButton({ label = "Add", onClick }: AddButtonProps) {
  return (
    <button
      type="button"
      className="btn btn-sm border-0 p-0 text-reset"
      aria-label={label}
      title={label}
      onClick={onClick}
    >
      <FontAwesomeIcon icon={faPlus} />
    </button>
  );
}

export default AddButton;
