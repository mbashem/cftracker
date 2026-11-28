import type { ComponentPropsWithRef } from "react";

interface Props extends Omit<ComponentPropsWithRef<"select">, "children" | "onChange"> {
    options: readonly (readonly [string | number, string])[];
    compact?: boolean;
    onValueChange: (value: string) => void;
}

export default function Select({ options, compact, className = "", onValueChange, ...props }: Props) {
    return (
        <select {...props} className={`form-select${compact ? " form-select-sm" : ""} ${className}`.trim()}
            onChange={event => onValueChange(event.currentTarget.value)}>
            {options.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select>
    );
}
