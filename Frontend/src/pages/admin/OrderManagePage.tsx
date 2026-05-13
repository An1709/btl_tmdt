import { useEffect, useState } from "react";
import { orderService } from "@/services/orderService";
import type { Order, OrderStatus } from "@/types/order";
import DataTable, { type Column } from "@/components/features/admin/DataTable";
import { formatCurrency, formatDate } from "@/utils/format";
import { ORDER_STATUS_LABELS } from "@/utils/constants";
import { toast } from "sonner";

const STATUS_COLORS: Record<OrderStatus, string> = {
    Pending: "bg-amber-100 text-amber-700",
    Processing: "bg-blue-100 text-blue-700",
    Shipping: "bg-indigo-100 text-indigo-700",
    Delivered: "bg-emerald-100 text-emerald-700",
    Cancelled: "bg-red-100 text-red-600",
};

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

const OrderManagePage = () => {
    const [orders, setOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState("all");
    const [updatingId, setUpdatingId] = useState<string | null>(null);

    const load = () => {
        setLoading(true);
        orderService.getAllOrders()
            .then((res) => setOrders(res.orders))
            .catch(console.error)
            .finally(() => setLoading(false));
    };

    useEffect(load, []);

    const handleNextStatus = async (order: Order) => {
        const nextStatus = NEXT_STATUS[order.status];
        if (!nextStatus) return;

        try {
            setUpdatingId(order._id);
            const updatedOrder = await orderService.updateStatus(order._id, nextStatus);
            setOrders((prev) => prev.map((o) => o._id === order._id ? updatedOrder : o));
            toast.success("Cập nhật trạng thái thành công!");
        } catch (err: unknown) {
            const message =
                err && typeof err === "object" && "response" in err
                    ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
                    : undefined;
            toast.error(message ?? "Không thể cập nhật. Vui lòng thử lại.");
        } finally {
            setUpdatingId(null);
        }
    };

    const filtered = filter === "all" ? orders : orders.filter((o) => o.status === filter);

    const columns: Column<Order>[] = [
        { key: "id", header: "Mã đơn", render: (o) => <span className="font-mono text-xs font-semibold">#{o._id.slice(-8).toUpperCase()}</span> },
        { key: "customer", header: "Khách hàng", render: (o) => <span className="text-foreground">{o.shippingAddress.phone}</span> },
        { key: "date", header: "Ngày", render: (o) => formatDate(o.createdAt) },
        { key: "total", header: "Tổng tiền", render: (o) => <span className="font-bold text-[var(--pet-coral)]">{formatCurrency(o.totalPrice)}</span> },
        {
            key: "status", header: "Trạng thái", render: (o) => (
                <span className={`text-xs font-bold px-2 py-1 rounded-lg ${STATUS_COLORS[o.status]}`}>
                    {ORDER_STATUS_LABELS[o.status] ?? o.status}
                </span>
            )
        },
    ];

    return (
        <div className="flex flex-col gap-6">
            <div className="flex items-center justify-between flex-wrap gap-3">
                <h1 className="section-title">📦 Quản Lý Đơn Hàng</h1>
                <select value={filter} onChange={(e) => setFilter(e.target.value)}
                    className="px-3 py-2 rounded-xl border border-border bg-white dark:bg-card text-sm focus:outline-none focus:ring-2 focus:ring-[var(--pet-coral)]/40">
                    <option value="all">Tất cả trạng thái</option>
                    {Object.entries(ORDER_STATUS_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </select>
            </div>
            <DataTable
                columns={columns}
                data={filtered}
                keyExtractor={(o) => o._id}
                isLoading={loading}
                emptyText="Không có đơn hàng nào."
                actions={(o) => {
                    const nextStatus = NEXT_STATUS[o.status];
                    const actionLabel = NEXT_STATUS_ACTION[o.status];

                    if (!nextStatus || !actionLabel) {
                        return <span className="text-xs text-muted-foreground">Không còn bước tiếp theo</span>;
                    }

                    return (
                        <button
                            onClick={() => handleNextStatus(o)}
                            disabled={updatingId === o._id}
                            className="text-xs px-3 py-1.5 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-all font-semibold disabled:opacity-50"
                        >
                            {updatingId === o._id ? "Đang cập nhật..." : actionLabel}
                        </button>
                    );
                }}
            />
        </div>
    );
};

export default OrderManagePage;
