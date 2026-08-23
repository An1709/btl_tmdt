import { ArrowRight, ShoppingBag, Truck } from "lucide-react";
import { Link } from "react-router";
import { useCartStore } from "@/stores/useCartStore";
import { formatCurrency } from "@/utils/format";
import { Button } from "@/components/ui/button";

const SHIPPING_FEE = 30000;
const FREE_SHIPPING_THRESHOLD = 500000;

interface CartSummaryProps {
    subtotal?: number;
    count?: number;
    selectedProductIds?: string[];
}

const CartSummary = ({ subtotal: selectedSubtotal, count: selectedCount, selectedProductIds = [] }: CartSummaryProps) => {
    const fallbackSubtotal = useCartStore((state) => state.totalPrice)();
    const fallbackCount = useCartStore((state) => state.totalCount)();
    const currentUserId = useCartStore((state) => state.currentUserId);
    const subtotal = selectedSubtotal ?? fallbackSubtotal;
    const count = selectedCount ?? fallbackCount;
    const hasSelection = count > 0;
    const shippingFee = hasSelection && subtotal < FREE_SHIPPING_THRESHOLD ? SHIPPING_FEE : 0;
    const total = hasSelection ? subtotal + shippingFee : 0;
    const amountToFreeShipping = Math.max(FREE_SHIPPING_THRESHOLD - subtotal, 0);
    const shippingProgress = Math.min((subtotal / FREE_SHIPPING_THRESHOLD) * 100, 100);

    return (
        <aside className="sticky top-24 rounded-lg border border-border bg-surface-elevated p-5 shadow-elevation-1" aria-labelledby="cart-summary-heading">
            <div className="flex items-center gap-3">
                <span className="flex size-10 items-center justify-center rounded-md bg-primary-subtle text-primary" aria-hidden="true">
                    <ShoppingBag className="size-5" />
                </span>
                <div>
                    <h2 id="cart-summary-heading" className="text-lg font-semibold text-text-strong">Tóm tắt thanh toán</h2>
                    <p className="text-xs text-muted-foreground">Chỉ tính các sản phẩm đã chọn</p>
                </div>
            </div>

            <dl className="mt-5 space-y-3 text-sm">
                <div className="flex items-start justify-between gap-4 text-muted-foreground">
                    <dt>Sản phẩm đã chọn ({count})</dt>
                    <dd className="font-semibold text-text-strong">{formatCurrency(subtotal)}</dd>
                </div>
                <div className="flex items-start justify-between gap-4 text-muted-foreground">
                    <dt>Phí vận chuyển</dt>
                    <dd className={`font-semibold ${shippingFee === 0 && hasSelection ? "text-success" : "text-text-strong"}`}>
                        {!hasSelection ? "—" : shippingFee === 0 ? "Miễn phí" : formatCurrency(shippingFee)}
                    </dd>
                </div>
                <div className="flex items-baseline justify-between gap-4 border-t border-divider pt-4">
                    <dt className="font-semibold text-text-strong">Tạm tính thanh toán</dt>
                    <dd className="text-xl font-bold text-primary">{formatCurrency(total)}</dd>
                </div>
            </dl>

            {hasSelection && amountToFreeShipping > 0 && (
                <div className="mt-5 rounded-md bg-warning-subtle p-3 text-sm text-warning-subtle-foreground">
                    <div className="flex items-start gap-2">
                        <Truck aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
                        <p>Mua thêm <strong>{formatCurrency(amountToFreeShipping)}</strong> trong nhóm đã chọn để được miễn phí vận chuyển.</p>
                    </div>
                    <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-warning/20" aria-hidden="true">
                        <div className="h-full rounded-full bg-warning" style={{ width: `${shippingProgress}%` }} />
                    </div>
                </div>
            )}

            {!hasSelection && (
                <p role="status" className="mt-5 rounded-md border border-info/25 bg-info-subtle p-3 text-sm text-info-subtle-foreground">
                    Chọn ít nhất một sản phẩm để xem tổng tiền và tiếp tục thanh toán.
                </p>
            )}

            {hasSelection ? (
                <Button asChild className="mt-5 w-full">
                    <Link
                        to="/checkout"
                        state={{ selectedProductIds, selectedForUserId: currentUserId }}
                    >
                        Thanh toán sản phẩm đã chọn
                        <ArrowRight aria-hidden="true" />
                    </Link>
                </Button>
            ) : (
                <Button type="button" disabled className="mt-5 w-full">
                    Thanh toán sản phẩm đã chọn
                    <ArrowRight aria-hidden="true" />
                </Button>
            )}

            <Button asChild variant="link" className="mt-2 w-full">
                <Link to="/shop">Tiếp tục mua sắm</Link>
            </Button>
        </aside>
    );
};

export default CartSummary;
