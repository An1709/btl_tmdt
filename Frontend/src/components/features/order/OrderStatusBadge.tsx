import { Badge } from "@/components/ui/badge";
import type { OrderStatus } from "@/types/order";
import { ORDER_STATUS_LABELS } from "@/utils/constants";

export type OrderTimelineStatus = OrderStatus | "Created" | "CancelRequested" | "CancelRejected";

type StatusTone = "neutral" | "success" | "warning" | "error" | "info" | "pending";

const TIMELINE_STATUS_LABELS: Record<Exclude<OrderTimelineStatus, OrderStatus>, string> = {
    Created: "Đơn hàng đã được tạo",
    CancelRequested: "Đã gửi yêu cầu hủy",
    CancelRejected: "Yêu cầu hủy bị từ chối",
};

const STATUS_TONES: Record<OrderTimelineStatus, StatusTone> = {
    Created: "neutral",
    Pending: "pending",
    Processing: "info",
    Shipping: "info",
    Delivered: "success",
    CancelRequested: "warning",
    CancelRejected: "warning",
    Cancelled: "error",
};

const getOrderStatusLabel = (status: OrderTimelineStatus | string) => (
    ORDER_STATUS_LABELS[status] ?? TIMELINE_STATUS_LABELS[status as keyof typeof TIMELINE_STATUS_LABELS] ?? status
);

export const OrderStatusBadge = ({ status, className }: { status: OrderTimelineStatus | string; className?: string }) => (
    <Badge tone={STATUS_TONES[status as OrderTimelineStatus] ?? "neutral"} className={className}>
        {getOrderStatusLabel(status)}
    </Badge>
);

export const PaymentStatusBadge = ({ isPaid }: { isPaid: boolean }) => (
    <Badge tone={isPaid ? "success" : "pending"}>
        {isPaid ? "Đã thanh toán" : "Chưa thanh toán"}
    </Badge>
);
