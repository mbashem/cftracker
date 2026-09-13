import "./TextView.css";

interface TextViewProps {
  text: string;
  label: string;
  variant?: "default" | "inverse";
  className?: string;
  title?: string;
  onClick?: () => void;
}

function TextView({
  text,
  label,
  variant = "default",
  className = "",
  title,
  onClick,
}: TextViewProps) {
  const textClassName = `common-text-view__item common-text-view__item--${variant} rounded-pill ${className}`.trim();

  if (onClick !== undefined) {
    return (
      <button type="button" className={textClassName} aria-label={label} title={title} onClick={onClick}>
        {text}
      </button>
    );
  }

  return <span className={textClassName}>{text}</span>;
}

export default TextView;
