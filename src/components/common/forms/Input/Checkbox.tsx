import type { ComponentPropsWithRef } from "react";

interface Props extends Omit<ComponentPropsWithRef<"input">, "type" | "onChange"> {
    onCheckedChange: (checked: boolean) => void;
}

export default function Checkbox({ className = "", onCheckedChange, ...props }: Props) {
    return <input {...props} type="checkbox" className={`form-check-input ${className}`.trim()}
        onChange={event => onCheckedChange(event.currentTarget.checked)} />;
}
