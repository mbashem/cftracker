import { memo, type Key, type ReactNode } from "react";
import type Theme from "../../../util/Theme";

export interface TableColumn<Row> {
    id: string;
    header: ReactNode;
    renderCell: (row: Row) => ReactNode;
    columnClassName?: string;
    cellClassName?: string;
    headerTitle?: string;
    rowHeader?: boolean;
}

interface Props<Row> {
    columns: readonly TableColumn<Row>[];
    rows: readonly Row[];
    getRowKey: (row: Row) => Key;
    theme: Theme;
    className?: string;
    compact?: boolean;
}

function Table<Row>({ columns, rows, getRowKey, theme, className = "", compact }: Props<Row>) {
    return (
        <div className="table-responsive">
            <table className={`table table-bordered m-0 ${theme.table}${compact ? " table-sm" : ""} ${className}`}>
                <colgroup>
                    {columns.map(column => <col key={column.id} className={column.columnClassName} />)}
                </colgroup>
                <thead className={theme.thead}>
                    <tr>
                        {columns.map(column => (
                            <th key={column.id} scope="col" title={column.headerTitle}>{column.header}</th>
                        ))}
                    </tr>
                </thead>
                <tbody className={theme.bg}>
                    {rows.map(row => (
                        <tr key={getRowKey(row)}>
                            {columns.map(column => column.rowHeader ? (
                                <th key={column.id} scope="row" className={column.cellClassName}>{column.renderCell(row)}</th>
                            ) : (
                                <td key={column.id} className={column.cellClassName}>{column.renderCell(row)}</td>
                            ))}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

export default memo(Table) as typeof Table;
