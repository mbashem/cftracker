import { faXmark } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";

interface CloseButtonProps {
  label?: string;
  onClick: () => void;
}

function CloseButton({ label = "Close", onClick }: CloseButtonProps) {
  return (
    <button
      type="button"
      className="btn btn-sm border-0 p-0 text-reset"
      aria-label={label}
      title={label}
      onClick={onClick}
    >
      <FontAwesomeIcon icon={faXmark} />
    </button>
  );
}

export default CloseButton;
