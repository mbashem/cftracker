import { useId, type ReactNode } from "react";
import { Modal } from "react-bootstrap";
import type Theme from "../../util/Theme";

interface Props {
    title: string;
    theme: Theme;
    open: boolean;
    onClose: () => void;
    size?: "sm" | "lg" | "xl";
    children: ReactNode;
}

export default function Dialog({ title, theme, open, onClose, size, children }: Props) {
    const titleId = useId();
    return (
        <Modal data-bs-theme={theme.name} size={size} show={open} onHide={onClose} aria-labelledby={titleId}>
            <Modal.Header className={theme.bgText}>
                <Modal.Title id={titleId}>{title}</Modal.Title>
                <button type="button" className={theme.btnClose} aria-label="Close" onClick={onClose} />
            </Modal.Header>
            <Modal.Body className={theme.bgText}>{children}</Modal.Body>
        </Modal>
    );
}
