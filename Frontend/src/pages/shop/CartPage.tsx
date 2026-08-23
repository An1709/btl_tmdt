import { useMemo, useState } from "react";
import { LoaderCircle, ShoppingBag, Trash2 } from "lucide-react";
import { Link } from "react-router";
import { toast } from "sonner";
import { useCartStore } from "@/stores/useCartStore";
import CartItemComponent from "@/components/features/cart/CartItem";
import CartSummary from "@/components/features/cart/CartSummary";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { EmptyState } from "@/components/ui/feedback-state";

const CartPage = () => {
    const { items, clearCart, currentUserId, loading } = useCartStore();
    const [clearing, setClearing] = useState(false);
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
    const someSelected = validSelectedProductIds.length > 0 && !allSelected;

    const handleClearCart = async () => {
        if (clearing) return;
        setClearing(true);
        try {
            await clearCart();
            setSelectionState({ userId: currentUserId, productIds: [] });
        } catch {
            toast.error("Không thể xóa giỏ hàng. Vui lòng thử lại.");
        } finally {
            setClearing(false);
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

    if (loading && items.length === 0) {
        return (
            <section className="page-container flex min-h-[28rem] items-center justify-center" role="status" aria-live="polite">
                <h1 className="sr-only">Giỏ hàng</h1>
                <div className="flex items-center gap-3 text-sm text-muted-foreground">
                    <LoaderCircle aria-hidden="true" className="size-5 animate-spin" />
                    Đang tải giỏ hàng…
                </div>
            </section>
        );
    }

    if (items.length === 0) {
        return (
            <section className="page-container py-16 sm:py-24">
                <h1 className="sr-only">Giỏ hàng</h1>
                <EmptyState
                    icon={<ShoppingBag className="size-7" />}
                    title="Giỏ hàng đang trống"
                    description="Khám phá sản phẩm phù hợp và thêm vào giỏ để bắt đầu đặt hàng."
                    action={(
                        <Button asChild>
                            <Link to="/shop">Khám phá sản phẩm</Link>
                        </Button>
                    )}
                />
            </section>
        );
    }

    return (
        <section className="page-container py-8 sm:py-10">
            <header className="mb-7 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <div>
                    <p className="text-sm font-semibold text-primary">Giỏ hàng của bạn</p>
                    <h1 className="mt-1 text-3xl font-bold tracking-tight text-text-strong">Kiểm tra sản phẩm trước khi thanh toán</h1>
                    <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
                        Chỉ những sản phẩm bạn chọn mới được chuyển sang bước thanh toán.
                    </p>
                </div>
                <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => { void handleClearCart(); }}
                    loading={clearing}
                    className="self-start text-destructive hover:bg-destructive-subtle hover:text-destructive sm:self-auto"
                >
                    <Trash2 aria-hidden="true" />
                    Xóa tất cả
                </Button>
            </header>

            <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-surface-elevated px-4 py-3 shadow-elevation-1">
                <label className="flex min-h-11 cursor-pointer items-center gap-3 text-sm font-semibold text-text-strong">
                    <Checkbox
                        checked={allSelected}
                        aria-checked={someSelected ? "mixed" : allSelected}
                        onChange={(event) => toggleAll(event.target.checked)}
                    />
                    Chọn tất cả {items.length} mặt hàng
                </label>
                <p className="text-sm text-muted-foreground" aria-live="polite">
                    Đã chọn <strong className="text-text-strong">{selectedCount}</strong> sản phẩm
                </p>
            </div>

            <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-start">
                <section className="flex min-w-0 flex-col gap-4" aria-label="Sản phẩm trong giỏ hàng">
                    {items.map((item) => (
                        <CartItemComponent
                            key={item.product.id}
                            item={item}
                            selected={validSelectedProductIds.includes(item.product.id)}
                            onSelectChange={toggleItem}
                        />
                    ))}
                </section>

                <CartSummary
                    subtotal={selectedSubtotal}
                    count={selectedCount}
                    selectedProductIds={validSelectedProductIds}
                />
            </div>
        </section>
    );
};

export default CartPage;
