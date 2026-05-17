import { useParams, Link, useNavigate } from "react-router";
import { useState, useEffect, useCallback } from "react";
import { productService } from "@/services/productService";
import type { Product } from "@/types/product";
import { useCartStore } from "@/stores/useCartStore";
import { useAuthStore } from "@/stores/useAuthStore";
import { formatCurrency } from "@/utils/format";
import ProductReviews from "@/components/features/product/ProductReviews";
import { toast } from "sonner";
import { collectionService } from "@/services/collectionService";

// ── Detail page skeleton ──────────────────────────────────────────────────
const DetailSkeleton = () => (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-pulse">
        {/* Breadcrumb */}
        <div className="flex gap-2 mb-6">
            {[80, 20, 140].map((w, i) => (
                <div key={i} className="h-3 bg-muted rounded" style={{ width: `${w}px` }} />
            ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
            <div className="bg-muted rounded-3xl aspect-square w-full" />
            <div className="flex flex-col gap-4">
                <div className="h-5 bg-muted rounded w-1/4" />
                <div className="h-9 bg-muted rounded w-3/4" />
                <div className="h-4 bg-muted rounded w-1/2" />
                <div className="h-8 bg-muted rounded w-1/3" />
                <div className="h-20 bg-muted rounded" />
                <div className="h-12 bg-muted rounded-2xl" />
            </div>
        </div>
    </div>
);

const ProductDetailPage = () => {
    const { id } = useParams<{ id: string }>();
    const addItem = useCartStore((s) => s.addItem);
    const { user } = useAuthStore();
    const navigate = useNavigate();

    const [product, setProduct] = useState<Product | null>(null);
    const [loading, setLoading] = useState(true);
    const [notFound, setNotFound] = useState(false);
    const [qty, setQty] = useState(1);
    const [added, setAdded] = useState(false);
    const [wishlisted, setWishlisted] = useState(false);
    const [updatingWishlist, setUpdatingWishlist] = useState(false);

    const loadProduct = useCallback(() => {
        if (!id) return Promise.resolve();
        setLoading(true);
        setNotFound(false);

        return productService.getById(id)
            .then((p) => setProduct(p))
            .catch(() => setNotFound(true))
            .finally(() => setLoading(false));
    }, [id]);

    useEffect(() => {
        if (!id) return;
        let cancelled = false;

        void Promise.resolve().then(() => {
            if (cancelled) return;
            setLoading(true);
            setNotFound(false);

            productService.getById(id)
                .then((p) => { if (!cancelled) setProduct(p); })
                .catch(() => { if (!cancelled) setNotFound(true); })
                .finally(() => { if (!cancelled) setLoading(false); });
        });

        return () => { cancelled = true; };
    }, [id]);

    useEffect(() => {
        let cancelled = false;

        if (!user || !product) {
            setWishlisted(false);
            return;
        }

        collectionService.getWishlist()
            .then((products) => {
                if (!cancelled) {
                    setWishlisted(products.some((item) => item.id === product.id));
                }
            })
            .catch(() => {
                if (!cancelled) setWishlisted(false);
            });

        return () => { cancelled = true; };
    }, [product, user]);

    if (loading) return <DetailSkeleton />;

    if (notFound || !product) {
        return (
            <div className="max-w-7xl mx-auto px-4 py-24 text-center">
                <div className="text-6xl mb-4">😿</div>
                <h1 className="section-title mb-2">Không tìm thấy sản phẩm</h1>
                <Link to="/shop" className="btn-pet-primary inline-flex">← Quay lại cửa hàng</Link>
            </div>
        );
    }

    const handleAdd = async () => {
        if (!user) {
            toast.error("Vui lòng đăng nhập để thêm vào giỏ hàng!");
            navigate("/signin");
            return;
        }
        try {
            await addItem(product, qty);
            toast.success(`Đã thêm ${qty} "${product.name}" vào giỏ hàng!`);
            setAdded(true);
            setTimeout(() => setAdded(false), 2000);
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
                toast.success("Đã xóa khỏi danh sách yêu thích.");
            } else {
                await collectionService.addToWishlist(product.id);
                setWishlisted(true);
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

    const discount = product.originalPrice
        ? Math.round((1 - product.price / product.originalPrice) * 100)
        : 0;

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {/* Breadcrumb */}
            <nav className="flex items-center gap-2 text-sm text-muted-foreground mb-6">
                <Link to="/" className="hover:text-[var(--pet-coral)] transition-colors">Trang chủ</Link>
                <span>/</span>
                <Link to="/shop" className="hover:text-[var(--pet-coral)] transition-colors">Cửa hàng</Link>
                <span>/</span>
                <span className="text-foreground font-medium line-clamp-1">{product.name}</span>
            </nav>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 mb-12">
                {/* Image */}
                <div className="rounded-3xl overflow-hidden border border-border shadow-sm aspect-square">
                    <img src={product.image} alt={product.name} className="w-full h-full object-cover" />
                </div>

                {/* Info */}
                <div className="flex flex-col gap-5">
                    {product.badge && (
                        <span className={`badge-${product.badge} self-start`}>
                            {product.badge === "new" ? "Mới" : product.badge === "hot" ? "🔥 Hot" : `−${discount}%`}
                        </span>
                    )}

                    <h1 className="text-3xl font-black text-foreground" style={{ fontFamily: "'Nunito', sans-serif" }}>
                        {product.name}
                    </h1>

                    {product.breed && (
                        <p className="text-muted-foreground text-sm">
                            🐾 Giống: <strong>{product.breed}</strong>
                            {product.age && <> · Tuổi: <strong>{product.age}</strong></>}
                        </p>
                    )}

                    {/* Rating */}
                    <div className="flex items-center gap-2">
                        <div className="flex">
                            {[1, 2, 3, 4, 5].map((s) => (
                                <svg key={s} className={`w-5 h-5 ${s <= Math.round(product.rating) ? "text-amber-400" : "text-gray-200"}`} fill="currentColor" viewBox="0 0 20 20">
                                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                </svg>
                            ))}
                        </div>
                        <span className="text-sm text-muted-foreground">({product.reviewCount} đánh giá)</span>
                    </div>

                    {/* Price */}
                    <div className="flex items-baseline gap-3">
                        <span className="text-3xl font-black text-[var(--pet-coral)]">{formatCurrency(product.price)}</span>
                        {product.originalPrice && (
                            <span className="text-lg text-muted-foreground line-through">{formatCurrency(product.originalPrice)}</span>
                        )}
                        {discount > 0 && (
                            <span className="bg-red-100 text-red-600 text-sm font-bold px-2 py-0.5 rounded-lg">−{discount}%</span>
                        )}
                    </div>

                    {/* Description */}
                    <p className="text-muted-foreground text-sm leading-relaxed border-t border-border pt-4">
                        {product.description}
                    </p>

                    {/* Stock status */}
                    <div className={`flex items-center gap-2 text-sm font-semibold ${product.inStock ? "text-emerald-600" : "text-red-500"}`}>
                        <span className={`w-2 h-2 rounded-full ${product.inStock ? "bg-emerald-400" : "bg-red-400"}`} />
                        {product.inStock ? "Còn hàng" : "Hết hàng"}
                    </div>

                    {/* Qty + Cart */}
                    {product.inStock && (
                        <div className="flex gap-3 items-center flex-wrap">
                            <div className="flex items-center border border-border rounded-2xl overflow-hidden">
                                <button onClick={() => setQty((q) => Math.max(1, q - 1))} className="px-4 py-3 text-muted-foreground hover:bg-muted font-bold transition-all">−</button>
                                <span className="px-4 py-3 font-bold text-foreground border-x border-border">{qty}</span>
                                <button onClick={() => setQty((q) => q + 1)} className="px-4 py-3 text-muted-foreground hover:bg-muted font-bold transition-all">+</button>
                            </div>
                            <button
                                id="detail-add-cart"
                                onClick={handleAdd}
                                className={`btn-pet-primary flex-1 justify-center transition-all ${added ? "bg-emerald-500" : ""}`}
                            >
                                {added ? "✓ Đã thêm!" : "🛒 Thêm vào giỏ"}
                            </button>
                            <button
                                type="button"
                                onClick={handleToggleWishlist}
                                disabled={updatingWishlist}
                                className={`px-4 py-3 rounded-2xl font-semibold transition-all disabled:opacity-50 ${
                                    wishlisted
                                        ? "bg-red-500 text-white"
                                        : "border border-border text-muted-foreground hover:text-red-500 hover:bg-red-50"
                                }`}
                                aria-label="Yêu thích"
                            >
                                ♥
                            </button>
                        </div>
                    )}

                    {/* Features */}
                    <div className="grid grid-cols-3 gap-3 mt-2">
                        {[["🚚", "Giao hàng 24h"], ["🛡️", "BH 30 ngày"], ["🐾", "Kiểm dịch"]].map(([icon, text]) => (
                            <div key={text} className="flex flex-col items-center gap-1 p-3 bg-muted/30 rounded-2xl text-center">
                                <span className="text-xl">{icon}</span>
                                <span className="text-xs text-muted-foreground font-medium">{text}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Reviews */}
            <ProductReviews
                productId={product.id}
                reviews={product.reviews}
                averageRating={product.rating}
                onReviewAdded={() => { void loadProduct(); }}
            />
        </div>
    );
};

export default ProductDetailPage;
