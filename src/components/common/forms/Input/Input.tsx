import type { ComponentPropsWithRef } from "react";

interface Props extends Omit<ComponentPropsWithRef<"input">, "onChange"> {
    compact?: boolean;
    unstyled?: boolean;
    onValueChange?: (value: string) => void;
    onFileChange?: (file: File | undefined) => void | Promise<void>;
}

export default function Input({
    compact, unstyled, className = "", onValueChange, onFileChange, ...props
}: Props) {
    const appearance = unstyled ? "" : compact ? "form-control form-control-sm" : "form-control";
    return <input {...props} className={`${appearance} ${className}`.trim()} onChange={event => {
        onValueChange?.(event.currentTarget.value);
        void onFileChange?.(event.currentTarget.files?.[0]);
    }} />;
}
