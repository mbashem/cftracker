import { useState, type ReactNode } from "react";
import CustomModal, { type CustomModalProps } from "./CustomModal";
import Button, { type ButtonVariant } from "../buttons/Button";

interface Props extends Omit<CustomModalProps, "children"> {
    description?: ReactNode;
    confirmLabel: string;
    cancelLabel?: string;
    cancelVariant?: ButtonVariant;
    confirmDisabled?: boolean;
    onConfirm: () => Promise<boolean | void>;
    onConfirmed?: () => void;
    onError?: (error: unknown) => void;
}

export default function ConfirmationDialog({
    description, confirmLabel, cancelLabel = "Cancel", cancelVariant = "secondary",
    confirmDisabled, onConfirm, onConfirmed, onError, onOpen, ...modal
}: Props) {
    const [pending, setPending] = useState(false);
    const [error, setError] = useState<string>();

    async function confirm(close: () => void) {
        if (pending || confirmDisabled) return;
        setPending(true);
        setError(undefined);
        try {
            if (await onConfirm() === false) return;
            close();
            onConfirmed?.();
        } catch (reason) {
            if (onError) onError(reason);
            else setError(reason instanceof Error ? reason.message : "Could not complete the action.");
        } finally {
            setPending(false);
        }
    }

    return (
        <CustomModal {...modal} onOpen={() => {
            setError(undefined);
            onOpen?.();
        }}>
            {({ closeModal }) => (
                <>
                    {description && <p>{description}</p>}
                    {error && <p role="alert" className="theme-text-danger">{error}</p>}
                    <div className="d-flex gap-2">
                        <Button variant="danger" disabled={pending || confirmDisabled} onClick={() => void confirm(closeModal)}>
                            {confirmLabel}
                        </Button>
                        <Button variant={cancelVariant} onClick={closeModal}>{cancelLabel}</Button>
                    </div>
                </>
            )}
        </CustomModal>
    );
}
