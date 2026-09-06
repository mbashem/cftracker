import "./TextView.css";

interface TextViewProps {
  text: string;
  label: string;
  className?: string;
  title?: string;
  onClick?: () => void;
}

function TextView({
  text,
  label,
  className = "",
  title,
  onClick,
}: TextViewProps) {
  const textClassName = `common-text-view__item rounded-pill ${className}`.trim();

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
