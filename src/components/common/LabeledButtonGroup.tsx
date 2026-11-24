import type { ReactNode } from "react";
import type Theme from "../../util/Theme";

interface Props {
    label: string;
    theme: Theme;
    children: ReactNode;
}

export default function LabeledButtonGroup({ label, theme, children }: Props) {
    return (
        <div className="input-group w-auto flex-nowrap" role="group" aria-label={label}>
            <span className={`input-group-text ${theme.bgText}`}>{label}</span>
            {children}
        </div>
    );
}
