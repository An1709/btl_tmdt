import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router";
import { PackageOpen, ReceiptText } from "lucide-react";

import Sidebar from "@/components/common/Sidebar";
import { SkeletonBlock } from "@/components/common/Loading";
import { OrderStatusBadge, PaymentStatusBadge } from "@/components/features/order/OrderStatusBadge";
import { Button } from "@/components/ui/button";
import { EmptyState, ErrorState } from "@/components/ui/feedback-state";
import { orderService } from "@/services/orderService";
import type { Order } from "@/types/order";
import { formatCurrency, formatDate } from "@/utils/format";

const getOrderReference = (order: Order) => order._id.slice(-8).toUpperCase();

const getPaymentMethodLabel = (method: Order["paymentMethod"]) => (
    method === "cod" ? "Thanh toán khi nhận hàng" : "VNPay"
);

const getItemSummary = (order: Order) => {
    const items = order.orderItems ?? [];
    if (!items.length) return "Chưa có thông tin sản phẩm";

    const firstItemName = items[0]?.name || "Sản phẩm";
    return items.length === 1 ? firstItemName : `${firstItemName} và ${items.length - 1} sản phẩm khác`;
};

const OrderHistorySkeleton = () => (
    <div className="space-y-3" aria-label="Đang tải đơn hàng">
        {[0, 1, 2].map((index) => (
            <div key={index} className="border border-border bg-surface p-5">
                <div className="flex items-start justify-between gap-4">
                    <div className="space-y-2">
                        <SkeletonBlock className="h-4 w-28" />
                        <SkeletonBlock className="h-3 w-40" />
                    </div>
                    <SkeletonBlock className="h-6 w-28 rounded-full" />
                </div>
                <div className="mt-5 grid gap-3 sm:grid-cols-3">
                    <SkeletonBlock className="h-4 w-full" />
                    <SkeletonBlock className="h-4 w-3/4" />
                    <SkeletonBlock className="h-4 w-2/3 sm:justify-self-end" />
                </div>
            </div>
        ))}
    </div>
);

const OrderHistoryPage = () => {
    const [orders, setOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    const loadOrders = useCallback(async () => {
        setLoading(true);
        setError("");

        try {
            setOrders(await orderService.getMyOrders());
        } catch {
            setError("Không thể tải lịch sử đơn hàng. Vui lòng thử lại.");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        void loadOrders();
    }, [loadOrders]);

    return (
        <div className="mx-auto flex max-w-7xl flex-col gap-6 px-page py-8 lg:flex-row lg:gap-8">
            <Sidebar mode="user" />
            <section className="min-w-0 flex-1">
                <header className="mb-6 flex flex-wrap items-end justify-between gap-3">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight text-text-strong">Đơn hàng của tôi</h1>
                        <p className="mt-1 text-sm text-muted-foreground">Theo dõi trạng thái, thanh toán và thông tin giao hàng của từng đơn.</p>
                    </div>
                    {!loading && !error && orders.length > 0 && (
                        <p className="text-sm text-muted-foreground">{orders.length} đơn hàng</p>
                    )}
                </header>

                {loading ? <OrderHistorySkeleton /> : error ? (
                    <ErrorState
                        title="Không thể tải đơn hàng"
                        description={error}
                        action={<Button type="button" onClick={() => void loadOrders()}>Thử lại</Button>}
                    />
                ) : orders.length === 0 ? (
                    <EmptyState
                        icon={<PackageOpen className="size-7" />}
                        title="Bạn chưa có đơn hàng nào"
                        description="Khi hoàn tất mua sắm, đơn hàng sẽ xuất hiện tại đây để bạn dễ theo dõi."
                        action={<Button asChild><Link to="/shop">Khám phá sản phẩm</Link></Button>}
                    />
                ) : (
                    <section aria-label="Danh sách đơn hàng" className="space-y-3">
                        {orders.map((order) => (
                            <article key={order._id} className="border border-border bg-surface p-4 sm:p-5">
                                <div className="flex flex-wrap items-start justify-between gap-3">
                                    <div className="min-w-0">
                                        <p className="text-xs font-medium text-muted-foreground">Mã đơn hàng</p>
                                        <h2 className="mt-1 font-mono text-sm font-semibold text-text-strong">#{getOrderReference(order)}</h2>
                                        <p className="mt-1 text-xs text-muted-foreground">Đặt ngày {formatDate(order.createdAt)}</p>
                                    </div>
                                    <OrderStatusBadge status={order.status} />
                                </div>

                                <div className="mt-5 grid gap-4 border-y border-divider py-4 text-sm sm:grid-cols-[minmax(0,1.45fr)_minmax(0,1fr)_auto] sm:items-center">
                                    <div className="min-w-0">
                                        <p className="font-medium text-text-strong">{getItemSummary(order)}</p>
                                        <p className="mt-1 text-xs text-muted-foreground">{order.orderItems?.length ?? 0} sản phẩm</p>
                                    </div>
                                    <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                                        <span>{getPaymentMethodLabel(order.paymentMethod)}</span>
                                        <PaymentStatusBadge isPaid={order.isPaid} />
                                    </div>
                                    <p className="font-semibold text-text-strong sm:text-right">{formatCurrency(order.totalPrice)}</p>
                                </div>

                                <div className="mt-4 flex justify-end">
                                    <Button asChild variant="ghost" size="sm">
                                        <Link to={`/orders/${order._id}`} aria-label={`Xem chi tiết đơn hàng ${getOrderReference(order)}`}>
                                            <ReceiptText aria-hidden="true" className="size-4" />
                                            Xem chi tiết
                                        </Link>
                                    </Button>
                                </div>
                            </article>
                        ))}
                    </section>
                )}
            </section>
        </div>
    );
};

export default OrderHistoryPage;
