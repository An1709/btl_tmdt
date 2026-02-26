import { useEffect, useState } from "react";
import { useSearchParams, Link } from "react-router";
import { paymentService } from "@/services/paymentService";
import Loading from "@/components/common/Loading";

const PaymentResultPage = () => {
    const [searchParams] = useSearchParams();
    const [result, setResult] = useState<{ success: boolean; message: string; orderId: string } | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const params: Record<string, string> = {};
        searchParams.forEach((v, k) => { params[k] = v; });

        paymentService
            .verifyReturn(params as Parameters<typeof paymentService.verifyReturn>[0])
            .then(setResult)
            .catch(() => setResult({ success: false, message: "Không thể xác minh thanh toán.", orderId: "" }))
            .finally(() => setLoading(false));
    }, [searchParams]);

    if (loading) return <Loading fullPage text="Đang xác minh thanh toán..." />;

    return (
        <div className="max-w-lg mx-auto px-4 py-24 text-center">
            <div className="text-7xl mb-6">{result?.success ? "🎉" : "😢"}</div>
            <h1
                className={`text-3xl font-black mb-3 ${result?.success ? "text-emerald-600" : "text-red-500"}`}
                style={{ fontFamily: "'Nunito', sans-serif" }}
            >
                {result?.success ? "Thanh toán thành công!" : "Thanh toán thất bại"}
            </h1>
            <p className="text-muted-foreground mb-8">{result?.message}</p>

            <div className="flex flex-col sm:flex-row gap-3 justify-center">
                {result?.orderId && (
                    <Link to={`/orders/${result.orderId}`} className="btn-pet-primary">
                        📦 Xem đơn hàng
                    </Link>
                )}
                <Link to="/" className="btn-pet-secondary">🏠 Về trang chủ</Link>
            </div>
        </div>
    );
};

export default PaymentResultPage;