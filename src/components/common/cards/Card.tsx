import type { ReactNode } from "react";
import { CardType } from "./CardType";
import "./Card.css";

export interface CardProps {
  type: CardType;
  title: ReactNode;
  content?: ReactNode;
  description?: ReactNode;
  icon?: ReactNode;
  onClick?: () => void;
}

function Card({ type, title, content, description, icon, onClick }: CardProps) {
  const isInteractive = onClick !== undefined;
  const className = `common-card common-card--${type}${isInteractive ? " common-card--interactive" : ""}`;
  const cardContent = (
    <>
      {icon !== undefined && (
        <span className="common-card__icon" aria-hidden="true">
          {icon}
        </span>
      )}
      <span className="common-card__body">
        <span className="common-card__title">{title}</span>
        {content !== undefined && <span className="common-card__content">{content}</span>}
        {description !== undefined && <span className="common-card__description">{description}</span>}
      </span>
    </>
  );

  if (isInteractive) {
    return (
      <button type="button" className={className} onClick={onClick}>
        {cardContent}
      </button>
    );
  }

  return <div className={className}>{cardContent}</div>;
}

export default Card;
