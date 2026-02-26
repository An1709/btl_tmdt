import { Link } from "react-router";
import { useCartStore } from "@/stores/useCartStore";
import CartItemComponent from "@/components/features/cart/CartItem";
import CartSummary from "@/components/features/cart/CartSummary";

const CartPage = () => {
    const { items, clearCart } = useCartStore();

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
                    onClick={clearCart}
                    className="text-sm text-muted-foreground hover:text-red-500 transition-colors underline underline-offset-2"
                >
                    Xóa tất cả
                </button>
            </div>

            <div className="flex flex-col lg:flex-row gap-6">
                {/* Items list */}
                <div className="flex-1 flex flex-col gap-4">
                    {items.map((item) => (
                        <CartItemComponent key={item.product.id} item={item} />
                    ))}
                </div>

                {/* Summary */}
                <div className="w-full lg:w-80 shrink-0">
                    <CartSummary />
                </div>
            </div>
        </div>
    );
};

export default CartPage;