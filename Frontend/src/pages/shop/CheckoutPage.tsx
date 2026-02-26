import { useState } from "react";
import { useNavigate } from "react-router";
import { useCartStore } from "@/stores/useCartStore";
import { orderService } from "@/services/orderService";
import { couponService } from "@/services/couponService";
import { paymentService } from "@/services/paymentService";
import { formatCurrency } from "@/utils/format";
import { toast } from "sonner";
import type { ShippingAddress, PaymentMethod } from "@/types/order";

const CheckoutPage = () => {
    const navigate = useNavigate();
    const { items, totalPrice, clearCart } = useCartStore();
    const [loading, setLoading] = useState(false);
    const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("cod");
    const [couponCode, setCouponCode] = useState("");
    const [discount, setDiscount] = useState(0);
    const [checkingCoupon, setCheckingCoupon] = useState(false);
    const [address, setAddress] = useState<ShippingAddress>({
        fullName: "", phone: "", address: "", city: "", district: "",
    });

    const subtotal = totalPrice();
    const shippingFee = subtotal >= 500000 ? 0 : 30000;
    const total = subtotal + shippingFee - discount;

    const handleApplyCoupon = async () => {
        if (!couponCode.trim()) return;
        setCheckingCoupon(true);
        try {
            const result = await couponService.checkCoupon(couponCode.trim(), subtotal);
            setDiscount(result.discountAmount);
            toast.success(`🎉 Áp dụng mã thành công! Giảm ${formatCurrency(result.discountAmount)}`);
        } catch {
            toast.error("Mã giảm giá không hợp lệ hoặc đã hết hạn.");
            setDiscount(0);
        } finally {
            setCheckingCoupon(false);
        }
    };

    const handleOrder = async () => {
        if (!address.fullName || !address.phone || !address.address || !address.city) {
            toast.error("Vui lòng điền đầy đủ thông tin giao hàng.");
            return;
        }
        setLoading(true);
        try {
            const order = await orderService.createOrder({
                items: items.map((i) => ({ productId: i.product.id, quantity: i.quantity })),
                shippingAddress: address,
                paymentMethod,
                couponCode: couponCode || undefined,
            });

            if (paymentMethod === "vnpay") {
                const payUrl = await paymentService.createVNPayUrl({
                    orderId: order._id,
                    amount: order.total,
                });
                clearCart();
                window.location.href = payUrl;
            } else {
                clearCart();
                toast.success("Đặt hàng thành công! 🎉");
                navigate(`/orders/${order._id}`);
            }
        } catch {
            toast.error("Không thể đặt hàng. Vui lòng thử lại.");
        } finally {
            setLoading(false);
        }
    };

    const inputCls = "w-full px-4 py-3 rounded-xl border border-border bg-muted/30 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--pet-coral)]/40 focus:border-[var(--pet-coral)] transition-all placeholder:text-muted-foreground";

    return (
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
            <h1 className="section-title mb-6">💳 Thanh Toán</h1>

            <div className="flex flex-col lg:flex-row gap-8">
                {/* Left: form */}
                <div className="flex-1 flex flex-col gap-6">
                    {/* Shipping address */}
                    <div className="bg-white dark:bg-card rounded-2xl border border-border p-5">
                        <h2 className="font-bold mb-4" style={{ fontFamily: "'Nunito', sans-serif" }}>📦 Địa chỉ giao hàng</h2>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <input className={inputCls} placeholder="Họ và tên" value={address.fullName} onChange={(e) => setAddress((a) => ({ ...a, fullName: e.target.value }))} />
                            <input className={inputCls} placeholder="Số điện thoại" value={address.phone} onChange={(e) => setAddress((a) => ({ ...a, phone: e.target.value }))} />
                            <input className={`${inputCls} sm:col-span-2`} placeholder="Địa chỉ cụ thể" value={address.address} onChange={(e) => setAddress((a) => ({ ...a, address: e.target.value }))} />
                            <input className={inputCls} placeholder="Quận/Huyện" value={address.district} onChange={(e) => setAddress((a) => ({ ...a, district: e.target.value }))} />
                            <input className={inputCls} placeholder="Thành phố/Tỉnh" value={address.city} onChange={(e) => setAddress((a) => ({ ...a, city: e.target.value }))} />
                        </div>
                    </div>

                    {/* Payment method */}
                    <div className="bg-white dark:bg-card rounded-2xl border border-border p-5">
                        <h2 className="font-bold mb-4" style={{ fontFamily: "'Nunito', sans-serif" }}>💰 Phương thức thanh toán</h2>
                        <div className="flex flex-col gap-3">
                            {([["vnpay", "💳 VNPAY", "Thanh toán qua cổng VNPAY"], ["cod", "💵 COD", "Thanh toán khi nhận hàng"]] as const).map(([value, label, desc]) => (
                                <label key={value} className={`flex items-center gap-3 p-4 rounded-2xl border-2 cursor-pointer transition-all ${paymentMethod === value ? "border-[var(--pet-coral)] bg-red-50 dark:bg-red-950/20" : "border-border hover:border-muted-foreground/40"}`}>
                                    <input type="radio" name="payment" value={value} checked={paymentMethod === value} onChange={() => setPaymentMethod(value)} className="accent-[var(--pet-coral)]" />
                                    <div>
                                        <p className="font-bold text-sm text-foreground">{label}</p>
                                        <p className="text-xs text-muted-foreground">{desc}</p>
                                    </div>
                                </label>
                            ))}
                        </div>
                    </div>

                    {/* Coupon */}
                    <div className="bg-white dark:bg-card rounded-2xl border border-border p-5">
                        <h2 className="font-bold mb-4" style={{ fontFamily: "'Nunito', sans-serif" }}>🎟️ Mã giảm giá</h2>
                        <div className="flex gap-2">
                            <input className={`${inputCls} flex-1`} placeholder="Nhập mã giảm giá" value={couponCode} onChange={(e) => setCouponCode(e.target.value.toUpperCase())} />
                            <button onClick={handleApplyCoupon} disabled={checkingCoupon} className="btn-pet-secondary shrink-0 disabled:opacity-50">
                                {checkingCoupon ? "..." : "Áp dụng"}
                            </button>
                        </div>
                        {discount > 0 && <p className="text-emerald-600 text-sm mt-2">✓ Giảm {formatCurrency(discount)}</p>}
                    </div>
                </div>

                {/* Right: summary */}
                <div className="w-full lg:w-80 shrink-0">
                    <div className="bg-white dark:bg-card rounded-2xl border border-border p-5 sticky top-24">
                        <h2 className="font-bold mb-4" style={{ fontFamily: "'Nunito', sans-serif" }}>Tóm tắt đơn hàng</h2>
                        <div className="flex flex-col gap-2 text-sm mb-4">
                            {items.map((i) => (
                                <div key={i.product.id} className="flex justify-between text-muted-foreground">
                                    <span className="truncate">{i.product.name} × {i.quantity}</span>
                                    <span className="font-semibold text-foreground shrink-0 ml-2">{formatCurrency(i.product.price * i.quantity)}</span>
                                </div>
                            ))}
                            <div className="border-t border-border mt-2 pt-2 flex flex-col gap-2">
                                <div className="flex justify-between text-muted-foreground"><span>Phí ship</span><span>{shippingFee === 0 ? "Miễn phí" : formatCurrency(shippingFee)}</span></div>
                                {discount > 0 && <div className="flex justify-between text-emerald-600"><span>Giảm giá</span><span>−{formatCurrency(discount)}</span></div>}
                                <div className="flex justify-between font-bold text-base border-t border-border pt-2">
                                    <span>Tổng cộng</span>
                                    <span className="text-[var(--pet-coral)]">{formatCurrency(total)}</span>
                                </div>
                            </div>
                        </div>
                        <button onClick={handleOrder} disabled={loading || items.length === 0} className="btn-pet-primary w-full justify-center disabled:opacity-50">
                            {loading ? "Đang xử lý..." : paymentMethod === "vnpay" ? "Thanh toán VNPAY →" : "Đặt hàng ngay 🐾"}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CheckoutPage;