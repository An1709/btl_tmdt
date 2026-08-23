import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import {
    ArrowLeft,
    Banknote,
    CheckCircle2,
    CreditCard,
    LockKeyhole,
    PackageCheck,
    ReceiptText,
    ShieldCheck,
    Tag,
    Truck,
} from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router";
import { toast } from "sonner";
import { useCartStore } from "@/stores/useCartStore";
import { orderService } from "@/services/orderService";
import { couponService } from "@/services/couponService";
import { formatCurrency } from "@/utils/format";
import { isValidVietnamMobilePhone, normalizeVietnamPhone } from "@/utils/vietnamPhone";
import { IMAGE_ASSETS } from "@/utils/constants";
import type { PaymentMethod } from "@/types/order";
import VietnamAddressSelector, { type AddressSelection } from "@/components/checkout/VietnamAddressSelector";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/feedback-state";
import { FormField } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Radio } from "@/components/ui/radio";

interface CheckoutAddress extends AddressSelection {
    fullName: string;
    phone: string;
    streetAddress: string;
}

type AddressErrors = Partial<Record<keyof CheckoutAddress, string>>;
type CouponFeedback = {
    status: "idle" | "checking" | "applied" | "error";
    message: string;
};

const getErrorMessage = (error: unknown, fallback: string) => {
    if (error && typeof error === "object" && "response" in error) {
        const message = (error as { response?: { data?: { message?: string } } }).response?.data?.message;
        if (typeof message === "string" && message.trim()) return message;
    }
    return fallback;
};

const CheckoutPage = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { items, fetchCart, currentUserId, loading: cartLoading } = useCartStore();
    const selectedProductIds = useMemo(() => {
        const state = location.state as { selectedProductIds?: string[]; selectedForUserId?: string | null } | null;
        if (state?.selectedForUserId && state.selectedForUserId !== currentUserId) {
            return [];
        }
        return Array.isArray(state?.selectedProductIds)
            ? [...new Set(state.selectedProductIds.filter(Boolean))]
            : [];
    }, [currentUserId, location.state]);
    const checkoutItems = useMemo(
        () => items.filter((item) => selectedProductIds.includes(item.product.id)),
        [items, selectedProductIds],
    );
    const [loading, setLoading] = useState(false);
    const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("cod");
    const [couponCode, setCouponCode] = useState("");
    const [appliedCouponCode, setAppliedCouponCode] = useState("");
    const [discount, setDiscount] = useState(0);
    const [couponId, setCouponId] = useState<string | undefined>(undefined);
    const [couponFeedback, setCouponFeedback] = useState<CouponFeedback>({
        status: "idle",
        message: "Mã giảm giá sẽ được kiểm tra theo giá trị các sản phẩm đã chọn.",
    });
    const [checkoutRequestId] = useState(() => globalThis.crypto.randomUUID());
    const couponRequestVersion = useRef(0);
    const subtotalRef = useRef(0);
    const [address, setAddress] = useState<CheckoutAddress>({
        fullName: "",
        phone: "",
        streetAddress: "",
        province: "",
        district: "",
        ward: "",
    });
    const [addressErrors, setAddressErrors] = useState<AddressErrors>({});

    const subtotal = checkoutItems.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
    const selectedCount = checkoutItems.reduce((sum, item) => sum + item.quantity, 0);
    const shippingFee = subtotal >= 500000 ? 0 : 30000;
    const total = Math.max(subtotal + shippingFee - discount, 0);
    const checkingCoupon = couponFeedback.status === "checking";
    subtotalRef.current = subtotal;

    useEffect(() => {
        couponRequestVersion.current += 1;
        setDiscount(0);
        setCouponId(undefined);
        setCouponCode("");
        setAppliedCouponCode("");
        setCouponFeedback({
            status: "idle",
            message: "Mã giảm giá sẽ được kiểm tra theo giá trị các sản phẩm đã chọn.",
        });
    }, [subtotal]);

    useEffect(() => () => {
        couponRequestVersion.current += 1;
    }, []);

    const handleCouponChange = (value: string) => {
        const nextValue = value.toUpperCase();
        couponRequestVersion.current += 1;
        setCouponCode(nextValue);
        if (couponId && nextValue.trim() !== appliedCouponCode) {
            setDiscount(0);
            setCouponId(undefined);
            setAppliedCouponCode("");
            setCouponFeedback({
                status: "idle",
                message: "Mã đã thay đổi. Hãy áp dụng lại để cập nhật ưu đãi.",
            });
        } else if (couponFeedback.status === "error" || couponFeedback.status === "checking") {
            setCouponFeedback({ status: "idle", message: "Nhấn Áp dụng để kiểm tra mã giảm giá." });
        }
    };

    const handleApplyCoupon = async () => {
        const normalizedCode = couponCode.trim();
        if (!normalizedCode) {
            setCouponFeedback({ status: "error", message: "Vui lòng nhập mã giảm giá." });
            return;
        }
        if (checkingCoupon || loading) return;

        const requestVersion = ++couponRequestVersion.current;
        const requestedSubtotal = subtotal;
        setCouponFeedback({ status: "checking", message: "Đang kiểm tra mã giảm giá…" });
        try {
            const result = await couponService.checkCoupon(normalizedCode, subtotal);
            if (
                couponRequestVersion.current !== requestVersion
                || subtotalRef.current !== requestedSubtotal
            ) return;
            setDiscount(result.discountAmount);
            setCouponId(result.couponId);
            setAppliedCouponCode(normalizedCode);
            setCouponFeedback({
                status: "applied",
                message: `Đã áp dụng ${normalizedCode}, giảm ${formatCurrency(result.discountAmount)}.`,
            });
            toast.success("Đã áp dụng mã giảm giá.");
        } catch (error: unknown) {
            if (couponRequestVersion.current !== requestVersion) return;
            const message = getErrorMessage(error, "Không thể kiểm tra mã giảm giá. Vui lòng thử lại.");
            setDiscount(0);
            setCouponId(undefined);
            setAppliedCouponCode("");
            setCouponFeedback({ status: "error", message });
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
        const firstError = Object.keys(errors)[0] as keyof CheckoutAddress | undefined;
        if (firstError) {
            const targetId = ["province", "district", "ward"].includes(firstError)
                ? "checkout-address-region"
                : `checkout-${firstError}`;
            requestAnimationFrame(() => document.getElementById(targetId)?.focus());
        }
        return { isValid: Object.keys(errors).length === 0, normalizedPhone };
    };

    const handleOrder = async () => {
        if (loading) return;
        const { isValid, normalizedPhone } = validateAddress();
        if (!isValid) {
            toast.error("Vui lòng kiểm tra lại thông tin giao hàng.");
            return;
        }
        if (checkoutItems.length === 0) {
            toast.error("Vui lòng chọn ít nhất một sản phẩm để thanh toán.");
            return;
        }

        setLoading(true);
        try {
            const streetAddress = address.streetAddress.trim();
            const fullAddress = [streetAddress, address.ward, address.district, address.province].join(", ");
            const order = await orderService.createOrder({
                checkoutRequestId,
                selectedCartItemIds: selectedProductIds,
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
                ...(couponId && { coupon: couponId }),
            });

            if (paymentMethod === "vnpay" && order.paymentUrl) {
                window.location.href = order.paymentUrl;
            } else {
                if (currentUserId) {
                    await fetchCart(currentUserId);
                }
                toast.success("Đặt hàng thành công.");
                navigate(`/orders/${order._id}`);
            }
        } catch (error: unknown) {
            toast.error(getErrorMessage(error, "Không thể đặt hàng. Vui lòng thử lại."));
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        void handleOrder();
    };

    if (cartLoading && selectedProductIds.length > 0 && checkoutItems.length === 0) {
        return (
            <section className="page-container flex min-h-[28rem] items-center justify-center" role="status">
                <p className="text-sm text-muted-foreground">Đang chuẩn bị sản phẩm thanh toán…</p>
            </section>
        );
    }

    if (checkoutItems.length === 0) {
        return (
            <section className="page-container py-16 sm:py-24">
                <EmptyState
                    icon={<PackageCheck className="size-7" />}
                    title="Chưa có sản phẩm được chọn"
                    description="Quay lại giỏ hàng và chọn những sản phẩm bạn muốn thanh toán."
                    action={(
                        <Button asChild>
                            <Link to="/cart"><ArrowLeft aria-hidden="true" /> Quay lại giỏ hàng</Link>
                        </Button>
                    )}
                />
            </section>
        );
    }

    return (
        <section className="page-container py-8 sm:py-10">
            <header className="mb-8">
                <Button asChild variant="link" className="-ml-3 mb-2 px-3">
                    <Link to="/cart"><ArrowLeft aria-hidden="true" /> Quay lại giỏ hàng</Link>
                </Button>
                <p className="text-sm font-semibold text-primary">Thanh toán an toàn</p>
                <h1 className="mt-1 text-3xl font-bold tracking-tight text-text-strong">Hoàn tất đơn hàng</h1>
                <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
                    Kiểm tra thông tin giao hàng, ưu đãi và phương thức thanh toán trước khi xác nhận.
                </p>
            </header>

            <form onSubmit={handleSubmit} noValidate className="grid gap-7 lg:grid-cols-[minmax(0,1fr)_23rem] lg:items-start">
                <div className="min-w-0 space-y-6">
                    <section className="rounded-lg border border-border bg-surface-elevated p-5 shadow-elevation-1 sm:p-6" aria-labelledby="shipping-heading">
                        <div className="mb-5 flex items-start gap-3">
                            <span className="flex size-10 shrink-0 items-center justify-center rounded-md bg-primary-subtle text-primary" aria-hidden="true">
                                <Truck className="size-5" />
                            </span>
                            <div>
                                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Bước 1</p>
                                <h2 id="shipping-heading" className="text-lg font-semibold text-text-strong">Thông tin giao hàng</h2>
                            </div>
                        </div>

                        <div className="grid gap-4 sm:grid-cols-2">
                            <FormField id="checkout-fullName" label="Họ và tên" error={addressErrors.fullName} required>
                                {(fieldProps) => (
                                    <Input
                                        {...fieldProps}
                                        value={address.fullName}
                                        onChange={(event) => updateAddress("fullName", event.target.value)}
                                        autoComplete="name"
                                        placeholder="Nguyễn Văn An"
                                    />
                                )}
                            </FormField>
                            <FormField
                                id="checkout-phone"
                                label="Số điện thoại"
                                description="Dùng số di động Việt Nam để đơn vị vận chuyển liên hệ."
                                error={addressErrors.phone}
                                required
                            >
                                {(fieldProps) => (
                                    <Input
                                        {...fieldProps}
                                        type="tel"
                                        inputMode="tel"
                                        value={address.phone}
                                        onChange={(event) => updateAddress("phone", event.target.value)}
                                        autoComplete="tel"
                                        placeholder="0912 345 678"
                                    />
                                )}
                            </FormField>
                            <VietnamAddressSelector
                                id="checkout-address-region"
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
                            <FormField
                                id="checkout-streetAddress"
                                label="Địa chỉ cụ thể"
                                description="Số nhà, tên đường, tòa nhà hoặc thông tin giúp giao hàng chính xác."
                                error={addressErrors.streetAddress}
                                required
                                className="sm:col-span-2"
                            >
                                {(fieldProps) => (
                                    <Input
                                        {...fieldProps}
                                        value={address.streetAddress}
                                        onChange={(event) => updateAddress("streetAddress", event.target.value)}
                                        autoComplete="street-address"
                                        placeholder="Số 12, ngõ 34, đường Nguyễn Trãi"
                                    />
                                )}
                            </FormField>
                        </div>
                    </section>

                    <section className="rounded-lg border border-border bg-surface-elevated p-5 shadow-elevation-1 sm:p-6" aria-labelledby="payment-heading">
                        <div className="mb-5 flex items-start gap-3">
                            <span className="flex size-10 shrink-0 items-center justify-center rounded-md bg-secondary-subtle text-secondary-subtle-foreground" aria-hidden="true">
                                <CreditCard className="size-5" />
                            </span>
                            <div>
                                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Bước 2</p>
                                <h2 id="payment-heading" className="text-lg font-semibold text-text-strong">Phương thức thanh toán</h2>
                            </div>
                        </div>

                        <fieldset>
                            <legend className="sr-only">Chọn phương thức thanh toán</legend>
                            <div className="grid gap-3 sm:grid-cols-2">
                                {([
                                    ["vnpay", "VNPAY", "Chuyển sang cổng VNPAY sau khi tạo đơn", CreditCard],
                                    ["cod", "Thanh toán khi nhận hàng", "Thanh toán cho đơn vị giao hàng", Banknote],
                                ] as const).map(([value, label, description, Icon]) => (
                                    <label
                                        key={value}
                                        className={`flex min-h-24 cursor-pointer items-start gap-3 rounded-lg border p-4 transition-colors ${paymentMethod === value ? "border-primary bg-primary-subtle/45" : "border-border-strong bg-surface hover:bg-surface-subtle"}`}
                                    >
                                        <Radio
                                            name="payment"
                                            value={value}
                                            checked={paymentMethod === value}
                                            onChange={() => setPaymentMethod(value)}
                                        />
                                        <Icon aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-primary" />
                                        <span>
                                            <span className="block text-sm font-semibold text-text-strong">{label}</span>
                                            <span className="mt-1 block text-xs leading-5 text-muted-foreground">{description}</span>
                                        </span>
                                    </label>
                                ))}
                            </div>
                        </fieldset>
                    </section>

                    <section className="rounded-lg border border-border bg-surface-elevated p-5 shadow-elevation-1 sm:p-6" aria-labelledby="coupon-heading">
                        <div className="mb-5 flex items-start gap-3">
                            <span className="flex size-10 shrink-0 items-center justify-center rounded-md bg-warning-subtle text-warning-subtle-foreground" aria-hidden="true">
                                <Tag className="size-5" />
                            </span>
                            <div>
                                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Bước 3</p>
                                <h2 id="coupon-heading" className="text-lg font-semibold text-text-strong">Mã giảm giá</h2>
                            </div>
                        </div>

                        <div className="flex flex-col gap-3 sm:flex-row">
                            <div className="min-w-0 flex-1">
                                <label htmlFor="checkout-coupon" className="sr-only">Mã giảm giá</label>
                                <Input
                                    id="checkout-coupon"
                                    value={couponCode}
                                    onChange={(event) => handleCouponChange(event.target.value)}
                                    placeholder="Nhập mã giảm giá"
                                    autoComplete="off"
                                    aria-describedby="checkout-coupon-feedback"
                                    aria-invalid={couponFeedback.status === "error" || undefined}
                                />
                            </div>
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => { void handleApplyCoupon(); }}
                                loading={checkingCoupon}
                                disabled={loading}
                                className="sm:min-w-28"
                            >
                                Áp dụng
                            </Button>
                        </div>
                        <p
                            id="checkout-coupon-feedback"
                            role={couponFeedback.status === "error" ? "alert" : "status"}
                            className={`mt-3 flex items-start gap-2 text-sm ${couponFeedback.status === "applied" ? "text-success" : couponFeedback.status === "error" ? "text-destructive" : "text-muted-foreground"}`}
                        >
                            {couponFeedback.status === "applied" && <CheckCircle2 aria-hidden="true" className="mt-0.5 size-4 shrink-0" />}
                            {couponFeedback.message}
                        </p>
                    </section>
                </div>

                <aside className="sticky top-24 rounded-lg border border-border bg-surface-elevated p-5 shadow-elevation-1" aria-labelledby="order-summary-heading">
                    <div className="flex items-start gap-3">
                        <span className="flex size-10 shrink-0 items-center justify-center rounded-md bg-primary-subtle text-primary" aria-hidden="true">
                            <ReceiptText className="size-5" />
                        </span>
                        <div>
                            <h2 id="order-summary-heading" className="text-lg font-semibold text-text-strong">Đơn hàng của bạn</h2>
                            <p className="text-xs text-muted-foreground">{selectedCount} sản phẩm đã chọn</p>
                        </div>
                    </div>

                    <ul className="mt-5 max-h-64 space-y-3 overflow-y-auto pr-1" aria-label="Sản phẩm thanh toán">
                        {checkoutItems.map((item) => (
                            <li key={item.product.id} className="grid grid-cols-[3rem_minmax(0,1fr)] gap-3">
                                <img
                                    src={item.product.image || IMAGE_ASSETS.placeholder}
                                    alt=""
                                    onError={(event) => { event.currentTarget.src = IMAGE_ASSETS.placeholder; }}
                                    className="aspect-square size-12 rounded-md bg-surface-subtle object-cover"
                                />
                                <div className="min-w-0">
                                    <p className="line-clamp-2 text-sm font-medium leading-5 text-text-strong">{item.product.name}</p>
                                    <div className="mt-1 flex justify-between gap-3 text-xs text-muted-foreground">
                                        <span>Số lượng: {item.quantity}</span>
                                        <span className="shrink-0 font-semibold text-text-strong">{formatCurrency(item.product.price * item.quantity)}</span>
                                    </div>
                                </div>
                            </li>
                        ))}
                    </ul>

                    <dl className="mt-5 space-y-3 border-t border-divider pt-4 text-sm">
                        <div className="flex justify-between gap-4 text-muted-foreground">
                            <dt>Tạm tính</dt>
                            <dd className="font-semibold text-text-strong">{formatCurrency(subtotal)}</dd>
                        </div>
                        <div className="flex justify-between gap-4 text-muted-foreground">
                            <dt>Phí vận chuyển</dt>
                            <dd className={shippingFee === 0 ? "font-semibold text-success" : "font-semibold text-text-strong"}>
                                {shippingFee === 0 ? "Miễn phí" : formatCurrency(shippingFee)}
                            </dd>
                        </div>
                        {discount > 0 && (
                            <div className="flex justify-between gap-4 text-success">
                                <dt>Giảm giá</dt>
                                <dd className="font-semibold">−{formatCurrency(discount)}</dd>
                            </div>
                        )}
                        <div className="flex items-baseline justify-between gap-4 border-t border-divider pt-4">
                            <dt className="font-semibold text-text-strong">Tổng thanh toán</dt>
                            <dd className="text-xl font-bold text-primary">{formatCurrency(total)}</dd>
                        </div>
                    </dl>
                    <p className="mt-3 text-xs leading-5 text-muted-foreground">Giá, tồn kho, phí giao hàng và ưu đãi cuối cùng được backend kiểm tra lại khi tạo đơn.</p>

                    <Button type="submit" size="lg" loading={loading} className="mt-5 w-full">
                        {paymentMethod === "vnpay" ? "Tiếp tục với VNPAY" : "Xác nhận đặt hàng"}
                    </Button>
                    <div className="mt-4 flex items-start gap-2 text-xs leading-5 text-muted-foreground">
                        {paymentMethod === "vnpay" ? <LockKeyhole aria-hidden="true" className="mt-0.5 size-4 shrink-0" /> : <ShieldCheck aria-hidden="true" className="mt-0.5 size-4 shrink-0" />}
                        <p>
                            {paymentMethod === "vnpay"
                                ? "Bạn chỉ được chuyển sang VNPAY sau khi đơn hàng được tạo thành công."
                                : "Bạn thanh toán khi nhận hàng theo quy trình COD hiện tại."}
                        </p>
                    </div>
                </aside>
            </form>
        </section>
    );
};

export default CheckoutPage;
