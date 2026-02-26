import { useEffect, useState } from "react";
import { Link } from "react-router";
import Sidebar from "@/components/common/Sidebar";
import { orderService } from "@/services/orderService";
import type { Order } from "@/types/order";
import { formatCurrency, formatDate } from "@/utils/format";
import { ORDER_STATUS_LABELS } from "@/utils/constants";
import Loading from "@/components/common/Loading";

const STATUS_COLORS: Record<string, string> = {
    pending: "bg-amber-100 text-amber-700",
    confirmed: "bg-blue-100 text-blue-700",
    shipping: "bg-indigo-100 text-indigo-700",
    delivered: "bg-emerald-100 text-emerald-700",
    cancelled: "bg-red-100 text-red-600",
};

const OrderHistoryPage = () => {
    const [orders, setOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        orderService.getMyOrders().then(setOrders).catch(console.error).finally(() => setLoading(false));
    }, []);

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex gap-8">
            <Sidebar mode="user" />
            <main className="flex-1">
                <h1 className="section-title mb-6">📦 Đơn Hàng Của Tôi</h1>
                {loading ? <Loading /> : orders.length === 0 ? (
                    <div className="text-center py-16">
                        <div className="text-5xl mb-3">📦</div>
                        <p className="text-muted-foreground">Bạn chưa có đơn hàng nào.</p>
                        <Link to="/shop" className="btn-pet-primary mt-4 inline-flex">Mua sắm ngay</Link>
                    </div>
                ) : (
                    <div className="flex flex-col gap-4">
                        {orders.map((order) => (
                            <div key={order._id} className="bg-white dark:bg-card rounded-2xl border border-border p-5">
                                <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
                                    <div>
                                        <p className="text-xs text-muted-foreground">Mã đơn: <span className="font-mono text-foreground">{order._id.slice(-8).toUpperCase()}</span></p>
                                        <p className="text-xs text-muted-foreground">{formatDate(order.createdAt)}</p>
                                    </div>
                                    <span className={`text-xs font-bold px-3 py-1 rounded-full ${STATUS_COLORS[order.status]}`}>
                                        {ORDER_STATUS_LABELS[order.status]}
                                    </span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <p className="text-sm text-muted-foreground">{order.items.length} sản phẩm</p>
                                    <div className="flex items-center gap-4">
                                        <p className="font-bold text-[var(--pet-coral)]">{formatCurrency(order.total)}</p>
                                        <Link to={`/orders/${order._id}`} className="text-sm text-[var(--pet-coral)] hover:underline font-semibold">Xem chi tiết →</Link>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </main>
        </div>
    );
};

export default OrderHistoryPage;