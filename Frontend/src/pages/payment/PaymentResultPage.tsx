/**
 * PaymentResultPage
 *
 * HOW THIS WORKS:
 * ──────────────────────────────────────────────────────────────────────────
 * 1. User pays on VNPay → VNPay redirects browser to:
 *      {VNP_RETURN_URL}?vnp_ResponseCode=00&...
 *
 * 2. Backend verifies the signature and does:
 *      res.redirect('{CLIENT_URL}/payment/result?status=success&orderId=XXX')
 *
 * 3. React Router renders THIS page. We just read ?status= from the URL.
 *
 * WHY NOT AXIOS:
 *    Calling the /api/payment/vnpay_return endpoint from a useEffect via Axios
 *    triggers a CORS pre-flight request. The backend is doing res.redirect()
 *    which browsers cannot follow cross-origin — hence the CORS error.
 *    The backend already did all the verification; the result is IN the URL.
 * ──────────────────────────────────────────────────────────────────────────
 */

import { useEffect } from "react";
import { useSearchParams, Link } from "react-router";
import { useAuthStore } from "@/stores/useAuthStore";
import { useCartStore } from "@/stores/useCartStore";

const PaymentResultPage = () => {
    const [searchParams] = useSearchParams();

    // Backend sets ?status=success|failed and ?orderId=XXXX
    const status  = searchParams.get("status");   // "success" | "failed" | "error"
    const orderId = searchParams.get("orderId") || "";
    const code    = searchParams.get("code") || "";
    const user = useAuthStore((state) => state.user);
    const fetchCart = useCartStore((state) => state.fetchCart);

    const isSuccess = status === "success";

    useEffect(() => {
        if (isSuccess && user?._id) {
            void fetchCart(user._id);
        }
    }, [fetchCart, isSuccess, user?._id]);

    return (
        <div className="max-w-lg mx-auto px-4 py-24 text-center">
            <div className="text-7xl mb-6">{isSuccess ? "🎉" : "😢"}</div>

            <h1
                className={`text-3xl font-black mb-3 ${isSuccess ? "text-emerald-600" : "text-red-500"}`}
                style={{ fontFamily: "'Nunito', sans-serif" }}
            >
                {isSuccess ? "Thanh toán thành công!" : "Thanh toán thất bại"}
            </h1>

            <p className="text-muted-foreground mb-8">
                {isSuccess
                    ? "Đơn hàng của bạn đã được xác nhận và đang được xử lý."
                    : code === "checksum_error"
                        ? "Không thể xác minh thanh toán. Vui lòng liên hệ hỗ trợ."
                        : `Giao dịch không thành công (Mã lỗi: ${code || "unknown"}).`}
            </p>

            <div className="flex flex-col sm:flex-row gap-3 justify-center">
                {isSuccess && orderId && (
                    <Link to={`/orders/${orderId}`} className="btn-pet-primary">
                        📦 Xem đơn hàng
                    </Link>
                )}
                <Link to="/" className="btn-pet-secondary">🏠 Về trang chủ</Link>
            </div>
        </div>
    );
};

export default PaymentResultPage;
