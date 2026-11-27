import type { ComponentPropsWithRef } from "react";

interface Props extends Omit<ComponentPropsWithRef<"textarea">, "onChange"> {
    compact?: boolean;
    onValueChange: (value: string) => void;
}

export default function Textarea({ compact, className = "", onValueChange, ...props }: Props) {
    return <textarea {...props} className={`form-control${compact ? " form-control-sm" : ""} ${className}`.trim()}
        onChange={event => onValueChange(event.currentTarget.value)} />;
}
