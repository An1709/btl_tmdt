import { useEffect, useState } from "react";
import { useParams, Link } from "react-router";
import Sidebar from "@/components/common/Sidebar";
import { orderService } from "@/services/orderService";
import type { Order } from "@/types/order";
import { formatCurrency, formatDate } from "@/utils/format";
import { ORDER_STATUS_LABELS, PAYMENT_STATUS_LABELS } from "@/utils/constants";
import Loading from "@/components/common/Loading";

const STATUS_STEPS = ["pending", "confirmed", "shipping", "delivered"];

const OrderDetailPage = () => {
    const { id } = useParams<{ id: string }>();
    const [order, setOrder] = useState<Order | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (id) orderService.getOrderById(id).then(setOrder).catch(console.error).finally(() => setLoading(false));
    }, [id]);

    if (loading) return <div className="max-w-7xl mx-auto px-4 pt-12 flex gap-8"><Sidebar mode="user" /><main className="flex-1"><Loading /></main></div>;
    if (!order) return <div className="max-w-7xl mx-auto px-4 py-24 text-center"><p className="text-muted-foreground">Không tìm thấy đơn hàng.</p></div>;

    const stepIdx = STATUS_STEPS.indexOf(order.status);

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex gap-8">
            <Sidebar mode="user" />
            <main className="flex-1">
                <div className="flex items-center gap-3 mb-6">
                    <Link to="/orders" className="text-muted-foreground hover:text-[var(--pet-coral)] transition-colors text-sm">← Đơn hàng</Link>
                    <span className="text-muted-foreground">/</span>
                    <h1 className="text-lg font-black text-foreground" style={{ fontFamily: "'Nunito', sans-serif" }}>
                        #{order._id.slice(-8).toUpperCase()}
                    </h1>
                </div>

                {/* Status tracker */}
                {order.status !== "cancelled" && (
                    <div className="bg-white dark:bg-card rounded-2xl border border-border p-5 mb-5">
                        <div className="flex items-center justify-between">
                            {STATUS_STEPS.map((step, i) => (
                                <div key={step} className="flex items-center flex-1">
                                    <div className="flex flex-col items-center gap-1">
                                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${i <= stepIdx ? "bg-[var(--pet-coral)] text-white" : "bg-muted text-muted-foreground"}`}>
                                            {i < stepIdx ? "✓" : i + 1}
                                        </div>
                                        <span className="text-xs text-muted-foreground text-center">{ORDER_STATUS_LABELS[step]}</span>
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
                    {/* Items */}
                    <div className="lg:col-span-2 bg-white dark:bg-card rounded-2xl border border-border p-5">
                        <h2 className="font-bold mb-4" style={{ fontFamily: "'Nunito', sans-serif" }}>📦 Sản phẩm</h2>
                        <div className="flex flex-col gap-3">
                            {order.items.map((item) => (
                                <div key={item.productId} className="flex items-center gap-3">
                                    <img src={item.productImage} alt={item.productName} className="w-14 h-14 rounded-xl object-cover border border-border" />
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-semibold text-foreground line-clamp-1">{item.productName}</p>
                                        <p className="text-xs text-muted-foreground">× {item.quantity}</p>
                                    </div>
                                    <p className="font-bold text-[var(--pet-coral)] text-sm shrink-0">{formatCurrency(item.price * item.quantity)}</p>
                                </div>
                            ))}
                        </div>
                        <div className="border-t border-border mt-4 pt-4 flex flex-col gap-1 text-sm">
                            <div className="flex justify-between text-muted-foreground"><span>Phí ship</span><span>{formatCurrency(order.shippingFee)}</span></div>
                            {order.discount > 0 && <div className="flex justify-between text-emerald-600"><span>Giảm giá</span><span>−{formatCurrency(order.discount)}</span></div>}
                            <div className="flex justify-between font-bold text-base border-t border-border pt-2">
                                <span>Tổng cộng</span><span className="text-[var(--pet-coral)]">{formatCurrency(order.total)}</span>
                            </div>
                        </div>
                    </div>

                    {/* Meta */}
                    <div className="flex flex-col gap-4">
                        <div className="bg-white dark:bg-card rounded-2xl border border-border p-5">
                            <h2 className="font-bold mb-3" style={{ fontFamily: "'Nunito', sans-serif" }}>Địa chỉ giao hàng</h2>
                            <p className="text-sm text-foreground font-semibold">{order.shippingAddress.fullName}</p>
                            <p className="text-sm text-muted-foreground">{order.shippingAddress.phone}</p>
                            <p className="text-sm text-muted-foreground">{order.shippingAddress.address}, {order.shippingAddress.district}, {order.shippingAddress.city}</p>
                        </div>
                        <div className="bg-white dark:bg-card rounded-2xl border border-border p-5">
                            <h2 className="font-bold mb-3" style={{ fontFamily: "'Nunito', sans-serif" }}>Thanh toán</h2>
                            <p className="text-sm text-muted-foreground">Phương thức: <span className="text-foreground font-semibold">{order.paymentMethod.toUpperCase()}</span></p>
                            <p className="text-sm text-muted-foreground">Trạng thái: <span className="text-foreground font-semibold">{PAYMENT_STATUS_LABELS[order.paymentStatus]}</span></p>
                            <p className="text-sm text-muted-foreground">Ngày: <span className="text-foreground font-semibold">{formatDate(order.createdAt)}</span></p>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default OrderDetailPage;