import { useCallback, useEffect, useRef, useState } from "react";
import { useParams, Link } from "react-router";
import { ArrowLeft, Award, CreditCard, MapPin, Package } from "lucide-react";

import Sidebar from "@/components/common/Sidebar";
import { SkeletonBlock } from "@/components/common/Loading";
import { OrderStatusBadge, PaymentStatusBadge } from "@/components/features/order/OrderStatusBadge";
import { orderService } from "@/services/orderService";
import type { Order } from "@/types/order";
import { formatCurrency, formatDate } from "@/utils/format";
import { Button } from "@/components/ui/button";
import { Dialog, DialogFooter } from "@/components/ui/dialog";
import { ErrorState } from "@/components/ui/feedback-state";
import { FormField } from "@/components/ui/field";
import { Textarea } from "@/components/ui/textarea";
import OrderStatusTimeline from "@/components/features/order/OrderStatusTimeline";
import { notify } from "@/lib/notify";

const getErrorMessage = (err: unknown, fallback: string) => {
    if (err && typeof err === "object" && "response" in err) {
        return (err as { response?: { data?: { message?: string } } }).response?.data?.message ?? fallback;
    }

    return fallback;
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

const getOrderReference = (order: Order) => order._id.slice(-8).toUpperCase();

const getPaymentMethodLabel = (method: Order["paymentMethod"]) => (
    method === "cod" ? "Thanh toán khi nhận hàng" : "VNPay"
);

const OrderDetailSkeleton = () => (
    <div className="space-y-5" aria-label="Đang tải chi tiết đơn hàng">
        <div className="flex items-start justify-between gap-4">
            <div className="space-y-2"><SkeletonBlock className="h-5 w-40" /><SkeletonBlock className="h-4 w-52" /></div>
            <SkeletonBlock className="h-6 w-28 rounded-full" />
        </div>
        <SkeletonBlock className="h-48 w-full" />
        <div className="grid gap-5 lg:grid-cols-3">
            <SkeletonBlock className="h-72 w-full lg:col-span-2" />
            <SkeletonBlock className="h-72 w-full" />
        </div>
    </div>
);

const OrderDetailPage = () => {
    const { id } = useParams<{ id: string }>();
    const [order, setOrder] = useState<Order | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [showCancelDialog, setShowCancelDialog] = useState(false);
    const [cancelReason, setCancelReason] = useState("");
    const [requestingCancel, setRequestingCancel] = useState(false);
    const requestSequenceRef = useRef(0);

    const loadOrder = useCallback(async () => {
        const requestSequence = ++requestSequenceRef.current;

        if (!id) {
            setOrder(null);
            setError("Không tìm thấy mã đơn hàng.");
            setLoading(false);
            return;
        }

        setLoading(true);
        setError(null);
        setShowCancelDialog(false);
        setCancelReason("");
        setRequestingCancel(false);

        try {
            const nextOrder = await orderService.getOrderById(id);
            if (requestSequence !== requestSequenceRef.current) return;

            setOrder(nextOrder);
        } catch {
            if (requestSequence !== requestSequenceRef.current) return;

            setOrder(null);
            setError("Không thể tải đơn hàng. Vui lòng thử lại.");
        } finally {
            if (requestSequence === requestSequenceRef.current) setLoading(false);
        }
    }, [id]);

    useEffect(() => {
        void loadOrder();

        return () => {
            requestSequenceRef.current += 1;
        };
    }, [loadOrder]);

    const canRequestCancel = order
        && ["Pending", "Processing"].includes(order.status)
        && order.cancelStatus !== "pending";

    const handleCancelRequest = async () => {
        if (!order) return;

        const requestSequence = requestSequenceRef.current;
        setRequestingCancel(true);
        try {
            const updatedOrder = await orderService.requestCancellation(order._id, cancelReason.trim());
            if (requestSequence !== requestSequenceRef.current) return;

            setOrder(updatedOrder);
            setShowCancelDialog(false);
            setCancelReason("");
            notify.success("Yêu cầu hủy đơn đã được gửi.");
        } catch (err) {
            if (requestSequence !== requestSequenceRef.current) return;

            notify.error(getErrorMessage(err, "Đơn hàng này không thể hủy ở trạng thái hiện tại."));
        } finally {
            if (requestSequence === requestSequenceRef.current) setRequestingCancel(false);
        }
    };

    if (loading) {
        return (
            <div className="mx-auto flex max-w-7xl flex-col gap-6 px-page py-8 lg:flex-row lg:gap-8">
                <Sidebar mode="user" />
                <section className="min-w-0 flex-1"><OrderDetailSkeleton /></section>
            </div>
        );
    }

    if (error || !order) {
        return (
            <div className="mx-auto flex max-w-7xl flex-col gap-6 px-page py-8 lg:flex-row lg:gap-8">
                <Sidebar mode="user" />
                <section className="min-w-0 flex-1">
                    <ErrorState
                        title="Không tìm thấy đơn hàng"
                        description={error || "Đơn hàng không tồn tại hoặc bạn không có quyền xem."}
                        action={
                            <div className="flex flex-wrap justify-center gap-2">
                                <Button type="button" variant="outline" onClick={() => void loadOrder()}>Thử lại</Button>
                                <Button asChild><Link to="/orders">Quay lại đơn hàng</Link></Button>
                            </div>
                        }
                    />
                </section>
            </div>
        );
    }

    return (
        <div className="mx-auto flex max-w-7xl flex-col gap-6 px-page py-8 lg:flex-row lg:gap-8">
            <Sidebar mode="user" />
            <section className="min-w-0 flex-1">
                <header className="mb-6 flex flex-wrap items-start justify-between gap-4">
                    <div>
                        <Link to="/orders" className="inline-flex min-h-11 items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-text-strong">
                            <ArrowLeft aria-hidden="true" className="size-4" />
                            Quay lại đơn hàng
                        </Link>
                        <h1 className="mt-3 text-2xl font-bold tracking-tight text-text-strong">Đơn hàng #{getOrderReference(order)}</h1>
                        <p className="mt-1 text-sm text-muted-foreground">Đặt ngày {formatDate(order.createdAt)}</p>
                    </div>
                    <OrderStatusBadge status={order.status} />
                </header>

                {order.cancelStatus === "pending" && (
                    <section className="mb-5 border border-warning/25 bg-warning/10 p-4" aria-label="Trạng thái yêu cầu hủy đơn">
                        <p className="text-sm font-semibold text-text-strong">Yêu cầu hủy đơn đang chờ duyệt</p>
                        <p className="mt-1 text-sm leading-6 text-muted-foreground">Quản trị viên sẽ kiểm tra yêu cầu trước khi quyết định hủy đơn.</p>
                        {order.cancelReason && (
                            <p className="mt-2 text-sm text-muted-foreground">Lý do: {order.cancelReason}</p>
                        )}
                    </section>
                )}

                {order.cancelStatus === "rejected" && (
                    <section className="mb-5 border border-warning/25 bg-warning/10 p-4" aria-label="Yêu cầu hủy đơn bị từ chối">
                        <p className="text-sm font-semibold text-text-strong">Yêu cầu hủy đơn chưa được chấp thuận</p>
                        {order.cancelRejectionReason && <p className="mt-1 text-sm leading-6 text-muted-foreground">Phản hồi: {order.cancelRejectionReason}</p>}
                    </section>
                )}

                {order.status === "Cancelled" && (
                    <section className="mb-5 border border-destructive/25 bg-destructive/10 p-4" aria-label="Đơn hàng đã hủy">
                        <p className="text-sm font-semibold text-text-strong">Đơn hàng này đã được hủy.</p>
                    </section>
                )}

                <OrderStatusTimeline order={order} />

                {order.loyaltyPointsAwarded && (order.loyaltyPoints ?? 0) > 0 && (
                    <section className="mb-5 flex items-start gap-3 border border-success/25 bg-success/10 p-4" aria-label="Điểm thành viên">
                        <Award aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-success" />
                        <div>
                            <h2 className="text-sm font-semibold text-text-strong">Điểm thành viên</h2>
                            <p className="mt-1 text-sm leading-6 text-muted-foreground">Bạn đã nhận {order.loyaltyPoints} điểm từ đơn hàng này.</p>
                        </div>
                    </section>
                )}

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                    <section className="border border-border bg-surface p-4 sm:p-5 lg:col-span-2" aria-labelledby="order-items-title">
                        <div className="mb-4 flex items-center gap-2">
                            <Package aria-hidden="true" className="size-5 text-primary" />
                            <h2 id="order-items-title" className="font-semibold text-text-strong">Sản phẩm</h2>
                        </div>
                        <div className="flex flex-col gap-3">
                            {(order.orderItems ?? []).length === 0 ? (
                                <p className="py-4 text-sm text-muted-foreground">Chưa có thông tin sản phẩm trong đơn hàng này.</p>
                            ) : (order.orderItems ?? []).map((item, index) => (
                                <div key={item.product ?? index} className="flex items-center gap-3 border-b border-divider pb-3 last:border-0 last:pb-0">
                                    {item.image && (
                                        <img
                                            src={item.image}
                                            alt={item.name}
                                            className="size-14 shrink-0 rounded-md border border-border object-cover"
                                        />
                                    )}
                                    {!item.image && <span aria-hidden="true" className="flex size-14 shrink-0 items-center justify-center rounded-md bg-surface-subtle text-muted-foreground"><Package className="size-5" /></span>}
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-semibold text-text-strong line-clamp-2">
                                            {item.name ?? "Sản phẩm"}
                                        </p>
                                        <p className="mt-1 text-xs text-muted-foreground">Số lượng: {item.qty}</p>
                                    </div>
                                    <p className="font-semibold text-text-strong text-sm shrink-0">
                                        {formatCurrency((item.price ?? 0) * (item.qty ?? 1))}
                                    </p>
                                </div>
                            ))}
                        </div>

                        <div className="border-t border-divider mt-5 pt-4 flex flex-col gap-2 text-sm">
                            <div className="flex justify-between text-muted-foreground">
                                <span>Tạm tính</span>
                                <span>{formatCurrency(order.itemsPrice ?? 0)}</span>
                            </div>
                            <div className="flex justify-between text-muted-foreground">
                                <span>Phí ship</span>
                                <span>{formatCurrency(order.shippingPrice ?? 0)}</span>
                            </div>
                            {(order.discountAmount ?? 0) > 0 && (
                                <div className="flex justify-between text-success">
                                    <span>Giảm giá</span>
                                    <span>−{formatCurrency(order.discountAmount)}</span>
                                </div>
                            )}
                            <div className="flex justify-between font-semibold text-base border-t border-divider pt-3 text-text-strong">
                                <span>Tổng cộng</span>
                                <span>{formatCurrency(order.totalPrice ?? 0)}</span>
                            </div>
                        </div>
                    </section>

                    <div className="flex flex-col gap-4">
                        <section className="border border-border bg-surface p-4 sm:p-5" aria-labelledby="shipping-title">
                            <div className="mb-3 flex items-center gap-2"><MapPin aria-hidden="true" className="size-5 text-primary" /><h2 id="shipping-title" className="font-semibold text-text-strong">Giao hàng</h2></div>
                            {order.shippingAddress?.fullName && (
                                <p className="text-sm font-semibold text-text-strong">{order.shippingAddress.fullName}</p>
                            )}
                            {order.shippingAddress?.phone && <p className="mt-1 text-sm text-muted-foreground">{order.shippingAddress.phone}</p>}
                            <p className="mt-2 text-sm leading-6 text-muted-foreground">{getShippingAddressText(order) || "Chưa có thông tin địa chỉ giao hàng."}</p>
                        </section>

                        <section className="border border-border bg-surface p-4 sm:p-5" aria-labelledby="payment-title">
                            <div className="mb-3 flex items-center gap-2"><CreditCard aria-hidden="true" className="size-5 text-primary" /><h2 id="payment-title" className="font-semibold text-text-strong">Thanh toán</h2></div>
                            <p className="text-sm text-muted-foreground">Phương thức</p>
                            <p className="mt-1 text-sm font-medium text-text-strong">{getPaymentMethodLabel(order.paymentMethod)}</p>
                            <div className="mt-3"><PaymentStatusBadge isPaid={order.isPaid} /></div>
                            {order.paidAt && (
                                <p className="mt-3 text-xs text-muted-foreground">Thanh toán ngày {formatDate(order.paidAt)}</p>
                            )}
                        </section>

                        {canRequestCancel && (
                            <Button type="button" variant="destructive" className="w-full" onClick={() => setShowCancelDialog(true)}>
                                Yêu cầu hủy đơn
                            </Button>
                        )}
                    </div>
                </div>
            </section>

            <Dialog
                open={showCancelDialog}
                onOpenChange={(open) => {
                    if (!requestingCancel) setShowCancelDialog(open);
                }}
                title="Yêu cầu hủy đơn"
                description="Đây là yêu cầu cần quản trị viên xem xét, không phải thao tác hủy ngay lập tức."
                footer={
                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => setShowCancelDialog(false)} disabled={requestingCancel}>
                            Đóng
                        </Button>
                        <Button type="button" variant="destructive" onClick={handleCancelRequest} loading={requestingCancel}>
                            Gửi yêu cầu
                        </Button>
                    </DialogFooter>
                }
            >
                <FormField
                    label="Lý do hủy đơn"
                    description="Không bắt buộc. Thông tin này sẽ được gửi kèm yêu cầu để quản trị viên xem xét."
                >
                    {({ id, ...fieldProps }) => (
                        <Textarea
                            {...fieldProps}
                            data-autofocus
                            id={id}
                            value={cancelReason}
                            onChange={(e) => setCancelReason(e.target.value)}
                            maxLength={500}
                            rows={3}
                            placeholder="Ví dụ: Tôi muốn thay đổi thông tin đơn hàng"
                        />
                    )}
                </FormField>
            </Dialog>
        </div>
    );
};

export default OrderDetailPage;
