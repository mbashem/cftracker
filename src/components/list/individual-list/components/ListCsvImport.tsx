import type Theme from "../../../../util/Theme";
import Button from "../../../common/buttons/Button";
import Form from "../../../common/forms/Form";
import Input from "../../../common/forms/Input/Input";
import Select from "../../../common/forms/Input/Select";
import Table, { type TableColumn } from "../../../common/display/Table";
import type { ListDetails } from "../useIndividualListPage";
import { CSV_FIELDS } from "../listCsv";
import { LIST_CAPACITY } from "../practiceFields";

interface Props {
    state: ListDetails["csvImport"];
    busy: boolean;
    theme: Theme;
}

type PreviewRow = NonNullable<Props["state"]["preview"]>["rows"][number];
const columns: TableColumn<PreviewRow>[] = [
    { id: "number", header: "Row", renderCell: row => row.number },
    { id: "problemId", header: "Problem", renderCell: row => row.problemId },
    { id: "result", header: "Result", renderCell: row => row.result },
];
const getRowKey = (row: PreviewRow) => row.number;

export default function ListCsvImport({ state, busy, theme }: Props) {
    const { headers, mapping, unit, error, result, preview, overCapacity } = state;

    return (
        <Form onSubmit={state.submit}>
            <fieldset disabled={busy} className="d-grid gap-3">
                <label>
                    CSV file
                    <Input type="file" accept=".csv,text/csv" onFileChange={state.readFile} />
                </label>
                {headers && result === undefined && (
                    <>
                        <div className="row g-2">
                            {CSV_FIELDS.map(([field, label]) => (
                                <label key={field} className="col-sm-6">
                                    {label}
                                    <Select
                                        value={mapping[field] ?? ""}
                                        onValueChange={value => state.changeMapping(field, value === "" ? undefined : Number(value))}
                                        options={[["", field === "problemId" ? "Choose a column" : "Skip field"],
                                            ...headers.map((header, index) => [index, header || `Column ${index + 1}`] as const)]}
                                    />
                                </label>
                            ))}
                            {mapping.timeSpent !== undefined && (
                                <label className="col-sm-6">
                                    Active time unit
                                    <Select value={unit} onValueChange={value => state.changeUnit(value === "minutes" ? "minutes" : "seconds")}
                                        options={[["seconds", "Seconds"], ["minutes", "Minutes"]]} />
                                </label>
                            )}
                        </div>
                        {preview && (
                            <>
                                <p className="mb-0" role="status">
                                    {preview.readyCount} ready to add at the top of this list. {preview.skippedCount} will be skipped.
                                </p>
                                {overCapacity && <p role="alert">This import exceeds the {LIST_CAPACITY.toLocaleString()}-item list limit.</p>}
                                <div className="table-responsive" style={{ maxHeight: "16rem" }} tabIndex={0} aria-label="CSV preview">
                                    <Table compact theme={theme} columns={columns} rows={preview.rows} getRowKey={getRowKey} />
                                </div>
                                <Button type="submit" variant="primary" disabled={!preview.readyCount || overCapacity}>
                                    {busy ? "Importing…" : `Import ${preview.readyCount} ${preview.readyCount === 1 ? "problem" : "problems"}`}
                                </Button>
                            </>
                        )}
                    </>
                )}
                {error && <p role="alert" className="theme-text-danger mb-0">{error}</p>}
                {result && <p role="status" className="mb-0">{result}</p>}
            </fieldset>
        </Form>
    );
}
