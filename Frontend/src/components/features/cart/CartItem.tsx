import { useState } from "react";
import { Minus, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import type { CartItem as ICartItem } from "@/types/product";
import { useCartStore } from "@/stores/useCartStore";
import { formatCurrency } from "@/utils/format";
import { IMAGE_ASSETS } from "@/utils/constants";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";

interface CartItemProps {
    item: ICartItem;
    selected?: boolean;
    onSelectChange?: (productId: string, selected: boolean) => void;
}

const CartItemComponent = ({ item, selected = false, onSelectChange }: CartItemProps) => {
    const { updateQty, removeItem } = useCartStore();
    const { product, quantity } = item;
    const [updating, setUpdating] = useState(false);
    const [removing, setRemoving] = useState(false);

    const handleRemove = async () => {
        if (removing || updating) return;
        setRemoving(true);
        try {
            await removeItem(product.id);
        } catch {
            toast.error("Không thể xóa sản phẩm khỏi giỏ hàng.");
        } finally {
            setRemoving(false);
        }
    };

    const handleUpdateQty = async (nextQuantity: number) => {
        if (updating || removing) return;
        setUpdating(true);
        try {
            await updateQty(product.id, nextQuantity);
        } catch {
            toast.error("Không thể cập nhật giỏ hàng.");
        } finally {
            setUpdating(false);
        }
    };

    return (
        <article className={`grid gap-4 rounded-lg border bg-surface-elevated p-4 shadow-elevation-1 transition-colors sm:grid-cols-[auto_6.5rem_minmax(0,1fr)_auto] sm:items-center ${selected ? "border-primary/45 bg-primary-subtle/35" : "border-border"}`}>
            <label className="flex min-h-11 cursor-pointer items-center gap-3 sm:self-stretch" aria-label={`Chọn ${product.name} để thanh toán`}>
                <Checkbox
                    checked={selected}
                    onChange={(event) => onSelectChange?.(product.id, event.target.checked)}
                    disabled={removing}
                />
                <span className="text-sm font-medium sm:sr-only">Chọn sản phẩm</span>
            </label>

            <div className="aspect-square w-full max-w-28 overflow-hidden rounded-md bg-surface-subtle sm:w-[6.5rem]">
                <img
                    src={product.image || IMAGE_ASSETS.placeholder}
                    alt={product.name}
                    onError={(event) => { event.currentTarget.src = IMAGE_ASSETS.placeholder; }}
                    className="size-full object-cover"
                />
            </div>

            <div className="min-w-0">
                <h2 className="line-clamp-2 text-base font-semibold leading-6 text-text-strong">{product.name}</h2>
                {(product.breed || product.age) && (
                    <p className="mt-1 text-sm text-muted-foreground">{[product.breed, product.age].filter(Boolean).join(" · ")}</p>
                )}
                <p className="mt-2 text-sm font-semibold text-primary">
                    {formatCurrency(product.price)} <span className="font-normal text-muted-foreground">/ sản phẩm</span>
                </p>
                <p className={`mt-1 text-xs font-medium ${product.inStock ? "text-success" : "text-destructive"}`}>
                    {product.inStock ? "Còn hàng" : "Tạm hết hàng"}
                </p>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-divider pt-4 sm:flex-col sm:items-end sm:border-0 sm:pt-0">
                <div className="flex items-center overflow-hidden rounded-md border border-border-strong bg-surface" aria-label={`Số lượng ${product.name}`}>
                    <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => { void handleUpdateQty(quantity - 1); }}
                        disabled={updating || removing}
                        aria-label={quantity === 1 ? `Xóa ${product.name} khỏi giỏ hàng` : `Giảm số lượng ${product.name}`}
                        className="rounded-none"
                    >
                        <Minus aria-hidden="true" />
                    </Button>
                    <output aria-live="polite" className="min-w-11 border-x border-divider px-3 py-2 text-center text-sm font-semibold text-text-strong">
                        {quantity}
                    </output>
                    <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => { void handleUpdateQty(quantity + 1); }}
                        disabled={updating || removing}
                        aria-label={`Tăng số lượng ${product.name}`}
                        className="rounded-none"
                    >
                        <Plus aria-hidden="true" />
                    </Button>
                </div>

                <div className="text-right">
                    <p className="text-xs text-muted-foreground">Thành tiền</p>
                    <p className="mt-0.5 font-bold text-text-strong">{formatCurrency(product.price * quantity)}</p>
                </div>

                <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => { void handleRemove(); }}
                    loading={removing}
                    disabled={updating}
                    className="text-destructive hover:bg-destructive-subtle hover:text-destructive"
                >
                    <Trash2 aria-hidden="true" />
                    Xóa
                </Button>
            </div>
        </article>
    );
};

export default CartItemComponent;
