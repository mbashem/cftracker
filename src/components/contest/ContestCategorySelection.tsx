import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { ContestCat } from "../../types/CF/Contest";
import CheckList from "../common/forms/CheckList";
import Theme from "../../util/Theme";
import { faBars, faMinus } from "@fortawesome/free-solid-svg-icons";
import { memo, useRef } from "react";

interface Props {
  theme: Theme;
  selectedCategories: ContestCat[];
  canSelectMultipleCategories: boolean;
  setSelectedCategories: (selectedCategories: ContestCat[]) => void;
  setCanSelectMultipleCategories: (canSelectMultipleCategories: boolean) => void;
}

function ContestCategorySelection(props: Props) {
  const categories = useRef(Object.values(ContestCat));
  const isAllSelected = categories.current.length === props.selectedCategories.length;

  return (
    <div className="container">
      <div className="row justify-content-start align-items-center">
        <div className="col-11">
          {props.canSelectMultipleCategories ? (
            <CheckList
              items={categories.current}
              active={new Set(props.selectedCategories)}
              name={""}
              onClickSet={(categories) => props.setSelectedCategories(Array.from(categories))}
              activeClass="btn-secondary active"
              inactiveClass="btn-secondary"
              btnClass="p-1 btn"
              appendButtonsEnd={[
                {
                  label: "All",
                  isActive: isAllSelected,
                  onClick: () => {
                    if (isAllSelected) props.setSelectedCategories([]);
                    else props.setSelectedCategories(categories.current);
                  },
                },
              ]}
            />
          ) : (
            <CheckList
              items={categories.current}
              active={new Set(props.selectedCategories)}
              name={""}
              onClick={(category) => props.setSelectedCategories([category])}
              activeClass="btn-secondary active"
              inactiveClass="btn-secondary"
              btnClass="p-1 btn"
            />
          )}
        </div>
        <div className="col-1">
          <button
            className={props.theme.btn}
            onClick={() => props.setCanSelectMultipleCategories(!props.canSelectMultipleCategories)}
            title={props.canSelectMultipleCategories ? "Disable Multiselect" : "Enable Multiselect"}
          >
            <FontAwesomeIcon icon={props.canSelectMultipleCategories ? faMinus : faBars} />
          </button>
        </div>
      </div>
    </div>
  );
}

export default memo(ContestCategorySelection);
