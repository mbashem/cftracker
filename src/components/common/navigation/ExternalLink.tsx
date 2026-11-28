import type { ComponentPropsWithoutRef } from "react";

type Props = Omit<ComponentPropsWithoutRef<"a">, "rel" | "target">;

export default function ExternalLink(props: Props) {
    return <a {...props} target="_blank" rel="noreferrer" />;
}
