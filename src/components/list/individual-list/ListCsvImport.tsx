import type { ListDetails } from "../useListPage";
import { CSV_FIELDS } from "./listCsv";
import { LIST_CAPACITY } from "./practiceFields";

interface Props {
    state: ListDetails["csvImport"];
    busy: boolean;
}

export default function ListCsvImport({ state, busy }: Props) {
    const { headers, mapping, unit, error, result, preview, overCapacity } = state;

    return (
        <form onSubmit={event => {
            event.preventDefault();
            void state.submit();
        }}>
            <fieldset disabled={busy} className="d-grid gap-3">
                <label>
                    CSV file
                    <input className="form-control" type="file" accept=".csv,text/csv" onChange={event => void state.readFile(event.target.files?.[0])} />
                </label>
                {headers && result === undefined && (
                    <>
                        <div className="row g-2">
                            {CSV_FIELDS.map(([field, label]) => (
                                <label key={field} className="col-sm-6">
                                    {label}
                                    <select className="form-select" value={mapping[field] ?? ""} onChange={event => {
                                        const column = event.target.value === "" ? undefined : Number(event.target.value);
                                        state.changeMapping(field, column);
                                    }}>
                                        <option value="">{field === "problemId" ? "Choose a column" : "Skip field"}</option>
                                        {headers.map((header, index) => <option key={index} value={index}>{header || `Column ${index + 1}`}</option>)}
                                    </select>
                                </label>
                            ))}
                            {mapping.timeSpent !== undefined && (
                                <label className="col-sm-6">
                                    Active time unit
                                    <select className="form-select" value={unit} onChange={event => state.changeUnit(event.target.value === "minutes" ? "minutes" : "seconds")}>
                                        <option value="seconds">Seconds</option>
                                        <option value="minutes">Minutes</option>
                                    </select>
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
                                    <table className="table table-sm table-bordered mb-0">
                                        <thead><tr><th scope="col">Row</th><th scope="col">Problem</th><th scope="col">Result</th></tr></thead>
                                        <tbody>
                                            {preview.rows.map(row => <tr key={row.number}><td>{row.number}</td><td>{row.problemId}</td><td>{row.result}</td></tr>)}
                                        </tbody>
                                    </table>
                                </div>
                                <button type="submit" className="btn btn-primary" disabled={!preview.readyCount || overCapacity}>
                                    {busy ? "Importing…" : `Import ${preview.readyCount} ${preview.readyCount === 1 ? "problem" : "problems"}`}
                                </button>
                            </>
                        )}
                    </>
                )}
                {error && <p role="alert" className="theme-text-danger mb-0">{error}</p>}
                {result && <p role="status" className="mb-0">{result}</p>}
            </fieldset>
        </form>
    );
}
