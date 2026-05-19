import { useState } from "react";
import { useNavigate } from "react-router";
import { useCartStore } from "@/stores/useCartStore";
import { orderService } from "@/services/orderService";
import { couponService } from "@/services/couponService";
import { formatCurrency } from "@/utils/format";
import { isValidVietnamMobilePhone, normalizeVietnamPhone } from "@/utils/vietnamPhone";
import { toast } from "sonner";
import type { PaymentMethod } from "@/types/order";
import VietnamAddressSelector, { type AddressSelection } from "@/components/checkout/VietnamAddressSelector";

interface CheckoutAddress extends AddressSelection {
    fullName: string;
    phone: string;
    streetAddress: string;
}

type AddressErrors = Partial<Record<keyof CheckoutAddress, string>>;

const CheckoutPage = () => {
    const navigate = useNavigate();
    const { items, totalPrice, clearCart } = useCartStore();
    const [loading, setLoading] = useState(false);
    const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("cod");
    const [couponCode, setCouponCode] = useState("");
    const [discount, setDiscount] = useState(0);
    const [couponId, setCouponId] = useState<string | undefined>(undefined);
    const [checkingCoupon, setCheckingCoupon] = useState(false);
    const [address, setAddress] = useState<CheckoutAddress>({
        fullName: "",
        phone: "",
        streetAddress: "",
        province: "",
        district: "",
        ward: "",
    });
    const [addressErrors, setAddressErrors] = useState<AddressErrors>({});

    const subtotal = totalPrice();
    const shippingFee = subtotal >= 500000 ? 0 : 30000;
    const total = subtotal + shippingFee - discount;

    const handleApplyCoupon = async () => {
        if (!couponCode.trim()) return;
        setCheckingCoupon(true);
        try {
            const result = await couponService.checkCoupon(couponCode.trim(), subtotal);
            setDiscount(result.discountAmount);
            setCouponId(result.couponId);
            toast.success(`🎉 Áp dụng mã thành công! Giảm ${formatCurrency(result.discountAmount)}`);
        } catch {
            toast.error("Mã giảm giá không hợp lệ hoặc đã hết hạn.");
            setDiscount(0);
            setCouponId(undefined);
        } finally {
            setCheckingCoupon(false);
        }
    };

    const updateAddress = <K extends keyof CheckoutAddress>(key: K, value: CheckoutAddress[K]) => {
        setAddress((current) => ({ ...current, [key]: value }));
        setAddressErrors((current) => ({ ...current, [key]: undefined }));
    };

    const validateAddress = () => {
        const errors: AddressErrors = {};
        const normalizedPhone = normalizeVietnamPhone(address.phone);

        if (!address.fullName.trim()) errors.fullName = "Vui lòng nhập họ và tên.";
        if (!address.phone.trim()) {
            errors.phone = "Vui lòng nhập số điện thoại.";
        } else if (!/^\d+$/.test(normalizedPhone)) {
            errors.phone = "Số điện thoại không hợp lệ.";
        } else if (!isValidVietnamMobilePhone(address.phone)) {
            errors.phone = "Số điện thoại phải là số di động Việt Nam hợp lệ.";
        }
        if (!address.province) errors.province = "Vui lòng chọn Tỉnh/Thành phố.";
        if (!address.district) errors.district = "Vui lòng chọn Quận/Huyện.";
        if (!address.ward) errors.ward = "Vui lòng chọn Phường/Xã.";
        if (!address.streetAddress.trim()) errors.streetAddress = "Vui lòng nhập địa chỉ cụ thể.";

        setAddressErrors(errors);
        return { isValid: Object.keys(errors).length === 0, normalizedPhone };
    };

    const handleOrder = async () => {
        const { isValid, normalizedPhone } = validateAddress();
        if (!isValid) {
            toast.error("Vui lòng kiểm tra lại thông tin giao hàng.");
            return;
        }
        if (items.length === 0) {
            toast.error("Giỏ hàng trống.");
            return;
        }
        setLoading(true);
        try {
            const streetAddress = address.streetAddress.trim();
            const fullAddress = [streetAddress, address.ward, address.district, address.province].join(", ");

            const order = await orderService.createOrder({
                orderItems: items.map((i) => ({
                    product: i.product.id,
                    name: i.product.name,
                    qty: i.quantity,
                    price: i.product.price,
                    image: i.product.image,
                })),
                shippingAddress: {
                    fullName: address.fullName.trim(),
                    phone: normalizedPhone,
                    province: address.province,
                    district: address.district,
                    ward: address.ward,
                    streetAddress,
                    fullAddress,
                    address: streetAddress,
                    city: address.province,
                },
                paymentMethod,
                itemsPrice: subtotal,
                shippingPrice: shippingFee,
                totalPrice: total,
                discountAmount: discount,
                ...(couponId && { coupon: couponId }),
            });

            // Backend returns paymentUrl in the response for VNPay orders
            if (paymentMethod === "vnpay" && order.paymentUrl) {
                await clearCart();
                window.location.href = order.paymentUrl;
            } else {
                await clearCart();
                toast.success("Đặt hàng thành công! 🎉");
                navigate(`/orders/${order._id}`);
            }
        } catch (err: unknown) {
            const message =
                err && typeof err === "object" && "response" in err
                    ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
                    : undefined;
            toast.error(message ?? "Không thể đặt hàng. Vui lòng thử lại.");
        } finally {
            setLoading(false);
        }
    };

    const inputCls = "w-full px-4 py-3 rounded-xl border bg-muted/30 text-sm focus:outline-none focus:ring-2 transition-all placeholder:text-muted-foreground";
    const getInputCls = (field: keyof CheckoutAddress) =>
        `${inputCls} ${addressErrors[field] ? "border-red-400 focus:ring-red-400/30" : "border-border focus:ring-[var(--pet-coral)]/40 focus:border-[var(--pet-coral)]"}`;

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
                            <label className="flex flex-col gap-1">
                                <input
                                    className={getInputCls("fullName")}
                                    placeholder="Họ và tên"
                                    value={address.fullName}
                                    onChange={(e) => updateAddress("fullName", e.target.value)}
                                />
                                {addressErrors.fullName && <span className="text-xs text-red-500">{addressErrors.fullName}</span>}
                            </label>
                            <label className="flex flex-col gap-1">
                                <input
                                    className={getInputCls("phone")}
                                    placeholder="Số điện thoại"
                                    value={address.phone}
                                    onChange={(e) => updateAddress("phone", e.target.value)}
                                />
                                {addressErrors.phone && <span className="text-xs text-red-500">{addressErrors.phone}</span>}
                            </label>
                            <VietnamAddressSelector
                                value={address}
                                onChange={(selection) => {
                                    setAddress((current) => ({ ...current, ...selection }));
                                    setAddressErrors((current) => ({
                                        ...current,
                                        province: undefined,
                                        district: undefined,
                                        ward: undefined,
                                    }));
                                }}
                                error={addressErrors.province || addressErrors.district || addressErrors.ward}
                            />
                            <label className="flex flex-col gap-1 sm:col-span-2">
                                <input
                                    className={getInputCls("streetAddress")}
                                    placeholder="Địa chỉ cụ thể, ví dụ: Số 12 ngõ 34 đường Nguyễn Trãi"
                                    value={address.streetAddress}
                                    onChange={(e) => updateAddress("streetAddress", e.target.value)}
                                />
                                {addressErrors.streetAddress && <span className="text-xs text-red-500">{addressErrors.streetAddress}</span>}
                            </label>
                        </div>
                    </div>

                    {/* Payment method */}
                    <div className="bg-white dark:bg-card rounded-2xl border border-border p-5">
                        <h2 className="font-bold mb-4" style={{ fontFamily: "'Nunito', sans-serif" }}>💰 Phương thức thanh toán</h2>
                        <div className="flex flex-col gap-3">
                            {(([["vnpay", "💳 VNPAY", "Thanh toán qua cổng VNPAY"], ["cod", "💵 COD", "Thanh toán khi nhận hàng"]] as const)).map(([value, label, desc]) => (
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
                            <input className={`${inputCls} border-border focus:ring-[var(--pet-coral)]/40 focus:border-[var(--pet-coral)] flex-1`} placeholder="Nhập mã giảm giá" value={couponCode} onChange={(e) => setCouponCode(e.target.value.toUpperCase())} />
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
