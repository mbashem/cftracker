import type { IconDefinition } from "@fortawesome/fontawesome-svg-core";
import { faPlus, faXmark } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import Button from "./Button";

interface IconButtonProps {
  icon: IconDefinition;
  label: string;
  onClick: () => void;
}

function IconButton({ icon, label, onClick }: IconButtonProps) {
  return (
    <Button
      variant="ghost"
      compact
      className="border-0 p-0 text-reset"
      aria-label={label}
      title={label}
      onClick={onClick}
    >
      <FontAwesomeIcon icon={icon} />
    </Button>
  );
}

interface IconButtonHelperProps {
  label?: string;
  onClick: () => void;
}

export function AddButton({ label = "Add", onClick }: IconButtonHelperProps) {
  return <IconButton icon={faPlus} label={label} onClick={onClick} />;
}

export function CloseButton({ label = "Close", onClick }: IconButtonHelperProps) {
  return <IconButton icon={faXmark} label={label} onClick={onClick} />;
}

export default IconButton;
