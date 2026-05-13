import { useEffect, useState } from "react";
import { useParams, Link } from "react-router";
import Sidebar from "@/components/common/Sidebar";
import { orderService } from "@/services/orderService";
import type { Order } from "@/types/order";
import { formatCurrency, formatDate } from "@/utils/format";
import Loading from "@/components/common/Loading";

// Backend status values are PascalCase: Pending → Processing → Shipping → Delivered
const STATUS_STEPS = ["Pending", "Processing", "Shipping", "Delivered"] as const;

const STATUS_LABELS: Record<string, string> = {
    Pending:    "Chờ xác nhận",
    Processing: "Đang xử lý",
    Shipping:   "Đang giao",
    Delivered:  "Đã giao",
    Cancelled:  "Đã hủy",
};

const OrderDetailPage = () => {
    const { id } = useParams<{ id: string }>();
    const [order, setOrder] = useState<Order | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!id) return;
        setLoading(true);
        orderService
            .getOrderById(id)
            .then((data) => {
                setOrder(data);
                setError(null);
            })
            .catch(() => setError("Không thể tải đơn hàng. Vui lòng thử lại."))
            .finally(() => setLoading(false));
    }, [id]);

    // ── Loading state ──
    if (loading) {
        return (
            <div className="max-w-7xl mx-auto px-4 pt-12 flex gap-8">
                <Sidebar mode="user" />
                <main className="flex-1"><Loading /></main>
            </div>
        );
    }

    // ── Error state ──
    if (error || !order) {
        return (
            <div className="max-w-7xl mx-auto px-4 py-24 text-center">
                <p className="text-5xl mb-4">🔍</p>
                <h1 className="text-xl font-bold text-foreground mb-2">Không tìm thấy đơn hàng</h1>
                <p className="text-muted-foreground mb-6">{error || "Đơn hàng không tồn tại hoặc bạn không có quyền xem."}</p>
                <Link to="/orders" className="btn-pet-primary">← Quay lại danh sách</Link>
            </div>
        );
    }

    const stepIdx = STATUS_STEPS.indexOf(order.status as typeof STATUS_STEPS[number]);

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex gap-8">
            <Sidebar mode="user" />
            <main className="flex-1">
                {/* Breadcrumb */}
                <div className="flex items-center gap-3 mb-6">
                    <Link to="/orders" className="text-muted-foreground hover:text-[var(--pet-coral)] transition-colors text-sm">
                        ← Đơn hàng
                    </Link>
                    <span className="text-muted-foreground">/</span>
                    <h1 className="text-lg font-black text-foreground" style={{ fontFamily: "'Nunito', sans-serif" }}>
                        #{order._id.slice(-8).toUpperCase()}
                    </h1>
                </div>

                {/* Status tracker — only for non-cancelled orders */}
                {order.status !== "Cancelled" && (
                    <div className="bg-white dark:bg-card rounded-2xl border border-border p-5 mb-5">
                        <div className="flex items-center justify-between">
                            {STATUS_STEPS.map((step, i) => (
                                <div key={step} className="flex items-center flex-1">
                                    <div className="flex flex-col items-center gap-1">
                                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                                            i <= stepIdx
                                                ? "bg-[var(--pet-coral)] text-white"
                                                : "bg-muted text-muted-foreground"
                                        }`}>
                                            {i < stepIdx ? "✓" : i + 1}
                                        </div>
                                        <span className="text-xs text-muted-foreground text-center">
                                            {STATUS_LABELS[step]}
                                        </span>
                                    </div>
                                    {i < STATUS_STEPS.length - 1 && (
                                        <div className={`flex-1 h-1 mx-2 rounded-full ${i < stepIdx ? "bg-[var(--pet-coral)]" : "bg-muted"}`} />
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                    {/* ── Order Items ── */}
                    <div className="lg:col-span-2 bg-white dark:bg-card rounded-2xl border border-border p-5">
                        <h2 className="font-bold mb-4" style={{ fontFamily: "'Nunito', sans-serif" }}>📦 Sản phẩm</h2>
                        <div className="flex flex-col gap-3">
                            {/* Defensive: optional chain + fallback to empty array */}
                            {(order.orderItems ?? []).map((item, index) => (
                                <div key={item.product ?? index} className="flex items-center gap-3">
                                    {item.image && (
                                        <img
                                            src={item.image}
                                            alt={item.name}
                                            className="w-14 h-14 rounded-xl object-cover border border-border"
                                        />
                                    )}
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-semibold text-foreground line-clamp-1">
                                            {item.name ?? "Sản phẩm"}
                                        </p>
                                        <p className="text-xs text-muted-foreground">× {item.qty}</p>
                                    </div>
                                    <p className="font-bold text-[var(--pet-coral)] text-sm shrink-0">
                                        {formatCurrency((item.price ?? 0) * (item.qty ?? 1))}
                                    </p>
                                </div>
                            ))}
                        </div>

                        {/* Totals */}
                        <div className="border-t border-border mt-4 pt-4 flex flex-col gap-1 text-sm">
                            <div className="flex justify-between text-muted-foreground">
                                <span>Phí ship</span>
                                <span>{formatCurrency(order.shippingPrice ?? 0)}</span>
                            </div>
                            {(order.discountAmount ?? 0) > 0 && (
                                <div className="flex justify-between text-emerald-600">
                                    <span>Giảm giá</span>
                                    <span>−{formatCurrency(order.discountAmount)}</span>
                                </div>
                            )}
                            <div className="flex justify-between font-bold text-base border-t border-border pt-2">
                                <span>Tổng cộng</span>
                                <span className="text-[var(--pet-coral)]">{formatCurrency(order.totalPrice ?? 0)}</span>
                            </div>
                        </div>
                    </div>

                    {/* ── Meta panel ── */}
                    <div className="flex flex-col gap-4">
                        {/* Shipping address */}
                        <div className="bg-white dark:bg-card rounded-2xl border border-border p-5">
                            <h2 className="font-bold mb-3" style={{ fontFamily: "'Nunito', sans-serif" }}>Địa chỉ giao hàng</h2>
                            {order.shippingAddress?.fullName && (
                                <p className="text-sm text-foreground font-semibold">{order.shippingAddress.fullName}</p>
                            )}
                            <p className="text-sm text-muted-foreground">{order.shippingAddress?.phone}</p>
                            <p className="text-sm text-muted-foreground">
                                {[
                                    order.shippingAddress?.address,
                                    order.shippingAddress?.district,
                                    order.shippingAddress?.city,
                                ].filter(Boolean).join(", ")}
                            </p>
                        </div>

                        {/* Payment info */}
                        <div className="bg-white dark:bg-card rounded-2xl border border-border p-5">
                            <h2 className="font-bold mb-3" style={{ fontFamily: "'Nunito', sans-serif" }}>Thanh toán</h2>
                            <p className="text-sm text-muted-foreground">
                                Phương thức:{" "}
                                <span className="text-foreground font-semibold">
                                    {order.paymentMethod?.toUpperCase()}
                                </span>
                            </p>
                            <p className="text-sm text-muted-foreground">
                                Trạng thái:{" "}
                                <span className={`font-semibold ${order.isPaid ? "text-emerald-600" : "text-amber-500"}`}>
                                    {order.isPaid ? "Đã thanh toán" : "Chưa thanh toán"}
                                </span>
                            </p>
                            {order.paidAt && (
                                <p className="text-sm text-muted-foreground">
                                    Ngày thanh toán:{" "}
                                    <span className="text-foreground font-semibold">{formatDate(order.paidAt)}</span>
                                </p>
                            )}
                            <p className="text-sm text-muted-foreground">
                                Ngày đặt:{" "}
                                <span className="text-foreground font-semibold">{formatDate(order.createdAt)}</span>
                            </p>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default OrderDetailPage;