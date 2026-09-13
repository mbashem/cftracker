import {
  faDice,
  faListCheck,
  faTrophy,
  type IconDefinition,
} from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import useAppNavigation from "../../hooks/useAppNavigation";
import { Verdict } from "../../types/CF/Submission";
import { SearchKeys } from "../../util/constants";
import { Path } from "../../util/route/path";
import Card from "../common/cards/Card";
import { CardType } from "../common/cards/CardType";

interface QuickAction {
  title: string;
  description: string;
  icon: IconDefinition;
  path: Path;
  searchParams: URLSearchParams;
}

const actions: readonly QuickAction[] = [
  {
    title: "Random problem",
    description: "Pick a random problem using temporary filters.",
    path: Path.RANDOM_PROBLEM,
    searchParams: new URLSearchParams({
      [SearchKeys.Random]: "true",
      [SearchKeys.UseFilterStorage]: "false",
    }),
    icon: faDice,
  },
  {
    title: "Random contest",
    description: "Pick a random contest using your saved filters.",
    path: Path.CONTESTS,
    searchParams: new URLSearchParams({ [SearchKeys.Random]: "true" }),
    icon: faTrophy,
  },
  {
    title: "Attempted problems",
    description: "Return to problems that still need an accepted solution.",
    path: Path.PROBLEMS,
    searchParams: new URLSearchParams({ [SearchKeys.Status]: Verdict.ATTEMPTED }),
    icon: faListCheck,
  },
];

function QuickActions() {
  const { navigateTo } = useAppNavigation();

  return (
    <section aria-labelledby="quick-actions-heading" className="mb-3">
      <div className="mb-3">
        <p className="home-section-kicker text-uppercase fw-semibold mb-1">Next step</p>
        <h2 className="h3 fw-bold mb-0" id="quick-actions-heading">Quick actions</h2>
      </div>

      <ul className="row g-3 list-unstyled mb-0">
        {actions.map((action) => (
          <li className="col-12 col-md-6 col-xl-4" key={action.title}>
            <Card
              type={CardType.Inline}
              title={action.title}
              description={action.description}
              icon={<FontAwesomeIcon icon={action.icon} />}
              onClick={() => navigateTo(action.path, action.searchParams)}
            />
          </li>
        ))}
      </ul>
    </section>
  );
}

export default QuickActions;
