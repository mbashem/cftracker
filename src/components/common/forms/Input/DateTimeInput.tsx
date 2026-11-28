import { useRef, type ComponentProps } from "react";
import Button from "../../buttons/Button";
import Input from "./Input";
import "./DateTimeInput.css";

interface Props extends Omit<ComponentProps<typeof Input>, "type" | "ref"> {
    label: string;
    displayValue: string;
    expanded: boolean;
    onExpand: () => void;
}

export default function DateTimeInput({
    label, displayValue, expanded, onExpand, readOnly, ...props
}: Props) {
    const inputRef = useRef<HTMLInputElement>(null);

    function openPicker() {
        const input = inputRef.current;
        if (input === null) return;
        if (typeof input.showPicker === "function") {
            try {
                input.showPicker();
                return;
            } catch {
                // Use the editable field when opening the picker is blocked.
            }
        }
        onExpand();
        input.focus();
    }

    return (
        <div className="position-relative">
            <Input
                {...props}
                ref={inputRef}
                type="datetime-local"
                readOnly={readOnly}
                aria-label={label}
                tabIndex={expanded ? undefined : -1}
                unstyled={!expanded}
                className={expanded ? props.className : "datetime-picker-input"}
            />
            {!expanded && (
                <Button variant="ghost" compact className="datetime-picker-trigger px-1"
                    aria-label={`${label}: ${displayValue}`} aria-describedby={props["aria-describedby"]}
                    disabled={readOnly} onClick={openPicker}>
                    {displayValue}
                </Button>
            )}
        </div>
    );
}
