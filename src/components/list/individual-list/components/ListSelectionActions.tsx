import { faCopy, faTrash } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import type { List } from "../../../../types/list";
import type Theme from "../../../../util/Theme";
import ButtonPopover from "../../../common/ButtonPopover";
import ConfirmationDialog from "../../../common/ConfirmationDialog";
import Button from "../../../common/Button";
import Select from "../../../common/forms/Input/Select";

interface Props {
    count: number;
    copyLists: readonly List[];
    theme: Theme;
    busy: boolean;
    copyDestination?: number;
    onCopyDestinationChange: (destination: string) => void;
    onCopy: () => Promise<void>;
    onRemove: () => Promise<void>;
    onRemoved: () => void;
    onError: (error: unknown) => void;
}

export default function ListSelectionActions({
    count, copyLists, theme, busy, copyDestination, onCopyDestinationChange, onCopy, onRemove, onRemoved, onError,
}: Props) {
    if (count === 0) return null;

    return (
        <div className="d-flex flex-wrap align-items-end gap-2 mb-3" role="group" aria-label="Selected problems">
            <span className="align-self-center me-2">{count} selected</span>
            {copyLists.length > 0 && (
                <>
                    <Select
                        className="w-auto"
                        aria-label="Choose Copy Destination"
                        value={copyDestination ?? ""}
                        disabled={busy}
                        onValueChange={onCopyDestinationChange}
                        options={[["", "Choose Copy Destination"], ...copyLists.map(candidate => [candidate.id, candidate.name] as const)]}
                    />
                    <ButtonPopover label="Copy selected" theme={theme}>
                        <span className="d-inline-flex">
                            <Button
                                variant="outline"
                                aria-label="Copy selected"
                                disabled={busy || copyDestination === undefined}
                                onClick={() => void onCopy().catch(onError)}
                            >
                                <FontAwesomeIcon icon={faCopy} />
                            </Button>
                        </span>
                    </ButtonPopover>
                </>
            )}
            <ConfirmationDialog
                button={<FontAwesomeIcon icon={faTrash} />}
                buttonLabel="Delete selected problems"
                buttonDisabled={busy}
                buttonVariant="outlineDanger"
                title="Delete selected problems"
                theme={theme}
                description={`Remove ${count === 1 ? "the selected problem and its practice record" : `all ${count} selected problems and their practice records`} from this list?`}
                confirmLabel="Confirm removal"
                confirmDisabled={busy}
                onConfirm={onRemove}
                onConfirmed={onRemoved}
                onError={onError}
            />
        </div>
    );
}
