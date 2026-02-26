import type { CartItem as ICartItem } from "@/types/product";
import { useCartStore } from "@/stores/useCartStore";
import { formatCurrency } from "@/utils/format";

interface CartItemProps {
    item: ICartItem;
}

const CartItemComponent = ({ item }: CartItemProps) => {
    const { updateQty, removeItem } = useCartStore();
    const { product, quantity } = item;

    return (
        <div className="flex items-start gap-4 p-4 bg-white dark:bg-card rounded-2xl border border-border shadow-sm">
            {/* Image */}
            <div className="w-20 h-20 rounded-xl overflow-hidden shrink-0 bg-muted/30">
                <img
                    src={product.image}
                    alt={product.name}
                    className="w-full h-full object-cover"
                />
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
                <h4 className="font-bold text-sm text-foreground line-clamp-1"
                    style={{ fontFamily: "'Nunito', sans-serif" }}>
                    {product.name}
                </h4>
                <p className="text-xs text-muted-foreground mt-0.5">{product.breed} · {product.age}</p>
                <p className="text-sm font-extrabold text-[var(--pet-coral)] mt-1">
                    {formatCurrency(product.price)}
                </p>
            </div>

            {/* Controls */}
            <div className="flex flex-col items-end gap-2 shrink-0">
                {/* Remove */}
                <button
                    onClick={() => removeItem(product.id)}
                    className="p-1.5 rounded-lg text-muted-foreground hover:text-red-500 hover:bg-red-50 transition-all"
                    aria-label="Xóa"
                >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                </button>

                {/* Qty stepper */}
                <div className="flex items-center border border-border rounded-xl overflow-hidden">
                    <button
                        onClick={() => updateQty(product.id, quantity - 1)}
                        className="px-2.5 py-1.5 text-sm font-bold text-muted-foreground hover:bg-muted transition-all"
                    >
                        −
                    </button>
                    <span className="px-3 py-1.5 text-sm font-bold text-foreground border-x border-border min-w-[36px] text-center">
                        {quantity}
                    </span>
                    <button
                        onClick={() => updateQty(product.id, quantity + 1)}
                        className="px-2.5 py-1.5 text-sm font-bold text-muted-foreground hover:bg-muted transition-all"
                    >
                        +
                    </button>
                </div>

                {/* Line total */}
                <p className="text-xs font-semibold text-muted-foreground">
                    = {formatCurrency(product.price * quantity)}
                </p>
            </div>
        </div>
    );
};

export default CartItemComponent;