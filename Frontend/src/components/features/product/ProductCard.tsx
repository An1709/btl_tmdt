import { useState } from "react";
import { Link } from "react-router";
import type { Product } from "@/types/product";
import { useCartStore } from "@/stores/useCartStore";

interface ProductCardProps {
    product: Product;
}

const formatPrice = (price: number) =>
    price.toLocaleString("vi-VN") + "₫";

const StarRating = ({ rating, reviewCount }: { rating: number; reviewCount: number }) => {
    return (
        <div className="flex items-center gap-0.5">
            {[1, 2, 3, 4, 5].map((star) => (
                <svg
                    key={star}
                    className={`w-3.5 h-3.5 ${star <= Math.round(rating) ? "text-amber-400" : "text-gray-200"}`}
                    fill="currentColor"
                    viewBox="0 0 20 20"
                >
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
            ))}
            <span className="text-xs text-muted-foreground ml-1">({reviewCount})</span>
        </div>
    );
};

// Badge map
const badgeConfig = {
    new: { label: "MỚI", className: "badge-new" },
    hot: { label: "🔥 HOT", className: "badge-hot" },
    sale: { label: "SALE", className: "badge-sale" },
};

const ProductCard = ({ product }: ProductCardProps) => {
    const addItem = useCartStore((s) => s.addItem);
    const [added, setAdded] = useState(false);
    const [wishlisted, setWishlisted] = useState(false);

    const handleAddToCart = () => {
        addItem(product);
        setAdded(true);
        setTimeout(() => setAdded(false), 1500);
    };

    return (
        <article className="pet-card flex flex-col group">
            {/* ===== IMAGE ===== */}
            <div className="relative overflow-hidden aspect-square bg-muted/30">
                <img
                    src={product.image}
                    alt={product.name}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                    loading="lazy"
                />

                {/* Badge */}
                {product.badge && (
                    <div className={`absolute top-3 left-3 ${badgeConfig[product.badge].className}`}>
                        {badgeConfig[product.badge].label}
                    </div>
                )}

                {/* Wishlist */}
                <button
                    onClick={() => setWishlisted((p) => !p)}
                    aria-label="Yêu thích"
                    className={`absolute top-3 right-3 w-8 h-8 rounded-full flex items-center justify-center
                     transition-all duration-200 hover:scale-110
                     ${wishlisted
                            ? "bg-red-500 text-white shadow-md"
                            : "bg-white/90 dark:bg-card/90 text-muted-foreground hover:text-red-500 hover:bg-white"
                        }`}
                >
                    <svg className="w-4 h-4" fill={wishlisted ? "currentColor" : "none"} stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round"
                            d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                    </svg>
                </button>

                {/* Out of stock overlay */}
                {!product.inStock && (
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                        <span className="bg-white text-foreground text-xs font-bold px-3 py-1 rounded-full">Hết hàng</span>
                    </div>
                )}
            </div>

            {/* ===== BODY ===== */}
            <div className="flex flex-col gap-2 p-4 flex-1">
                {/* Name */}
                <h3 className="font-bold text-foreground text-base leading-tight line-clamp-1 group-hover:text-[var(--pet-coral)] transition-colors duration-200"
                    style={{ fontFamily: "'Nunito', sans-serif" }}>
                    {product.name}
                </h3>

                {/* Breed & Age */}
                <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                    <span>🏷️ {product.breed}</span>
                    {product.age && <><span className="opacity-40">•</span><span>⏰ {product.age}</span></>}
                </p>

                {/* Rating */}
                <StarRating rating={product.rating} reviewCount={product.reviewCount} />


                {/* Price */}
                <div className="flex items-baseline gap-2 mt-auto pt-1">
                    <span className="text-lg font-extrabold text-[var(--pet-coral)]">
                        {formatPrice(product.price)}
                    </span>
                    {product.originalPrice && (
                        <span className="text-xs text-muted-foreground line-through">
                            {formatPrice(product.originalPrice)}
                        </span>
                    )}
                    {product.originalPrice && (
                        <span className="text-xs font-semibold text-emerald-600 ml-auto">
                            -{Math.round((1 - product.price / product.originalPrice) * 100)}%
                        </span>
                    )}
                </div>

                {/* Buttons */}
                <div className="flex gap-2 mt-2">
                    <Link
                        to={`/product/${product.id}`}
                        className="btn-pet-secondary flex-1 justify-center text-xs py-2"
                    >
                        Xem chi tiết
                    </Link>
                    <button
                        onClick={handleAddToCart}
                        disabled={!product.inStock || added}
                        className={`flex-1 justify-center text-xs py-2 rounded-xl font-semibold
                       flex items-center gap-1.5 transition-all duration-200
                       ${added
                                ? "bg-emerald-500 text-white shadow-sm"
                                : "btn-pet-primary py-2"
                            }
                       disabled:opacity-50 disabled:cursor-not-allowed`}
                    >
                        {added ? (
                            <>
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                </svg>
                                Đã thêm!
                            </>
                        ) : (
                            <>
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                        d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                                </svg>
                                Thêm vào giỏ
                            </>
                        )}
                    </button>
                </div>
            </div>
        </article>
    );
};

// StarRating is defined inline but we need product in scope so re-export correctly
// Attaching StarRating to ProductCard for potential re-use
export { StarRating };
export default ProductCard;