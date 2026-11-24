import type Theme from "../../util/Theme";

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
        <input
            className={`form-control mr-sm-2 ${theme.bgText}`}
            type="search"
            aria-label={label}
            placeholder={placeholder}
            name={name}
            autoComplete="on"
            value={value}
            onChange={event => onSearch(event.target.value)}
        />
    );
}
