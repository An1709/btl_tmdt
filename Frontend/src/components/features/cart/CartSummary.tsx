import { Link } from "react-router";
import { useCartStore } from "@/stores/useCartStore";
import { formatCurrency } from "@/utils/format";

const SHIPPING_FEE = 30000;
const FREE_SHIPPING_THRESHOLD = 500000;

interface CartSummaryProps {
    subtotal?: number;
    count?: number;
    selectedProductIds?: string[];
}

const CartSummary = ({ subtotal: selectedSubtotal, count: selectedCount, selectedProductIds = [] }: CartSummaryProps) => {
    const fallbackSubtotal = useCartStore((s) => s.totalPrice)();
    const fallbackCount = useCartStore((s) => s.totalCount)();
    const currentUserId = useCartStore((s) => s.currentUserId);
    const subtotal = selectedSubtotal ?? fallbackSubtotal;
    const count = selectedCount ?? fallbackCount;
    const shippingFee = subtotal >= FREE_SHIPPING_THRESHOLD ? 0 : SHIPPING_FEE;
    const total = subtotal + shippingFee;
    const hasSelection = count > 0;

    return (
        <div className="bg-white dark:bg-card rounded-2xl border border-border shadow-sm p-6 sticky top-24">
            <h3 className="font-bold text-lg text-foreground mb-4" style={{ fontFamily: "'Nunito', sans-serif" }}>
                Tóm Tắt Đơn Hàng
            </h3>

            <div className="flex flex-col gap-3 text-sm">
                <div className="flex justify-between text-muted-foreground">
                    <span>Tạm tính ({count} sản phẩm)</span>
                    <span className="font-semibold text-foreground">{formatCurrency(subtotal)}</span>
                </div>

                <div className="flex justify-between text-muted-foreground">
                    <span>Phí vận chuyển</span>
                    <span className={`font-semibold ${shippingFee === 0 ? "text-emerald-600" : "text-foreground"}`}>
                        {shippingFee === 0 ? "Miễn phí 🎉" : formatCurrency(shippingFee)}
                    </span>
                </div>

                {subtotal < FREE_SHIPPING_THRESHOLD && (
                    <p className="text-xs text-muted-foreground bg-amber-50 dark:bg-amber-950/30 rounded-xl px-3 py-2">
                        💡 Mua thêm <strong>{formatCurrency(FREE_SHIPPING_THRESHOLD - subtotal)}</strong> để được miễn phí ship!
                    </p>
                )}

                <div className="border-t border-border pt-3 flex justify-between font-bold text-base">
                    <span>Tổng cộng</span>
                    <span className="text-[var(--pet-coral)]">{formatCurrency(total)}</span>
                </div>
            </div>

            {!hasSelection && (
                <p className="mt-4 text-xs text-red-500 bg-red-50 dark:bg-red-950/30 rounded-xl px-3 py-2">
                    Vui lòng chọn ít nhất một sản phẩm để thanh toán.
                </p>
            )}

            {hasSelection ? (
                <Link
                    to="/checkout"
                    state={{ selectedProductIds, selectedForUserId: currentUserId }}
                    className="btn-pet-primary w-full justify-center mt-5 py-3 text-sm"
                >
                    Thanh toán sản phẩm đã chọn →
                </Link>
            ) : (
                <button
                    type="button"
                    disabled
                    className="btn-pet-primary w-full justify-center mt-5 py-3 text-sm opacity-50 cursor-not-allowed"
                >
                    Thanh toán sản phẩm đã chọn →
                </button>
            )}

            <Link
                to="/shop"
                className="block text-center text-sm text-muted-foreground hover:text-[var(--pet-coral)] mt-3 transition-colors"
            >
                ← Tiếp tục mua sắm
            </Link>
        </div>
    );
};

export default CartSummary;
