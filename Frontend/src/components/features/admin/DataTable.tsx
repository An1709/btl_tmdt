import * as React from "react";

import { SkeletonBlock } from "@/components/common/Loading";
import { Button } from "@/components/ui/button";
import { Dialog, DialogFooter } from "@/components/ui/dialog";
import { EmptyState, ErrorState } from "@/components/ui/feedback-state";
import { cn } from "@/lib/utils";

export interface Column<T> {
  key: string;
  header: React.ReactNode;
  render: (row: T) => React.ReactNode;
  className?: string;
  headerClassName?: string;
  cellClassName?: string;
  hideOnMobile?: boolean;
}

type TableError = {
  title?: string;
  description?: React.ReactNode;
  action?: React.ReactNode;
};

interface DataTableProps<T> {
  columns: readonly Column<T>[];
  data: readonly T[];
  keyExtractor: (row: T) => string;
  isLoading?: boolean;
  emptyTitle?: string;
  emptyText?: string;
  emptyAction?: React.ReactNode;
  error?: TableError | string | null;
  actions?: (row: T) => React.ReactNode;
  tableLabel?: string;
  caption?: React.ReactNode;
  tableClassName?: string;
  containerClassName?: string;
  rowClassName?: (row: T) => string | undefined;
}

type RowActionGroupProps = React.ComponentProps<"div">;

function DataTableActionGroup({ className, ...props }: RowActionGroupProps) {
  return <div className={cn("flex flex-wrap justify-end gap-2", className)} {...props} />;
}

type ConfirmActionProps = {
  label: string;
  title: string;
  description: React.ReactNode;
  confirmLabel?: string;
  onConfirm: () => boolean | Promise<boolean>;
  disabled?: boolean;
};

function DataTableConfirmAction({ label, title, description, confirmLabel = "Xác nhận", onConfirm, disabled = false }: ConfirmActionProps) {
  const [open, setOpen] = React.useState(false);
  const [confirming, setConfirming] = React.useState(false);

  const handleConfirm = async () => {
    setConfirming(true);
    try {
      const succeeded = await onConfirm();
      if (succeeded) setOpen(false);
    } finally {
      setConfirming(false);
    }
  };

  return (
    <>
      <Button type="button" variant="destructive" size="sm" disabled={disabled} onClick={() => setOpen(true)}>{label}</Button>
      <Dialog
        open={open}
        onOpenChange={(nextOpen) => { if (!confirming) setOpen(nextOpen); }}
        title={title}
        description={description}
        size="sm"
        closeOnBackdrop={!confirming}
        closeOnEscape={!confirming}
        footer={<DialogFooter><Button type="button" variant="outline" disabled={confirming} onClick={() => setOpen(false)}>Hủy</Button><Button type="button" variant="destructive" loading={confirming} onClick={() => void handleConfirm()}>{confirmLabel}</Button></DialogFooter>}
      >
        <p className="text-sm leading-6 text-muted-foreground">Hành động này có thể ảnh hưởng đến dữ liệu đang hiển thị.</p>
      </Dialog>
    </>
  );
}

function DataTable<T>({
  columns,
  data,
  keyExtractor,
  isLoading = false,
  emptyTitle = "Chưa có dữ liệu",
  emptyText = "Không có dữ liệu để hiển thị.",
  emptyAction,
  error,
  actions,
  tableLabel = "Bảng dữ liệu quản trị",
  caption,
  tableClassName,
  containerClassName,
  rowClassName,
}: DataTableProps<T>) {
  const allColumns: readonly Column<T>[] = actions
    ? [...columns, { key: "__actions", header: "Thao tác", render: actions, headerClassName: "text-right", cellClassName: "text-right" }]
    : columns;
  const mobileColumns = allColumns.filter((column) => !column.hideOnMobile);
  const errorState = typeof error === "string" ? { description: error } : error;

  const renderCellClassName = (column: Column<T>) => cn("px-4 py-3.5 align-middle text-foreground", column.className, column.cellClassName);
  const renderHeaderClassName = (column: Column<T>) => cn("px-4 py-3 text-left text-xs font-semibold text-muted-foreground", column.className, column.headerClassName);

  const stateContent = errorState
    ? <ErrorState title={errorState.title ?? "Không thể tải dữ liệu"} description={errorState.description} action={errorState.action} />
    : <EmptyState title={emptyTitle} description={emptyText} action={emptyAction} />;

  return (
    <section className={cn("overflow-hidden rounded-lg border border-border bg-surface-elevated", containerClassName)} aria-label={tableLabel}>
      <div className="sm:hidden">
        {isLoading ? (
          <div className="space-y-3 p-4" aria-busy="true" aria-label="Đang tải dữ liệu">
            {Array.from({ length: 3 }, (_, index) => <SkeletonBlock key={index} className="h-36 rounded-md" />)}
          </div>
        ) : errorState || data.length === 0 ? stateContent : (
          <ol className="divide-y divide-divider">
            {data.map((row) => (
              <li key={keyExtractor(row)} className={cn("p-4", rowClassName?.(row))}>
                <dl className="space-y-3">
                  {mobileColumns.map((column) => (
                    <div key={column.key} className="grid grid-cols-[minmax(6.5rem,0.75fr)_minmax(0,1.25fr)] items-start gap-3">
                      <dt className="text-xs font-medium text-muted-foreground">{column.header}</dt>
                      <dd className={cn("min-w-0 text-right text-sm text-foreground", column.cellClassName)}>{column.render(row)}</dd>
                    </div>
                  ))}
                </dl>
              </li>
            ))}
          </ol>
        )}
      </div>

      <div className="hidden max-w-full overflow-x-auto sm:block" role="region" aria-label={tableLabel} tabIndex={0}>
        <table className={cn("w-full min-w-max border-collapse text-sm", tableClassName)} aria-busy={isLoading || undefined}>
          {caption && <caption className="sr-only">{caption}</caption>}
          <thead className="border-b border-divider bg-surface-subtle">
            <tr>{allColumns.map((column) => <th key={column.key} scope="col" className={renderHeaderClassName(column)}>{column.header}</th>)}</tr>
          </thead>
          <tbody>
            {isLoading ? Array.from({ length: 5 }, (_, index) => (
              <tr key={`loading-${index}`} className="border-b border-divider last:border-b-0">
                {allColumns.map((column) => <td key={column.key} className={renderCellClassName(column)}><SkeletonBlock className="h-4 w-full min-w-16" /></td>)}
              </tr>
            )) : errorState || data.length === 0 ? (
              <tr><td colSpan={allColumns.length}>{stateContent}</td></tr>
            ) : data.map((row) => (
              <tr key={keyExtractor(row)} className={cn("border-b border-divider transition-colors duration-fast hover:bg-surface-subtle last:border-b-0", rowClassName?.(row))}>
                {allColumns.map((column) => <td key={column.key} className={renderCellClassName(column)}>{column.render(row)}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export { DataTableActionGroup, DataTableConfirmAction };
export default DataTable;
