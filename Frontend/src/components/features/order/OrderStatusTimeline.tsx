import { Check, Clock3 } from "lucide-react";

import { OrderStatusBadge, type OrderTimelineStatus } from "@/components/features/order/OrderStatusBadge";
import type { Order, OrderStatusHistoryItem } from "@/types/order";
import { formatDateTime } from "@/utils/format";

const TIMELINE_LABELS: Record<string, string> = {
    Created: "Đơn hàng đã được tạo",
    Pending: "Chờ xác nhận",
    Processing: "Đơn hàng đang được xử lý",
    Shipping: "Đơn hàng đang được giao",
    Delivered: "Đơn hàng đã giao thành công",
    CancelRequested: "Khách hàng đã yêu cầu hủy đơn",
    CancelRejected: "Shop đã từ chối yêu cầu hủy đơn",
    Cancelled: "Đơn hàng đã bị hủy",
};

const ROLE_LABELS: Record<string, string> = {
    customer: "Khách hàng",
    admin: "Quản trị viên",
    system: "Hệ thống",
};

const buildFallbackTimeline = (order: Order): OrderStatusHistoryItem[] => {
    const createdAt = order.createdAt || order.updatedAt;
    const items: OrderStatusHistoryItem[] = [
        {
            status: "Created",
            note: TIMELINE_LABELS.Created,
            updatedAt: createdAt,
            updatedByRole: "customer",
        },
    ];

    if (order.status === "Pending") {
        items.push({
            status: "Pending",
            note: TIMELINE_LABELS.Pending,
            updatedAt: createdAt,
            updatedByRole: "system",
        });
    } else {
        items.push({
            status: order.status,
            note: TIMELINE_LABELS[order.status] ?? order.status,
            updatedAt: order.updatedAt || createdAt,
            updatedByRole: order.status === "Cancelled" ? "admin" : "system",
        });
    }

    if (order.cancelRequestedAt) {
        items.push({
            status: "CancelRequested",
            note: order.cancelReason
                ? `${TIMELINE_LABELS.CancelRequested}: ${order.cancelReason}`
                : TIMELINE_LABELS.CancelRequested,
            updatedAt: order.cancelRequestedAt,
            updatedByRole: "customer",
        });
    }

    if (order.cancelStatus === "rejected" && order.cancelResolvedAt) {
        items.push({
            status: "CancelRejected",
            note: order.cancelRejectionReason
                ? `${TIMELINE_LABELS.CancelRejected}: ${order.cancelRejectionReason}`
                : TIMELINE_LABELS.CancelRejected,
            updatedAt: order.cancelResolvedAt,
            updatedByRole: "admin",
        });
    }

    return items;
};

interface OrderStatusTimelineProps {
    order: Order;
    compact?: boolean;
}

const hasCompleteTimestamps = (history: OrderStatusHistoryItem[]) => history.every((item) => (
    Boolean(item.updatedAt) && Number.isFinite(Date.parse(item.updatedAt ?? ""))
));

const OrderStatusTimeline = ({ order, compact = false }: OrderStatusTimelineProps) => {
    const usesFallback = !order.statusHistory?.length;
    const sourceTimeline = usesFallback ? buildFallbackTimeline(order) : order.statusHistory ?? [];
    const timeline = sourceTimeline.filter((item) => item.status);
    const sortedTimeline = hasCompleteTimestamps(timeline)
        ? [...timeline].sort((a, b) => Date.parse(a.updatedAt!) - Date.parse(b.updatedAt!))
        : timeline;

    if (!sortedTimeline.length) {
        return (
            <p className="py-4 text-sm text-muted-foreground">Chưa có lịch sử cập nhật cho đơn hàng này.</p>
        );
    }

    const latestIndex = sortedTimeline.length - 1;

    return (
        <section className={compact ? "space-y-3" : "border border-border bg-surface p-4 sm:p-5"} aria-labelledby={compact ? undefined : "order-timeline-title"}>
            {!compact && (
                <header className="mb-5">
                    <h2 id="order-timeline-title" className="text-base font-semibold text-text-strong">Theo dõi đơn hàng</h2>
                    <p className="mt-1 text-sm leading-6 text-muted-foreground">
                        {usesFallback
                            ? "Các mốc dưới đây được dựng từ trạng thái và thời điểm hiện có của đơn hàng cũ."
                            : "Lịch sử trạng thái được cập nhật theo từng mốc của đơn hàng."}
                    </p>
                </header>
            )}

            <ol className="relative">
                {sortedTimeline.map((item, index) => {
                    const isLatest = index === latestIndex;
                    const roleLabel = item.updatedByRole ? ROLE_LABELS[item.updatedByRole] ?? item.updatedByRole : undefined;

                    return (
                        <li key={`${item.status}-${item.updatedAt ?? "unknown"}-${index}`} className="relative flex gap-3 pb-5 last:pb-0">
                            {index < latestIndex && <span aria-hidden="true" className="absolute bottom-0 left-[13px] top-7 w-px bg-divider" />}
                            <span className={`relative z-10 mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full border ${
                                isLatest ? "border-primary bg-primary-subtle text-primary" : "border-border bg-surface-subtle text-muted-foreground"
                            }`}>
                                {index < latestIndex ? <Check aria-hidden="true" className="size-4" /> : <Clock3 aria-hidden="true" className="size-4" />}
                            </span>
                            <div className="min-w-0 flex-1 pb-0.5">
                                <div className="flex flex-wrap items-center gap-2">
                                    <OrderStatusBadge status={item.status as OrderTimelineStatus} />
                                    {roleLabel && <span className="text-xs text-muted-foreground">Cập nhật bởi {roleLabel}</span>}
                                </div>
                                <p className="mt-2 text-sm font-medium leading-6 text-text-strong">
                                    {item.note || TIMELINE_LABELS[item.status] || item.status}
                                </p>
                                <p className="mt-1 text-xs text-muted-foreground">
                                    {item.updatedAt ? formatDateTime(item.updatedAt) : "Chưa có thời điểm cập nhật"}
                                </p>
                            </div>
                        </li>
                    );
                })}
            </ol>
        </section>
    );
};

export default OrderStatusTimeline;
