import { useEffect, useState } from "react";
import { orderService } from "@/services/orderService";
import type { Order, OrderStatus } from "@/types/order";
import DataTable, { type Column } from "@/components/features/admin/DataTable";
import { formatCurrency, formatDate } from "@/utils/format";
import { ORDER_STATUS_LABELS } from "@/utils/constants";
import { toast } from "sonner";

const STATUS_COLORS: Record<string, string> = {
    pending: "bg-amber-100 text-amber-700",
    confirmed: "bg-blue-100 text-blue-700",
    shipping: "bg-indigo-100 text-indigo-700",
    delivered: "bg-emerald-100 text-emerald-700",
    cancelled: "bg-red-100 text-red-600",
};

const OrderManagePage = () => {
    const [orders, setOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState("all");

    const load = () => {
        orderService.getAllOrders()
            .then((res) => setOrders(res.orders))
            .catch(console.error)
            .finally(() => setLoading(false));
    };

    useEffect(load, []);

    const handleStatus = async (id: string, status: OrderStatus) => {
        try {
            await orderService.updateStatus(id, status);
            setOrders((prev) => prev.map((o) => o._id === id ? { ...o, status } : o));
            toast.success("Cập nhật trạng thái thành công!");
        } catch {
            toast.error("Không thể cập nhật. Vui lòng thử lại.");
        }
    };

    const filtered = filter === "all" ? orders : orders.filter((o) => o.status === filter);

    const columns: Column<Order>[] = [
        { key: "id", header: "Mã đơn", render: (o) => <span className="font-mono text-xs font-semibold">#{o._id.slice(-8).toUpperCase()}</span> },
        { key: "customer", header: "Khách hàng", render: (o) => <span className="text-foreground">{o.shippingAddress.fullName}</span> },
        { key: "date", header: "Ngày", render: (o) => formatDate(o.createdAt) },
        { key: "total", header: "Tổng tiền", render: (o) => <span className="font-bold text-[var(--pet-coral)]">{formatCurrency(o.total)}</span> },
        {
            key: "status", header: "Trạng thái", render: (o) => (
                <select
                    value={o.status}
                    onChange={(e) => handleStatus(o._id, e.target.value as OrderStatus)}
                    className={`text-xs font-bold px-2 py-1 rounded-lg border-0 cursor-pointer ${STATUS_COLORS[o.status]}`}
                >
                    {Object.entries(ORDER_STATUS_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </select>
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
            <DataTable columns={columns} data={filtered} keyExtractor={(o) => o._id} isLoading={loading} emptyText="Không có đơn hàng nào." />
        </div>
    );
};

export default OrderManagePage;