import { useEffect, useId, useState, type ReactNode } from "react";
import CustomModal, { type CustomModalProps } from "./CustomModal";
import Button from "../buttons/Button";
import Form from "../forms/Form";
import Input from "../forms/Input/Input";

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

    async function submit(close: () => void) {
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
                <Form onSubmit={() => submit(closeModal)}>
                    <div className="d-flex align-items-center justify-content-between">
                        <label htmlFor={inputId}>{label}</label>
                        {renderFieldAction?.(closeModal)}
                    </div>
                    <Input
                        type="text"
                        id={inputId}
                        placeholder={placeholder}
                        value={value}
                        onValueChange={setValue}
                        readOnly={pending}
                        required
                    />
                    {error && <p role="alert" className="theme-text-danger mt-2 mb-0">{error}</p>}
                    <Button type="submit" variant="primary" className="mt-2" disabled={pending}>{submitLabel}</Button>
                </Form>
            )}
        </CustomModal>
    );
}
