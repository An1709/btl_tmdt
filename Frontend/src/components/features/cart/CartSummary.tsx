import { Link } from "react-router";
import { useCartStore } from "@/stores/useCartStore";
import { formatCurrency } from "@/utils/format";

const SHIPPING_FEE = 30000;
const FREE_SHIPPING_THRESHOLD = 500000;

const CartSummary = () => {
    const subtotal = useCartStore((s) => s.totalPrice)();
    const count = useCartStore((s) => s.totalCount)();
    const shippingFee = subtotal >= FREE_SHIPPING_THRESHOLD ? 0 : SHIPPING_FEE;
    const total = subtotal + shippingFee;

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

            <Link
                to="/checkout"
                className="btn-pet-primary w-full justify-center mt-5 py-3 text-sm"
            >
                Tiến hành thanh toán →
            </Link>

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