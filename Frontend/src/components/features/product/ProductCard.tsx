import { useEffect, useState } from "react";
import { Heart, ShoppingCart } from "lucide-react";
import { Link, useNavigate } from "react-router";
import type { Product } from "@/types/product";
import { useCartStore } from "@/stores/useCartStore";
import { useAuthStore } from "@/stores/useAuthStore";
import { toast } from "sonner";
import { collectionService } from "@/services/collectionService";
import { calculateDiscountPercent } from "@/utils/format";
import { IMAGE_ASSETS } from "@/utils/constants";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface ProductCardProps {
    product: Product;
    onWishlistChange?: (productId: string, wishlisted: boolean) => void;
}

const formatPrice = (price: number) => `${price.toLocaleString("vi-VN")}₫`;

const StarRating = ({ rating, reviewCount }: { rating: number; reviewCount: number }) => {
    if (reviewCount <= 0) return <span className="text-xs text-muted-foreground">Chưa có đánh giá</span>;

    return (
        <div className="flex items-center gap-1" aria-label={`${rating.toFixed(1)} trên 5 sao, ${reviewCount} đánh giá`}>
            <span aria-hidden="true" className="flex items-center gap-0.5">
                {[1, 2, 3, 4, 5].map((star) => (
                    <svg
                        key={star}
                        className={`size-3.5 ${star <= Math.round(rating) ? "text-warning" : "text-border-strong"}`}
                        fill="currentColor"
                        viewBox="0 0 20 20"
                    >
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                ))}
            </span>
            <span className="text-xs text-muted-foreground">{rating.toFixed(1)} ({reviewCount})</span>
        </div>
    );
};

const badgeConfig = {
    new: { label: "Mới", tone: "success" as const },
    hot: { label: "Nổi bật", tone: "error" as const },
    sale: { label: "Giảm giá", tone: "warning" as const },
};

const ProductCard = ({ product, onWishlistChange }: ProductCardProps) => {
    const addItem = useCartStore((state) => state.addItem);
    const { user } = useAuthStore();
    const navigate = useNavigate();
    const detailPath = `/product/${product.id}`;
    const discount = calculateDiscountPercent(product.price, product.originalPrice);
    const hasDiscount = discount >= 1;
    const productImage = product.image || IMAGE_ASSETS.placeholder;
    const [added, setAdded] = useState(false);
    const [wishlisted, setWishlisted] = useState(false);
    const [updatingWishlist, setUpdatingWishlist] = useState(false);

    useEffect(() => {
        let cancelled = false;

        if (!user) {
            setWishlisted(false);
            return;
        }

        collectionService.getWishlist()
            .then((products) => {
                if (!cancelled) setWishlisted(products.some((item) => item.id === product.id));
            })
            .catch(() => {
                if (!cancelled) setWishlisted(false);
            });

        return () => { cancelled = true; };
    }, [product.id, user]);

    const handleAddToCart = async () => {
        if (!user) {
            toast.error("Vui lòng đăng nhập để thêm vào giỏ hàng!");
            navigate("/signin");
            return;
        }
        try {
            await addItem(product);
            setAdded(true);
            setTimeout(() => setAdded(false), 1500);
            toast.success("Đã thêm vào giỏ hàng.");
        } catch {
            toast.error("Không thể thêm vào giỏ hàng. Vui lòng thử lại.");
        }
    };

    const handleToggleWishlist = async () => {
        if (!user) {
            toast.error("Vui lòng đăng nhập để thêm vào yêu thích!");
            navigate("/signin");
            return;
        }

        setUpdatingWishlist(true);
        try {
            if (wishlisted) {
                await collectionService.removeFromWishlist(product.id);
                setWishlisted(false);
                onWishlistChange?.(product.id, false);
                toast.success("Đã xóa khỏi danh sách yêu thích.");
            } else {
                await collectionService.addToWishlist(product.id);
                setWishlisted(true);
                onWishlistChange?.(product.id, true);
                toast.success("Đã thêm vào yêu thích.");
            }
        } catch (error) {
            const message =
                error && typeof error === "object" && "response" in error
                    ? (error as { response?: { data?: { message?: string } } }).response?.data?.message
                    : undefined;
            toast.error(message ?? "Không thể cập nhật yêu thích. Vui lòng thử lại.");
        } finally {
            setUpdatingWishlist(false);
        }
    };

    return (
        <article className="pet-card group flex h-full flex-col">
            <div className="relative aspect-square overflow-hidden bg-surface-subtle">
                <Link to={detailPath} aria-label={`Xem chi tiết ${product.name}`} className="block size-full">
                    <img
                        src={productImage}
                        alt={product.name}
                        onError={(event) => {
                            event.currentTarget.src = IMAGE_ASSETS.placeholder;
                        }}
                        className="size-full object-cover transition-transform duration-slow ease-standard group-hover:scale-105"
                        loading="lazy"
                    />
                </Link>

                {product.badge && (product.badge !== "sale" || hasDiscount) && (
                    <Badge tone={badgeConfig[product.badge].tone} className="absolute left-3 top-3 shadow-elevation-1">
                        {badgeConfig[product.badge].label}
                    </Badge>
                )}

                <button
                    type="button"
                    onClick={handleToggleWishlist}
                    disabled={updatingWishlist}
                    aria-label={wishlisted ? `Bỏ ${product.name} khỏi yêu thích` : `Thêm ${product.name} vào yêu thích`}
                    aria-pressed={wishlisted}
                    className={`absolute right-3 top-3 flex size-11 items-center justify-center rounded-full shadow-elevation-1 transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${
                        wishlisted ? "bg-destructive text-destructive-foreground" : "bg-surface-elevated text-muted-foreground hover:text-destructive"
                    }`}
                >
                    <Heart aria-hidden="true" className="size-5" fill={wishlisted ? "currentColor" : "none"} />
                </button>

                {!product.inStock && (
                    <div className="absolute inset-0 flex items-center justify-center bg-overlay/65">
                        <Badge tone="neutral" className="bg-surface-elevated text-text-strong">Hết hàng</Badge>
                    </div>
                )}
            </div>

            <div className="flex min-h-56 flex-1 flex-col gap-3 p-4">
                <div>
                    <Link to={detailPath} className="rounded-sm outline-none focus-visible:ring-[3px] focus-visible:ring-focus/45">
                        <h3 className="line-clamp-2 min-h-10 text-base font-semibold leading-5 text-text-strong transition-colors hover:text-primary">
                            {product.name}
                        </h3>
                    </Link>
                    {(product.breed || product.age) && (
                        <p className="mt-2 line-clamp-1 text-xs text-muted-foreground">
                            {[product.breed, product.age].filter(Boolean).join(" · ")}
                        </p>
                    )}
                </div>

                <StarRating rating={product.rating} reviewCount={product.reviewCount} />

                <div className="mt-auto">
                    <div className="flex min-h-7 flex-wrap items-baseline gap-x-2 gap-y-1">
                        <span className="text-lg font-bold text-primary">{formatPrice(product.price)}</span>
                        {hasDiscount && product.originalPrice && <span className="text-xs text-muted-foreground line-through">{formatPrice(product.originalPrice)}</span>}
                        {hasDiscount && <span className="text-xs font-semibold text-success">-{discount}%</span>}
                    </div>
                    <p className={`mt-1 text-xs font-medium ${product.inStock ? "text-success" : "text-destructive"}`}>
                        {product.inStock ? "Còn hàng" : "Tạm hết hàng"}
                    </p>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-1">
                    <Button asChild variant="outline" size="sm" className="w-full">
                        <Link to={detailPath}>Chi tiết</Link>
                    </Button>
                    <Button
                        type="button"
                        size="sm"
                        onClick={handleAddToCart}
                        disabled={!product.inStock || added}
                        className="w-full"
                    >
                        {added ? "Đã thêm" : <><ShoppingCart aria-hidden="true" /> Thêm giỏ</>}
                    </Button>
                </div>
            </div>
        </article>
    );
};

export { StarRating };
export default ProductCard;
