import { useEffect, useState } from "react";
import { ArrowRight, CircleCheck, CircleX, House, LoaderCircle, ReceiptText, ShieldAlert } from "lucide-react";
import { Link, useSearchParams } from "react-router";
import { useAuthStore } from "@/stores/useAuthStore";
import { useCartStore } from "@/stores/useCartStore";
import { Button } from "@/components/ui/button";
import { orderService } from "@/services/orderService";

type VerificationState = "checking" | "success" | "failed" | "unverified";

const FAILURE_MESSAGES: Record<string, string> = {
    checksum_error: "Không thể xác minh chữ ký giao dịch. Đơn hàng chưa được ghi nhận là đã thanh toán.",
    order_not_found: "Không tìm thấy đơn hàng tương ứng với giao dịch này.",
    invalid_amount: "Số tiền trả về không khớp với đơn hàng. Trạng thái thanh toán chưa được xác nhận.",
    server_error: "Hệ thống chưa thể xử lý kết quả thanh toán. Vui lòng thử lại hoặc liên hệ hỗ trợ.",
};

const PaymentResultPage = () => {
    const [searchParams] = useSearchParams();
    const status = searchParams.get("status");
    const orderId = searchParams.get("orderId") || "";
    const code = searchParams.get("code") || "";
    const user = useAuthStore((state) => state.user);
    const authInitialized = useAuthStore((state) => state.initialized);
    const fetchCart = useCartStore((state) => state.fetchCart);
    const [verificationResult, setVerificationResult] = useState<{ orderId: string; state: VerificationState } | null>(null);
    const fallbackVerification: VerificationState = !authInitialized
        ? "checking"
        : status === "failed" || status === "error"
            ? "failed"
            : !orderId || !user?._id
                ? "unverified"
                : "checking";
    const verification = verificationResult?.orderId === orderId
        ? verificationResult.state
        : fallbackVerification;
    const isSuccess = verification === "success";
    const isConfirmedFailure = verification === "failed";
    const isChecking = verification === "checking";
    const title = isChecking
        ? "Đang xác minh thanh toán"
        : isSuccess
        ? "Thanh toán thành công"
        : isConfirmedFailure
            ? "Thanh toán chưa thành công"
            : "Chưa thể xác minh kết quả";
    const description = isChecking
        ? "PetMart đang đối chiếu trạng thái đơn hàng với dữ liệu đã được backend xác nhận."
        : isSuccess
        ? "Đơn hàng đã được xác nhận thanh toán và đang chờ PetMart xử lý."
        : isConfirmedFailure
            ? FAILURE_MESSAGES[code] ?? `Giao dịch không thành công${code ? ` (mã: ${code})` : ""}. Bạn có thể quay lại đơn hàng để kiểm tra và thử lại khi phù hợp.`
            : "Đường dẫn trả về không chứa trạng thái hợp lệ. PetMart không xem đây là một giao dịch thành công.";
    const Icon = isChecking ? LoaderCircle : isSuccess ? CircleCheck : isConfirmedFailure ? CircleX : ShieldAlert;

    useEffect(() => {
        if (!authInitialized) return;

        if (!orderId || !user?._id) return;

        let active = true;

        orderService.getOrderById(orderId)
            .then((order) => {
                if (!active) return;

                if (order.isPaid && order.paymentMethod.toLowerCase() === "vnpay") {
                    setVerificationResult({ orderId, state: "success" });
                    return;
                }

                setVerificationResult({
                    orderId,
                    state: status === "failed" || status === "error" ? "failed" : "unverified",
                });
            })
            .catch(() => {
                if (active) {
                    setVerificationResult({
                        orderId,
                        state: status === "failed" || status === "error" ? "failed" : "unverified",
                    });
                }
            });

        return () => {
            active = false;
        };
    }, [authInitialized, orderId, status, user?._id]);

    useEffect(() => {
        if (isSuccess && user?._id) {
            void fetchCart(user._id);
        }
    }, [fetchCart, isSuccess, user?._id]);

    return (
        <main className="flex min-h-screen items-center justify-center bg-background px-4 py-12">
            <section className="w-full max-w-xl rounded-lg border border-border bg-surface-elevated p-6 shadow-elevation-2 sm:p-8" aria-labelledby="payment-result-heading">
                <div className={`flex size-14 items-center justify-center rounded-full ${isSuccess ? "bg-success-subtle text-success-subtle-foreground" : isConfirmedFailure ? "bg-destructive-subtle text-destructive" : "bg-warning-subtle text-warning-subtle-foreground"}`}>
                    <Icon aria-hidden="true" className={`size-7 ${isChecking ? "animate-spin" : ""}`} />
                </div>

                <p className="mt-6 text-sm font-semibold text-primary">Kết quả thanh toán VNPAY</p>
                <h1 id="payment-result-heading" className="mt-1 text-3xl font-bold tracking-tight text-text-strong">{title}</h1>
                <p className="mt-3 text-sm leading-6 text-muted-foreground">{description}</p>

                {(orderId || code) && (
                    <dl className="mt-6 divide-y divide-divider rounded-lg bg-surface-subtle px-4">
                        {orderId && (
                            <div className="flex flex-col gap-1 py-3 sm:flex-row sm:items-center sm:justify-between">
                                <dt className="text-sm text-muted-foreground">{isSuccess ? "Mã đơn hàng" : "Mã tham chiếu"}</dt>
                                <dd className="break-all font-mono text-sm font-semibold text-text-strong">{orderId}</dd>
                            </div>
                        )}
                        {code && (
                            <div className="flex flex-col gap-1 py-3 sm:flex-row sm:items-center sm:justify-between">
                                <dt className="text-sm text-muted-foreground">Mã phản hồi</dt>
                                <dd className="font-mono text-sm font-semibold text-text-strong">{code}</dd>
                            </div>
                        )}
                    </dl>
                )}

                <div className="mt-7 flex flex-col gap-3 sm:flex-row">
                    {isSuccess && orderId && (
                        <Button asChild className="sm:flex-1">
                            <Link to={`/orders/${orderId}`}>
                                <ReceiptText aria-hidden="true" />
                                Xem đơn hàng
                                <ArrowRight aria-hidden="true" />
                            </Link>
                        </Button>
                    )}
                    <Button asChild variant={isSuccess && orderId ? "outline" : "default"} className="sm:flex-1">
                        <Link to="/">
                            <House aria-hidden="true" />
                            Về trang chủ
                        </Link>
                    </Button>
                </div>

                {!isSuccess && (
                    <p className="mt-5 text-xs leading-5 text-muted-foreground">
                        Không dựa vào ảnh chụp hoặc đường dẫn này để xác nhận thanh toán. Hãy kiểm tra trạng thái đơn hàng trong tài khoản nếu bạn cần đối chiếu.
                    </p>
                )}
            </section>
        </main>
    );
};

export default PaymentResultPage;
