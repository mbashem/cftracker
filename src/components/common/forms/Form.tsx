import type { ComponentPropsWithoutRef } from "react";

interface Props extends Omit<ComponentPropsWithoutRef<"form">, "onSubmit"> {
    onSubmit: () => void | Promise<void>;
}

export default function Form({ onSubmit, ...props }: Props) {
    return <form {...props} onSubmit={event => {
        event.preventDefault();
        void onSubmit();
    }} />;
}
