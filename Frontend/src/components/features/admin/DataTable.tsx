import { SkeletonBlock } from "@/components/common/Loading";

export interface Column<T> {
    key: string;
    header: string;
    render: (row: T) => React.ReactNode;
    className?: string;
}

interface DataTableProps<T> {
    columns: Column<T>[];
    data: T[];
    keyExtractor: (row: T) => string;
    isLoading?: boolean;
    emptyText?: string;
    actions?: (row: T) => React.ReactNode;
}

function DataTable<T>({
    columns,
    data,
    keyExtractor,
    isLoading = false,
    emptyText = "Không có dữ liệu.",
    actions,
}: DataTableProps<T>) {
    const allCols = actions
        ? [...columns, { key: "__actions", header: "Thao tác", render: actions, className: "text-right" }]
        : columns;

    return (
        <div className="overflow-x-auto rounded-2xl border border-border shadow-sm">
            <table className="w-full text-sm">
                <thead>
                    <tr className="bg-muted/50 dark:bg-muted/30 border-b border-border">
                        {allCols.map((col) => (
                            <th
                                key={col.key}
                                className={`px-4 py-3 text-left font-bold text-muted-foreground text-xs uppercase tracking-wider ${col.className ?? ""}`}
                            >
                                {col.header}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {isLoading
                        ? Array.from({ length: 5 }).map((_, i) => (
                            <tr key={i} className="border-b border-border">
                                {allCols.map((col) => (
                                    <td key={col.key} className="px-4 py-3">
                                        <SkeletonBlock className="h-4 w-full" />
                                    </td>
                                ))}
                            </tr>
                        ))
                        : data.length === 0
                            ? (
                                <tr>
                                    <td colSpan={allCols.length} className="text-center py-12 text-muted-foreground text-sm">
                                        {emptyText}
                                    </td>
                                </tr>
                            )
                            : data.map((row) => (
                                <tr
                                    key={keyExtractor(row)}
                                    className="border-b border-border hover:bg-muted/20 transition-colors"
                                >
                                    {allCols.map((col) => (
                                        <td key={col.key} className={`px-4 py-3 text-foreground ${col.className ?? ""}`}>
                                            {col.render(row)}
                                        </td>
                                    ))}
                                </tr>
                            ))}
                </tbody>
            </table>
        </div>
    );
}

export default DataTable;