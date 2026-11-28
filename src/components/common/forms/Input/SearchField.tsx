import type Theme from "../../../../util/Theme";
import Input from "./Input";

interface Props {
    label: string;
    name: string;
    placeholder: string;
    value: string;
    onSearch: (value: string) => void;
    theme: Theme;
}

export default function SearchField({ label, name, placeholder, value, onSearch, theme }: Props) {
    return (
        <Input
            className={`mr-sm-2 ${theme.bgText}`}
            type="search"
            aria-label={label}
            placeholder={placeholder}
            name={name}
            autoComplete="on"
            value={value}
            onValueChange={onSearch}
        />
    );
}
