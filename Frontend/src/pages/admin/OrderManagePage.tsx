import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { orderService } from "@/services/orderService";
import type { Order, OrderStatus } from "@/types/order";
import DataTable, { DataTableActionGroup, type Column } from "@/components/features/admin/DataTable";
import { AdminPageHeader, AdminPanel } from "@/components/features/admin/AdminSurface";
import { OrderStatusBadge, PaymentStatusBadge } from "@/components/features/order/OrderStatusBadge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogFooter } from "@/components/ui/dialog";
import { Select } from "@/components/ui/select";
import { formatCurrency, formatDate } from "@/utils/format";
import { ORDER_STATUS_LABELS } from "@/utils/constants";
import { toast } from "sonner";
import OrderStatusTimeline from "@/components/features/order/OrderStatusTimeline";

const NEXT_STATUS: Partial<Record<OrderStatus, OrderStatus>> = {
    Pending: "Processing",
    Processing: "Shipping",
    Shipping: "Delivered",
};

const NEXT_STATUS_ACTION: Partial<Record<OrderStatus, string>> = {
    Pending: "Xác nhận đơn",
    Processing: "Chuyển sang đang giao",
    Shipping: "Hoàn tất giao hàng",
};

const getShippingAddressText = (order: Order) => {
    const shippingAddress = order.shippingAddress;

    if (shippingAddress?.fullAddress) return shippingAddress.fullAddress;

    return [
        shippingAddress?.streetAddress || shippingAddress?.address,
        shippingAddress?.ward,
        shippingAddress?.district,
        shippingAddress?.province || shippingAddress?.city,
    ].filter(Boolean).join(", ");
};

const OrderManagePage = () => {
    const [orders, setOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState<string | null>(null);
    const [filter, setFilter] = useState("all");
    const [updatingId, setUpdatingId] = useState<string | null>(null);
    const [resolvingCancelId, setResolvingCancelId] = useState<string | null>(null);
    const cancelResolutionInFlightRef = useRef(false);
    const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
    const [pendingAction, setPendingAction] = useState<{ order: Order; type: "transition" | "approve" | "reject" } | null>(null);

    const load = useCallback(() => {
        setLoading(true);
        setLoadError(null);
        orderService.getAllOrders()
            .then((res) => setOrders(res.orders))
            .catch(() => setLoadError("Không thể tải danh sách đơn hàng. Vui lòng thử lại."))
            .finally(() => setLoading(false));
    }, []);

    useEffect(() => { load(); }, [load]);

    const handleNextStatus = async (order: Order) => {
        const nextStatus = NEXT_STATUS[order.status];
        if (!nextStatus) return false;

        try {
            setUpdatingId(order._id);
            const updatedOrder = await orderService.updateStatus(order._id, nextStatus);
            setOrders((prev) => prev.map((o) => o._id === order._id ? updatedOrder : o));
            setSelectedOrder((current) => current?._id === updatedOrder._id ? updatedOrder : current);
            toast.success("Cập nhật trạng thái thành công!");
            return true;
        } catch (err: unknown) {
            const message =
                err && typeof err === "object" && "response" in err
                    ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
                    : undefined;
            toast.error(message ?? "Không thể cập nhật. Vui lòng thử lại.");
            return false;
        } finally {
            setUpdatingId(null);
        }
    };

    const handleResolveCancellation = async (order: Order, action: "approve" | "reject") => {
        if (cancelResolutionInFlightRef.current) return false;

        cancelResolutionInFlightRef.current = true;
        try {
            setResolvingCancelId(order._id);
            const updatedOrder = await orderService.resolveCancellation(order._id, action);
            setOrders((prev) => prev.map((o) => o._id === order._id ? updatedOrder : o));
            setSelectedOrder((current) => current?._id === updatedOrder._id ? updatedOrder : current);
            toast.success(action === "approve" ? "Đã chấp nhận hủy đơn." : "Đã từ chối yêu cầu hủy.");
            return true;
        } catch (err: unknown) {
            const message =
                err && typeof err === "object" && "response" in err
                    ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
                    : undefined;
            toast.error(message ?? "Không thể xử lý yêu cầu hủy. Vui lòng thử lại.");
            return false;
        } finally {
            cancelResolutionInFlightRef.current = false;
            setResolvingCancelId(null);
        }
    };

    const filtered = useMemo(() => filter === "all" ? orders : orders.filter((order) => order.status === filter), [filter, orders]);

    const columns: Column<Order>[] = useMemo(() => [
        { key: "id", header: "Mã đơn", render: (o) => <span className="font-mono text-xs font-semibold">#{o._id.slice(-8).toUpperCase()}</span> },
        {
            key: "customer", header: "Khách hàng", render: (o) => (
                <div className="max-w-64 text-sm">
                    {o.shippingAddress.fullName && <p className="font-semibold text-foreground">{o.shippingAddress.fullName}</p>}
                    <p className="text-foreground">{o.shippingAddress.phone}</p>
                    <p className="text-xs text-muted-foreground line-clamp-2">{getShippingAddressText(o)}</p>
                </div>
            )
        },
        { key: "date", header: "Ngày", hideOnMobile: true, render: (o) => formatDate(o.createdAt) },
        { key: "total", header: "Tổng tiền", render: (o) => <span className="font-semibold text-primary">{formatCurrency(o.totalPrice)}</span> },
        { key: "payment", header: "Thanh toán", hideOnMobile: true, render: (o) => <div className="flex flex-col gap-1"><PaymentStatusBadge isPaid={o.isPaid} /><span className="text-xs uppercase text-muted-foreground">{o.paymentMethod}</span></div> },
        {
            key: "status", header: "Trạng thái", render: (o) => (
                <div className="flex flex-col items-start gap-1">
                    <OrderStatusBadge status={o.status} />
                    {o.cancelStatus === "pending" && (
                        <Badge tone="warning">Khách yêu cầu hủy</Badge>
                    )}
                </div>
            )
        },
        {
            key: "cancel", header: "Yêu cầu hủy", hideOnMobile: true, render: (o) => (
                o.cancelStatus === "pending" ? (
                    <div className="text-xs text-muted-foreground max-w-52">
                        <p className="font-semibold text-foreground">Đang chờ xử lý</p>
                        {o.cancelReason && <p className="line-clamp-2">Lý do: {o.cancelReason}</p>}
                        {o.cancelRequestedAt && <p>{formatDate(o.cancelRequestedAt)}</p>}
                    </div>
                ) : (
                    <span className="text-xs text-muted-foreground">Không có</span>
                )
            )
        },
    ], []);

    const confirmPendingAction = async () => {
        if (!pendingAction) return;
        const succeeded = pendingAction.type === "transition"
            ? await handleNextStatus(pendingAction.order)
            : await handleResolveCancellation(pendingAction.order, pendingAction.type);
        if (succeeded) setPendingAction(null);
    };

    const actionBusy = Boolean(pendingAction && (updatingId === pendingAction.order._id || resolvingCancelId === pendingAction.order._id));
    const actionTitle = pendingAction?.type === "approve" ? "Chấp nhận yêu cầu hủy"
        : pendingAction?.type === "reject" ? "Từ chối yêu cầu hủy"
            : "Cập nhật trạng thái đơn hàng";

    return (
        <div className="flex flex-col gap-6">
            <AdminPageHeader title="Quản lý đơn hàng" description="Theo dõi thanh toán, yêu cầu hủy và tuần tự xử lý đơn hàng theo đúng trạng thái backend cho phép." />
            <AdminPanel title="Lọc đơn hàng" description={`${filtered.length} trong ${orders.length} đơn đang hiển thị.`}>
                <Select value={filter} onChange={(event) => setFilter(event.target.value)} className="sm:max-w-xs" aria-label="Lọc đơn hàng theo trạng thái">
                    <option value="all">Tất cả trạng thái</option>
                    {Object.entries(ORDER_STATUS_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                </Select>
            </AdminPanel>
            <DataTable
                columns={columns}
                data={filtered}
                keyExtractor={(o) => o._id}
                isLoading={loading}
                error={loadError ? { description: loadError, action: <Button type="button" variant="outline" size="sm" onClick={load}>Thử lại</Button> } : null}
                emptyTitle="Không có đơn hàng phù hợp"
                emptyText="Thử chọn trạng thái khác hoặc chờ đơn hàng mới."
                tableLabel="Danh sách đơn hàng quản trị"
                actions={(o) => {
                    const nextStatus = NEXT_STATUS[o.status];
                    const actionLabel = NEXT_STATUS_ACTION[o.status];

                    return (
                        <DataTableActionGroup>
                            <Button type="button" variant="outline" size="sm" onClick={() => setSelectedOrder(o)}>Chi tiết</Button>
                            {o.cancelStatus === "pending" ? <>
                                <Button type="button" variant="destructive" size="sm" disabled={resolvingCancelId === o._id} onClick={() => setPendingAction({ order: o, type: "approve" })}>Chấp nhận hủy</Button>
                                <Button type="button" variant="outline" size="sm" disabled={resolvingCancelId === o._id} onClick={() => setPendingAction({ order: o, type: "reject" })}>Từ chối hủy</Button>
                            </> : nextStatus && actionLabel ? (
                                <Button type="button" size="sm" disabled={updatingId === o._id} onClick={() => setPendingAction({ order: o, type: "transition" })}>{actionLabel}</Button>
                            ) : null}
                        </DataTableActionGroup>
                    );
                }}
            />

            <Dialog open={Boolean(selectedOrder)} onOpenChange={(open) => { if (!open) setSelectedOrder(null); }} title={selectedOrder ? `Đơn #${selectedOrder._id.slice(-8).toUpperCase()}` : "Chi tiết đơn hàng"} description="Thông tin vận hành, thanh toán và lịch sử trạng thái của đơn hàng." size="lg">
                {selectedOrder && <div className="space-y-6">
                    <div className="flex flex-wrap gap-2"><OrderStatusBadge status={selectedOrder.status} /><PaymentStatusBadge isPaid={selectedOrder.isPaid} />{selectedOrder.cancelStatus === "pending" && <Badge tone="warning">Yêu cầu hủy đang chờ</Badge>}</div>
                    <dl className="grid gap-4 text-sm sm:grid-cols-2">
                        <div><dt className="text-muted-foreground">Khách hàng</dt><dd className="mt-1 font-medium text-text-strong">{selectedOrder.shippingAddress.fullName || "Chưa có tên"}</dd><dd>{selectedOrder.shippingAddress.phone}</dd></div>
                        <div><dt className="text-muted-foreground">Địa chỉ giao hàng</dt><dd className="mt-1 text-text-strong">{getShippingAddressText(selectedOrder) || "Chưa có địa chỉ"}</dd></div>
                        <div><dt className="text-muted-foreground">Phương thức thanh toán</dt><dd className="mt-1 uppercase text-text-strong">{selectedOrder.paymentMethod}</dd></div>
                        <div><dt className="text-muted-foreground">Tổng thanh toán</dt><dd className="mt-1 font-semibold text-primary">{formatCurrency(selectedOrder.totalPrice)}</dd></div>
                        {selectedOrder.loyaltyPointsAwarded && <div><dt className="text-muted-foreground">Điểm đã cộng</dt><dd className="mt-1 text-text-strong">{selectedOrder.loyaltyPoints ?? 0} điểm</dd></div>}
                        {selectedOrder.cancelStatus === "pending" && <div><dt className="text-muted-foreground">Lý do yêu cầu hủy</dt><dd className="mt-1 whitespace-pre-wrap text-text-strong">{selectedOrder.cancelReason || "Khách hàng không cung cấp lý do."}</dd></div>}
                    </dl>
                    <section><h3 className="text-sm font-semibold text-text-strong">Sản phẩm ({selectedOrder.orderItems.length})</h3><ul className="mt-3 divide-y divide-divider rounded-md border border-border">{selectedOrder.orderItems.map((item, index) => <li key={`${item.product}-${index}`} className="flex items-start justify-between gap-4 px-4 py-3 text-sm"><div className="min-w-0"><p className="font-medium text-text-strong">{item.name}</p><p className="text-muted-foreground">Số lượng {item.qty}</p></div><span className="shrink-0 font-medium">{formatCurrency(item.price * item.qty)}</span></li>)}</ul></section>
                    <section><h3 className="text-sm font-semibold text-text-strong">Lịch sử đơn hàng</h3><div className="mt-3"><OrderStatusTimeline order={selectedOrder} /></div></section>
                </div>}
            </Dialog>

            <Dialog
                open={Boolean(pendingAction)}
                onOpenChange={(open) => { if (!open && !actionBusy) setPendingAction(null); }}
                title={actionTitle}
                description={pendingAction ? `Đơn #${pendingAction.order._id.slice(-8).toUpperCase()}` : undefined}
                size="sm"
                closeOnBackdrop={!actionBusy}
                closeOnEscape={!actionBusy}
                footer={<DialogFooter><Button type="button" variant="outline" disabled={actionBusy} onClick={() => setPendingAction(null)}>Quay lại</Button><Button type="button" variant={pendingAction?.type === "approve" ? "destructive" : "default"} loading={actionBusy} onClick={() => void confirmPendingAction()}>{pendingAction?.type === "approve" ? "Chấp nhận hủy" : pendingAction?.type === "reject" ? "Từ chối hủy" : NEXT_STATUS_ACTION[pendingAction?.order.status ?? "Cancelled"] ?? "Xác nhận"}</Button></DialogFooter>}
            >
                {pendingAction && <div className="space-y-3 text-sm leading-6"><p>{pendingAction.type === "transition" ? `Trạng thái sẽ chuyển từ “${ORDER_STATUS_LABELS[pendingAction.order.status]}” sang “${ORDER_STATUS_LABELS[NEXT_STATUS[pendingAction.order.status] ?? pendingAction.order.status]}”.` : pendingAction.type === "approve" ? "Đơn hàng sẽ được chuyển sang trạng thái đã hủy theo quy trình hiện tại." : "Đơn hàng sẽ giữ nguyên trạng thái vận hành và yêu cầu hủy sẽ được đánh dấu từ chối."}</p>{pendingAction.order.cancelReason && pendingAction.type !== "transition" && <div className="rounded-md bg-surface-subtle p-3"><p className="text-xs font-medium text-muted-foreground">Lý do của khách hàng</p><p className="mt-1 whitespace-pre-wrap text-text-strong">{pendingAction.order.cancelReason}</p></div>}</div>}
            </Dialog>
        </div>
    );
};

export default OrderManagePage;
