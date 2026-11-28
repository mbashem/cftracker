import type { IconDefinition } from "@fortawesome/fontawesome-svg-core";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import type { ReactNode } from "react";
import { Link } from "react-router";

interface MenuItemBase {
  id: string;
  visible?: boolean;
  active?: boolean;
}

export type MenuItemDefinition = MenuItemBase & (
  | { kind: "route"; label: string; to: string }
  | { kind: "action"; label: string; icon: IconDefinition; onSelect: () => void }
  | { kind: "link"; label: string; icon: IconDefinition; href: string }
  | { kind: "custom"; content: ReactNode }
);

export default function MenuItem({ item }: { item: MenuItemDefinition }) {
  let content: ReactNode;
  switch (item.kind) {
    case "route":
      content = <Link to={item.to} className="nav-link"><span>{item.label}</span></Link>;
      break;
    case "custom":
      content = item.content;
      break;
    default:
      content = (
        <a
          className="nav-link"
          href={item.kind === "link" ? item.href : "#"}
          title={item.label}
          aria-label={item.label}
          onClick={item.kind === "action" ? (event) => { event.preventDefault(); item.onSelect(); } : undefined}
        >
          <FontAwesomeIcon icon={item.icon} />
        </a>
      );
  }
  return <li className={"nav-item" + (item.active ? " active" : "")}>{content}</li>;
}
