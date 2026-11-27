import { useMemo, useRef, useState } from "react";
import type { ListItemInput, ListAddResult, ListWithItem } from "../../../types/list";
import { EMPTY_ARRAY } from "../../../util/constants";
import { defaultCsvMapping, exportListCsv, parseListCsv, previewListCsv, type CsvMapping } from "./listCsv";
import { LIST_CAPACITY } from "./practiceFields";

interface CsvState {
    file?: ReturnType<typeof parseListCsv>;
    mapping: CsvMapping;
    unit: "seconds" | "minutes";
    error?: string;
    result?: string;
}

function initialCsvState(): CsvState {
    return { mapping: {}, unit: "seconds" };
}

export default function useListCsv(
    list: ListWithItem | undefined,
    busy: boolean,
    addItems: (items: ListItemInput[]) => Promise<ListAddResult>,
) {
    const [csv, setCsv] = useState(initialCsvState);
    const importVersion = useRef(0);
    const items = list?.items ?? EMPTY_ARRAY;
    const preview = useMemo(() => csv.file && csv.mapping.problemId !== undefined && csv.result === undefined
        ? previewListCsv(csv.file, csv.mapping, csv.unit, new Set(items.map(item => item.problemId)))
        : undefined, [csv.file, csv.mapping, csv.unit, csv.result, items]);
    const overCapacity = preview !== undefined && preview.items.length + items.length > LIST_CAPACITY;

    function resetCsvImport() {
        importVersion.current++;
        setCsv(initialCsvState());
    }

    function updateImport(version: number, change: Partial<CsvState>) {
        // Another file or an opened dialog can supersede a pending read or import.
        if (importVersion.current === version) setCsv(current => ({ ...current, ...change }));
    }

    async function readFile(selectedFile?: File) {
        resetCsvImport();
        const version = importVersion.current;
        if (selectedFile === undefined) return;
        try {
            const file = parseListCsv(await selectedFile.text());
            const mapping = defaultCsvMapping(file.headers);
            updateImport(version, { file, mapping, unit: mapping.timeSpent === undefined ? "minutes" : "seconds" });
        } catch (reason) {
            updateImport(version, { error: reason instanceof Error ? reason.message : "Could not read the CSV file." });
        }
    }

    async function submit() {
        if (busy || !preview?.items.length || overCapacity) return;
        const version = importVersion.current;
        updateImport(version, { error: undefined });
        try {
            const { added, duplicateProblemIds } = await addItems(preview.items);
            const skipped = preview.rows.length - preview.items.length + duplicateProblemIds.length;
            updateImport(version, { result: `Imported ${added.length} · Skipped ${skipped}.` });
        } catch (reason) {
            updateImport(version, { error: reason instanceof Error ? reason.message : "CSV import failed." });
        }
    }

    function downloadCsv() {
        if (list === undefined) return;
        const csvFile = new Blob([exportListCsv(items)], { type: "text/csv;charset=utf-8" });
        const url = URL.createObjectURL(csvFile);
        const download = document.createElement("a");
        download.href = url;
        download.download = `${list.name}.csv`;
        download.click();
        setTimeout(() => URL.revokeObjectURL(url), 0);
    }

    return {
        resetCsvImport, downloadCsv,
        csvImport: {
            headers: csv.file?.headers,
            mapping: csv.mapping,
            unit: csv.unit,
            error: csv.error,
            result: csv.result,
            preview: preview && {
                rows: preview.rows,
                readyCount: preview.items.length,
                skippedCount: preview.rows.length - preview.items.length,
            },
            overCapacity, readFile, submit,
            changeMapping: (field: keyof CsvMapping, column: number | undefined) => {
                setCsv(current => ({ ...current, mapping: { ...current.mapping, [field]: column } }));
            },
            changeUnit: (unit: CsvState["unit"]) => setCsv(current => ({ ...current, unit })),
        },
    };
}
