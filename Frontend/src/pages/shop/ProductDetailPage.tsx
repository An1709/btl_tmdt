import { useParams, Link, useNavigate } from "react-router";
import { useState, useEffect, useCallback } from "react";
import { productService } from "@/services/productService";
import type { Product } from "@/types/product";
import { useCartStore } from "@/stores/useCartStore";
import { useAuthStore } from "@/stores/useAuthStore";
import { calculateDiscountPercent, formatCurrency } from "@/utils/format";
import ProductReviews from "@/components/features/product/ProductReviews";
import ProductCard from "@/components/features/product/ProductCard";
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
    const addCombo = useCartStore((s) => s.addCombo);
    const { user } = useAuthStore();
    const navigate = useNavigate();

    const [product, setProduct] = useState<Product | null>(null);
    const [loading, setLoading] = useState(true);
    const [notFound, setNotFound] = useState(false);
    const [qty, setQty] = useState(1);
    const [added, setAdded] = useState(false);
    const [wishlisted, setWishlisted] = useState(false);
    const [updatingWishlist, setUpdatingWishlist] = useState(false);
    const [recommendations, setRecommendations] = useState<Product[]>([]);
    const [recommendationsLoading, setRecommendationsLoading] = useState(false);
    const [recommendationsError, setRecommendationsError] = useState("");
    const [comboProducts, setComboProducts] = useState<Product[]>([]);
    const [selectedComboIds, setSelectedComboIds] = useState<Set<string>>(new Set());
    const [comboLoading, setComboLoading] = useState(false);
    const [comboError, setComboError] = useState("");
    const [addingCombo, setAddingCombo] = useState(false);

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

    useEffect(() => {
        if (!id) return;
        let cancelled = false;

        void Promise.resolve().then(() => {
            if (cancelled) return;
            setRecommendations([]);
            setRecommendationsError("");
            setRecommendationsLoading(true);

            productService.getRecommendations(id, 8)
                .then((items) => {
                    if (!cancelled) setRecommendations(items);
                })
                .catch(() => {
                    if (!cancelled) {
                        setRecommendations([]);
                        setRecommendationsError("Không thể tải sản phẩm liên quan.");
                    }
                })
                .finally(() => {
                    if (!cancelled) setRecommendationsLoading(false);
                });
        });

        return () => { cancelled = true; };
    }, [id]);

    useEffect(() => {
        if (!id) return;
        let cancelled = false;

        void Promise.resolve().then(() => {
            if (cancelled) return;
            setComboProducts([]);
            setSelectedComboIds(new Set());
            setComboError("");
            setComboLoading(true);

            productService.getComboSuggestions(id, 4)
                .then((items) => {
                    if (!cancelled) {
                        const inStockItems = items.filter((item) => item.inStock);
                        setComboProducts(inStockItems);
                        setSelectedComboIds(new Set(inStockItems.map((item) => item.id)));
                    }
                })
                .catch(() => {
                    if (!cancelled) {
                        setComboProducts([]);
                        setComboError("Không thể tải sản phẩm mua kèm.");
                    }
                })
                .finally(() => {
                    if (!cancelled) setComboLoading(false);
                });
        });

        return () => { cancelled = true; };
    }, [id]);

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

    const toggleComboProduct = (productId: string) => {
        setSelectedComboIds((current) => {
            const next = new Set(current);
            if (next.has(productId)) {
                next.delete(productId);
            } else {
                next.add(productId);
            }
            return next;
        });
    };

    const handleAddCombo = async () => {
        if (!user) {
            toast.error("Vui lòng đăng nhập để thêm combo vào giỏ hàng.");
            navigate("/signin");
            return;
        }

        if (!product.inStock) {
            toast.error("Sản phẩm hiện tại đã hết hàng.");
            return;
        }

        const selectedProducts = comboProducts.filter((item) => selectedComboIds.has(item.id) && item.inStock);
        const comboItems = [
            { product, quantity: qty },
            ...selectedProducts.map((item) => ({ product: item, quantity: 1 })),
        ];

        setAddingCombo(true);
        try {
            await addCombo(comboItems);
            toast.success("Đã thêm combo vào giỏ hàng.");
        } catch {
            toast.error("Không thể thêm combo vào giỏ hàng. Vui lòng thử lại.");
        } finally {
            setAddingCombo(false);
        }
    };

    const discount = calculateDiscountPercent(product.price, product.originalPrice);
    const hasDiscount = discount >= 1;
    const visibleRecommendations = recommendations.filter((item) => item.id !== product.id);
    const visibleComboProducts = comboProducts.filter((item) => item.id !== product.id);
    const selectedComboProducts = visibleComboProducts.filter((item) => selectedComboIds.has(item.id));
    const comboSubtotal = product.price * qty + selectedComboProducts.reduce((sum, item) => sum + item.price, 0);

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
                    {product.badge && (product.badge !== "sale" || hasDiscount) && (
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
                        {hasDiscount && product.originalPrice && (
                            <span className="text-lg text-muted-foreground line-through">{formatCurrency(product.originalPrice)}</span>
                        )}
                        {hasDiscount && (
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

            <section className="mb-12 border border-border rounded-3xl p-5 sm:p-6 bg-card/60">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between mb-5">
                    <div>
                        <h2 className="section-title">Thường mua cùng</h2>
                        <p className="text-sm text-muted-foreground mt-1">Chọn sản phẩm mua kèm phù hợp với món bạn đang xem.</p>
                    </div>
                    <div className="text-sm text-muted-foreground">
                        Tổng tạm tính: <span className="text-lg font-black text-[var(--pet-coral)]">{formatCurrency(comboSubtotal)}</span>
                    </div>
                </div>

                {comboLoading && (
                    <div className="py-6 text-sm text-muted-foreground">Đang tải combo tiết kiệm...</div>
                )}

                {!comboLoading && comboError && (
                    <div className="py-6 text-sm text-muted-foreground">{comboError}</div>
                )}

                {!comboLoading && !comboError && visibleComboProducts.length === 0 && (
                    <div className="py-6 text-sm text-muted-foreground">Chưa có sản phẩm mua kèm phù hợp.</div>
                )}

                {!comboLoading && !comboError && visibleComboProducts.length > 0 && (
                    <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-5 items-start">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div className="flex items-center gap-3 p-3 rounded-2xl border border-[var(--pet-coral)]/30 bg-[var(--pet-coral)]/5">
                                <div className="w-16 h-16 rounded-xl overflow-hidden bg-muted shrink-0">
                                    <img src={product.image} alt={product.name} className="w-full h-full object-cover" />
                                </div>
                                <div className="min-w-0">
                                    <p className="font-bold text-sm text-foreground line-clamp-2">{product.name}</p>
                                    <p className="text-sm font-black text-[var(--pet-coral)]">{formatCurrency(product.price)}</p>
                                    <p className="text-xs text-muted-foreground">Sản phẩm hiện tại x{qty}</p>
                                </div>
                            </div>

                            {visibleComboProducts.map((item) => {
                                const selected = selectedComboIds.has(item.id);

                                return (
                                    <button
                                        key={item.id}
                                        type="button"
                                        onClick={() => toggleComboProduct(item.id)}
                                        className={`flex items-center gap-3 p-3 rounded-2xl border text-left transition-all ${
                                            selected
                                                ? "border-[var(--pet-coral)] bg-[var(--pet-coral)]/5"
                                                : "border-border hover:border-[var(--pet-coral)]/40"
                                        }`}
                                    >
                                        <span
                                            className={`w-5 h-5 rounded-md border flex items-center justify-center shrink-0 ${
                                                selected
                                                    ? "bg-[var(--pet-coral)] border-[var(--pet-coral)] text-white"
                                                    : "border-border bg-background"
                                            }`}
                                        >
                                            {selected ? "✓" : ""}
                                        </span>
                                        <div className="w-16 h-16 rounded-xl overflow-hidden bg-muted shrink-0">
                                            <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                                        </div>
                                        <div className="min-w-0">
                                            <p className="font-bold text-sm text-foreground line-clamp-2">{item.name}</p>
                                            <p className="text-sm font-black text-[var(--pet-coral)]">{formatCurrency(item.price)}</p>
                                            <p className="text-xs text-muted-foreground">{item.inStock ? "Còn hàng" : "Hết hàng"}</p>
                                        </div>
                                    </button>
                                );
                            })}
                        </div>

                        <div className="lg:w-64 rounded-2xl bg-muted/30 border border-border p-4">
                            <div className="flex justify-between text-sm mb-2">
                                <span className="text-muted-foreground">Sản phẩm chính</span>
                                <span className="font-semibold">{formatCurrency(product.price * qty)}</span>
                            </div>
                            <div className="flex justify-between text-sm mb-3">
                                <span className="text-muted-foreground">Mua kèm đã chọn</span>
                                <span className="font-semibold">{formatCurrency(selectedComboProducts.reduce((sum, item) => sum + item.price, 0))}</span>
                            </div>
                            <div className="border-t border-border pt-3 flex justify-between items-center">
                                <span className="text-sm font-semibold">Tổng tạm tính</span>
                                <span className="text-lg font-black text-[var(--pet-coral)]">{formatCurrency(comboSubtotal)}</span>
                            </div>
                            <button
                                type="button"
                                onClick={handleAddCombo}
                                disabled={addingCombo || !product.inStock}
                                className="btn-pet-primary w-full justify-center mt-4 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {addingCombo ? "Đang thêm..." : "Thêm combo vào giỏ hàng"}
                            </button>
                        </div>
                    </div>
                )}
            </section>

            {/* Reviews */}
            <ProductReviews
                productId={product.id}
                reviews={product.reviews}
                averageRating={product.rating}
                onReviewAdded={() => { void loadProduct(); }}
            />

            <section className="mt-12 border-t border-border pt-8">
                <div className="flex items-end justify-between mb-6">
                    <div>
                        <h2 className="section-title">Sản phẩm liên quan</h2>
                        <p className="text-sm text-muted-foreground mt-1">Gợi ý phù hợp với sản phẩm bạn đang xem.</p>
                    </div>
                </div>

                {recommendationsLoading && (
                    <div className="py-8 text-sm text-muted-foreground">Đang tải sản phẩm liên quan...</div>
                )}

                {!recommendationsLoading && recommendationsError && (
                    <div className="py-8 text-sm text-muted-foreground">{recommendationsError}</div>
                )}

                {!recommendationsLoading && !recommendationsError && visibleRecommendations.length === 0 && (
                    <div className="py-8 text-sm text-muted-foreground">Chưa có sản phẩm liên quan.</div>
                )}

                {!recommendationsLoading && !recommendationsError && visibleRecommendations.length > 0 && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                        {visibleRecommendations.map((item, index) => (
                            <div
                                key={item.id}
                                className="animate-fade-in-up"
                                style={{ animationDelay: `${index * 0.07}s` }}
                            >
                                <ProductCard product={item} />
                            </div>
                        ))}
                    </div>
                )}
            </section>
        </div>
    );
};

export default ProductDetailPage;
