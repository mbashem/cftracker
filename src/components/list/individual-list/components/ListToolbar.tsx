import { faFileExport, faFileImport, faPlus } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import type Theme from "../../../../util/Theme";
import ButtonPopover from "../../../common/buttons/ButtonPopover";
import Button from "../../../common/buttons/Button";
import Select from "../../../common/forms/Input/Select";
import CustomModal from "../../../common/dialogs/CustomModal";
import LabeledButtonGroup from "../../../common/buttons/LabeledButtonGroup";
import SearchField from "../../../common/forms/Input/SearchField";
import type { ListDetails } from "../useIndividualListPage";
import ListCsvImport from "./ListCsvImport";
import { HELP_OPTIONS, STATUS_OPTIONS } from "../practiceFields";

interface Props {
    theme: Theme;
    busy: boolean;
    filters: ListDetails["filters"];
    onFilterChange: ListDetails["changeFilters"];
    onAddProblem: () => void;
    csvImport: ListDetails["csvImport"];
    onImportOpen: () => void;
    onExport: () => void;
}

export default function ListToolbar({ theme, busy, filters, onFilterChange, onAddProblem, csvImport, onImportOpen, onExport }: Props) {
    return (
        <div className="d-flex flex-wrap align-items-end gap-2 mb-3" role="group" aria-label="List toolbar">
            <div className="flex-grow-1">
                <SearchField
                    label="Search problems"
                    name="list-search"
                    placeholder="Problem Name or Id"
                    value={filters.search}
                    theme={theme}
                    onSearch={search => onFilterChange({ search })}
                />
            </div>
            <label>
                Filter by status
                <Select value={filters.status} onValueChange={status => onFilterChange({ status })}
                    options={[["", "All statuses"], ["unset", "Unset"], ...STATUS_OPTIONS]} />
            </label>
            <label>
                Filter by help
                <Select value={filters.help} onValueChange={help => onFilterChange({ help })}
                    options={[["", "All help levels"], ["unset", "Unrecorded"], ...HELP_OPTIONS]} />
            </label>
            <Button theme={theme} onClick={onAddProblem}>
                <FontAwesomeIcon icon={faPlus} /> Add Problem
            </Button>
            <LabeledButtonGroup label="CSV" theme={theme}>
                <CustomModal
                    button={<FontAwesomeIcon icon={faFileImport} />}
                    buttonLabel="Import CSV"
                    buttonPopover="Import CSV"
                    buttonDisabled={busy}
                    buttonVariant="outline"
                    title="Import practice records"
                    theme={theme}
                    size="lg"
                    onOpen={onImportOpen}
                >
                    <ListCsvImport state={csvImport} busy={busy} theme={theme} />
                </CustomModal>
                <ButtonPopover label="Export CSV" theme={theme}>
                    <Button variant="outline" aria-label="Export CSV" onClick={onExport}>
                        <FontAwesomeIcon icon={faFileExport} />
                    </Button>
                </ButtonPopover>
            </LabeledButtonGroup>
        </div>
    );
}
