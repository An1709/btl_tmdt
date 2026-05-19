import { Link } from "react-router";
import { useMemo, useState } from "react";
import { useCartStore } from "@/stores/useCartStore";
import CartItemComponent from "@/components/features/cart/CartItem";
import CartSummary from "@/components/features/cart/CartSummary";
import { toast } from "sonner";

const CartPage = () => {
    const { items, clearCart, currentUserId } = useCartStore();
    const [selectionState, setSelectionState] = useState<{ userId: string | null; productIds: string[] }>({
        userId: currentUserId,
        productIds: [],
    });
    const selectedProductIds = useMemo(
        () => selectionState.userId === currentUserId ? selectionState.productIds : [],
        [currentUserId, selectionState],
    );

    const cartProductIds = useMemo(() => items.map((item) => item.product.id), [items]);
    const validSelectedProductIds = useMemo(
        () => selectedProductIds.filter((productId) => cartProductIds.includes(productId)),
        [cartProductIds, selectedProductIds],
    );
    const selectedItems = useMemo(
        () => items.filter((item) => validSelectedProductIds.includes(item.product.id)),
        [items, validSelectedProductIds],
    );
    const selectedCount = selectedItems.reduce((sum, item) => sum + item.quantity, 0);
    const selectedSubtotal = selectedItems.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
    const allSelected = items.length > 0 && validSelectedProductIds.length === items.length;

    const handleClearCart = async () => {
        try {
            await clearCart();
            setSelectionState({ userId: currentUserId, productIds: [] });
        } catch {
            toast.error("Không thể xóa giỏ hàng. Vui lòng thử lại.");
        }
    };

    const toggleItem = (productId: string, selected: boolean) => {
        setSelectionState((current) => {
            const currentIds = current.userId === currentUserId ? current.productIds : [];
            if (selected) {
                return {
                    userId: currentUserId,
                    productIds: [...new Set([...currentIds, productId])],
                };
            }
            return {
                userId: currentUserId,
                productIds: currentIds.filter((id) => id !== productId),
            };
        });
    };

    const toggleAll = (selected: boolean) => {
        setSelectionState({ userId: currentUserId, productIds: selected ? cartProductIds : [] });
    };

    if (items.length === 0) {
        return (
            <div className="max-w-7xl mx-auto px-4 py-24 text-center">
                <div className="text-6xl mb-4">🛒</div>
                <h1 className="section-title mb-2">Giỏ hàng trống</h1>
                <p className="text-muted-foreground text-sm mb-6">Chưa có sản phẩm nào trong giỏ hàng.</p>
                <Link to="/shop" className="btn-pet-primary inline-flex">🛍️ Khám phá ngay</Link>
            </div>
        );
    }

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="flex items-center justify-between mb-6">
                <h1 className="section-title">🛒 Giỏ Hàng ({items.length})</h1>
                <button
                    onClick={handleClearCart}
                    className="text-sm text-muted-foreground hover:text-red-500 transition-colors underline underline-offset-2"
                >
                    Xóa tất cả
                </button>
            </div>

            <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-white dark:bg-card px-4 py-3 shadow-sm">
                <label className="flex items-center gap-2 text-sm font-semibold text-foreground cursor-pointer">
                    <input
                        type="checkbox"
                        checked={allSelected}
                        onChange={(event) => toggleAll(event.target.checked)}
                        className="w-4 h-4 accent-[var(--pet-coral)]"
                    />
                    Chọn tất cả
                </label>
                <span className="text-sm text-muted-foreground">
                    Đã chọn <strong className="text-[var(--pet-coral)]">{selectedCount}</strong> sản phẩm
                </span>
            </div>

            <div className="flex flex-col lg:flex-row gap-6">
                {/* Items list */}
                <div className="flex-1 flex flex-col gap-4">
                    {items.map((item) => (
                        <CartItemComponent
                            key={item.product.id}
                            item={item}
                            selected={validSelectedProductIds.includes(item.product.id)}
                            onSelectChange={toggleItem}
                        />
                    ))}
                </div>

                {/* Summary */}
                <div className="w-full lg:w-80 shrink-0">
                    <CartSummary
                        subtotal={selectedSubtotal}
                        count={selectedCount}
                        selectedProductIds={validSelectedProductIds}
                    />
                </div>
            </div>
        </div>
    );
};

export default CartPage;
