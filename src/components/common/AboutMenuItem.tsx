import { faGithub } from "@fortawesome/free-brands-svg-icons";
import { faInfo } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { memo } from "react";
import { OverlayTrigger, Popover } from "react-bootstrap";
import type Theme from "../../util/Theme";

interface AboutMenuItemProps {
  theme: Theme;
}

function AboutMenuItem({ theme }: AboutMenuItemProps) {
  return (
    <OverlayTrigger
      trigger="click"
      placement="bottom"
      key="bottom"
      overlay={
        <Popover id="popover-basic" className={theme.bgText}>
          <Popover.Header as="h3" className={theme.bgText}>
            <div className="d-flex align-items-center">
              <span className={theme.bgText}>
                CFTracker (Created by{" "}
                <a href="https://codeforces.com/profile/bashem" className={" " + theme.text} target="__blank">
                  bashem
                </a>
                )
              </span>
            </div>
          </Popover.Header>
          <Popover.Body className={theme.bgText}>
            <ul className="list-group list-group-flush">
              <li className={"list-group-item " + theme.bgText}>
                <span className="pe-2">Source Code</span>
                <a
                  href="https://github.com/mbashem/cftracker"
                  className="text-secondary pt-1 fs-5"
                  target="__blank"
                >
                  {<FontAwesomeIcon icon={faGithub} />}
                </a>
              </li>
            </ul>
          </Popover.Body>
        </Popover>
      }
    >
      <a href="#" onClick={(e) => e.preventDefault()} className="nav-link" title="Created by Bashem">
        <FontAwesomeIcon icon={faInfo} />
      </a>
    </OverlayTrigger>
  );
}

export default memo(AboutMenuItem);
