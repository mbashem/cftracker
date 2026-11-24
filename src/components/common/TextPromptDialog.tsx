import { useEffect, useId, useState, type FormEvent, type ReactNode } from "react";
import CustomModal, { type CustomModalProps } from "./CustomModal";

interface Props extends Omit<CustomModalProps, "children"> {
    label: string;
    placeholder?: string;
    initialValue?: string;
    submitLabel: string;
    onSubmit: (value: string) => Promise<boolean>;
    renderFieldAction?: (close: () => void) => ReactNode;
}

export default function TextPromptDialog({
    label, placeholder, initialValue = "", submitLabel, onSubmit, renderFieldAction, onOpen, ...modal
}: Props) {
    const inputId = useId();
    const [value, setValue] = useState(initialValue);
    const [pending, setPending] = useState(false);
    const [error, setError] = useState<string>();
    useEffect(() => setValue(initialValue), [initialValue]);

    async function submit(event: FormEvent<HTMLFormElement>, close: () => void) {
        event.preventDefault();
        if (pending) return;
        setPending(true);
        setError(undefined);
        try {
            if (!await onSubmit(value)) return;
            setValue(initialValue);
            close();
        } catch (reason) {
            setError(reason instanceof Error ? reason.message : "Could not save the value.");
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
                <form onSubmit={event => void submit(event, closeModal)}>
                    <div className="d-flex align-items-center justify-content-between">
                        <label htmlFor={inputId}>{label}</label>
                        {renderFieldAction?.(closeModal)}
                    </div>
                    <input
                        className="form-control"
                        type="text"
                        id={inputId}
                        placeholder={placeholder}
                        value={value}
                        onChange={event => setValue(event.target.value)}
                        readOnly={pending}
                        required
                    />
                    {error && <p role="alert" className="theme-text-danger mt-2 mb-0">{error}</p>}
                    <button type="submit" className={modal.theme.btnPrimary + " mt-2"} disabled={pending}>{submitLabel}</button>
                </form>
            )}
        </CustomModal>
    );
}
