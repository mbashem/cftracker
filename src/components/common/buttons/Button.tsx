import type { ComponentPropsWithRef } from "react";
import type Theme from "../../../util/Theme";
import "./IconButton.css";

const variants = {
    primary: "btn btn-primary",
    secondary: "btn btn-secondary",
    danger: "btn btn-danger",
    outline: "btn btn-outline-secondary",
    outlineDanger: "btn btn-outline-danger",
    ghost: "btn btn-ghost",
    ghostDanger: "btn btn-ghost btn-ghost-danger",
};

export type ButtonVariant = keyof typeof variants | "close";

interface Props extends ComponentPropsWithRef<"button"> {
    variant?: ButtonVariant;
    theme?: Theme;
    compact?: boolean;
}

export default function Button({ variant, theme, compact, className = "", type = "button", ...props }: Props) {
    const appearance = variant === "close"
        ? theme?.btnClose ?? "btn-close"
        : variant === undefined ? theme?.btn ?? variants.secondary : variants[variant];
    return <button {...props} type={type} className={`${appearance}${compact ? " btn-sm" : ""} ${className}`.trim()} />;
}
