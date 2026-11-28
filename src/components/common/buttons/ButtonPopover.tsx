import { useId, type ReactElement } from "react";
import { OverlayTrigger, Popover } from "react-bootstrap";
import type Theme from "../../../util/Theme";

interface Props {
    label: string;
    theme: Theme;
    children: ReactElement;
}

export default function ButtonPopover({ label, theme, children }: Props) {
    const id = useId();
    return (
        <OverlayTrigger
            trigger={["hover", "focus"]}
            placement="top"
            overlay={
                <Popover id={id} className={theme.bgText}>
                    <Popover.Body className={theme.bgText}>{label}</Popover.Body>
                </Popover>
            }
        >
            {children}
        </OverlayTrigger>
    );
}
