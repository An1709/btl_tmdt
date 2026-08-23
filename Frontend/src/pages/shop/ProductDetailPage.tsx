import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import {
    BadgeCheck,
    Check,
    Heart,
    Minus,
    PackageCheck,
    Plus,
    ShieldCheck,
    ShoppingCart,
    Star,
    Truck,
} from "lucide-react";
import { productService } from "@/services/productService";
import type { Product } from "@/types/product";
import { useCartStore } from "@/stores/useCartStore";
import { useAuthStore } from "@/stores/useAuthStore";
import { calculateDiscountPercent, formatCurrency } from "@/utils/format";
import ProductReviews from "@/components/features/product/ProductReviews";
import ProductList from "@/components/features/product/ProductList";
import { toast } from "sonner";
import { collectionService } from "@/services/collectionService";
import { IMAGE_ASSETS } from "@/utils/constants";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState, ErrorState } from "@/components/ui/feedback-state";
import { ProductCardSkeleton, SkeletonBlock } from "@/components/common/Loading";

const getRequestStatus = (error: unknown) => {
    if (error && typeof error === "object" && "response" in error) {
        return (error as { response?: { status?: number } }).response?.status;
    }
    return undefined;
};

const getErrorMessage = (error: unknown, fallback: string) => {
    if (error && typeof error === "object" && "response" in error) {
        const message = (error as { response?: { data?: { message?: unknown } } }).response?.data?.message;
        if (typeof message === "string" && message.trim()) return message;
    }

    return fallback;
};

const RatingStars = ({ rating }: { rating: number }) => (
    <span aria-hidden="true" className="flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map((star) => (
            <Star
                key={star}
                className={`size-4 ${star <= Math.round(rating) ? "text-warning" : "text-border-strong"}`}
                fill="currentColor"
            />
        ))}
    </span>
);

const DetailSkeleton = () => (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8" aria-busy="true" aria-label="Đang tải chi tiết sản phẩm">
        <div className="mb-6 flex gap-2">
            <SkeletonBlock className="h-4 w-20" />
            <SkeletonBlock className="h-4 w-5" />
            <SkeletonBlock className="h-4 w-36" />
        </div>
        <div className="grid gap-8 lg:grid-cols-2 lg:gap-12">
            <SkeletonBlock className="aspect-square w-full" />
            <div className="flex flex-col gap-4 pt-2">
                <SkeletonBlock className="h-6 w-24" />
                <SkeletonBlock className="h-10 w-4/5" />
                <SkeletonBlock className="h-5 w-2/5" />
                <SkeletonBlock className="h-10 w-1/2" />
                <SkeletonBlock className="h-24 w-full" />
                <SkeletonBlock className="h-36 w-full" />
            </div>
        </div>
    </div>
);

const ProductGallery = ({ product, selectedImage, onSelectImage }: {
    product: Product;
    selectedImage: string;
    onSelectImage: (image: string) => void;
}) => {
    const galleryImages = Array.from(new Set([product.image, ...(product.images ?? [])].filter(Boolean)));
    if (galleryImages.length === 0) galleryImages.push(IMAGE_ASSETS.placeholder);
    const activeImage = galleryImages.includes(selectedImage) ? selectedImage : galleryImages[0];

    return (
        <div className="min-w-0">
            <div className="aspect-square overflow-hidden rounded-lg bg-surface-subtle">
                <img
                    src={activeImage}
                    alt={`Ảnh sản phẩm ${product.name}`}
                    onError={(event) => {
                        event.currentTarget.src = IMAGE_ASSETS.placeholder;
                    }}
                    className="size-full object-cover"
                    fetchPriority="high"
                />
            </div>

            {galleryImages.length > 1 && (
                <div className="mt-3 grid grid-cols-5 gap-2" aria-label="Thư viện ảnh sản phẩm">
                    {galleryImages.map((image, index) => {
                        const selected = image === activeImage;
                        return (
                            <button
                                key={`${image}-${index}`}
                                type="button"
                                onClick={() => onSelectImage(image)}
                                aria-label={`Xem ảnh ${index + 1} của ${product.name}`}
                                aria-pressed={selected}
                                className={`aspect-square min-w-0 overflow-hidden rounded-md border-2 bg-surface transition-colors ${
                                    selected ? "border-primary" : "border-transparent hover:border-border-strong"
                                }`}
                            >
                                <img
                                    src={image}
                                    alt=""
                                    onError={(event) => {
                                        event.currentTarget.src = IMAGE_ASSETS.placeholder;
                                    }}
                                    className="size-full object-cover"
                                    loading="lazy"
                                />
                            </button>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

const ProductDetailPage = () => {
    const { id } = useParams<{ id: string }>();
    const addItem = useCartStore((state) => state.addItem);
    const addCombo = useCartStore((state) => state.addCombo);
    const { user } = useAuthStore();
    const navigate = useNavigate();

    const [product, setProduct] = useState<Product | null>(null);
    const [loading, setLoading] = useState(true);
    const [notFound, setNotFound] = useState(false);
    const [loadError, setLoadError] = useState("");
    const [selectedImage, setSelectedImage] = useState("");
    const [qty, setQty] = useState(1);
    const [addingToCart, setAddingToCart] = useState(false);
    const [added, setAdded] = useState(false);
    const [wishlisted, setWishlisted] = useState(false);
    const [updatingWishlist, setUpdatingWishlist] = useState(false);
    const [recommendations, setRecommendations] = useState<Product[]>([]);
    const [recommendationsLoading, setRecommendationsLoading] = useState(false);
    const [recommendationsError, setRecommendationsError] = useState("");
    const [comboProducts, setComboProducts] = useState<Product[]>([]);
    const [selectedComboIds, setSelectedComboIds] = useState<Set<string>>(new Set());
    const [comboLoading, setComboLoading] = useState(false);

    useEffect(() => {
        if (!added) return undefined;
        const timerId = window.setTimeout(() => setAdded(false), 2000);
        return () => window.clearTimeout(timerId);
    }, [added]);
    const [comboError, setComboError] = useState("");
    const [addingCombo, setAddingCombo] = useState(false);

    const loadProduct = useCallback((showLoading = true) => {
        if (!id) return Promise.resolve();
        if (showLoading) setLoading(true);
        setNotFound(false);
        setLoadError("");

        return productService.getById(id)
            .then((nextProduct) => {
                setProduct(nextProduct);
                setNotFound(false);
                setLoadError("");
            })
            .catch((error: unknown) => {
                if (getRequestStatus(error) === 404) {
                    setNotFound(true);
                    return;
                }
                if (showLoading) setLoadError("Không thể tải thông tin sản phẩm. Vui lòng thử lại.");
                else toast.error("Đánh giá đã gửi nhưng chưa thể làm mới thông tin sản phẩm.");
            })
            .finally(() => {
                if (showLoading) setLoading(false);
            });
    }, [id]);

    useEffect(() => {
        if (!id) return;
        window.scrollTo(0, 0);
        let cancelled = false;

        void Promise.resolve().then(() => {
            if (cancelled) return;
            setLoading(true);
            setNotFound(false);
            setLoadError("");
            setProduct(null);

            productService.getById(id)
                .then((nextProduct) => {
                    if (!cancelled) {
                        setProduct(nextProduct);
                        setQty(1);
                        setSelectedImage("");
                    }
                })
                .catch((error: unknown) => {
                    if (cancelled) return;
                    if (getRequestStatus(error) === 404) setNotFound(true);
                    else setLoadError("Không thể tải thông tin sản phẩm. Vui lòng thử lại.");
                })
                .finally(() => {
                    if (!cancelled) setLoading(false);
                });
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
                if (!cancelled) setWishlisted(products.some((item) => item.id === product.id));
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

    if (!id || notFound) {
        return (
            <div className="mx-auto max-w-3xl px-4 py-20 sm:px-6">
                <EmptyState
                    title="Không tìm thấy sản phẩm"
                    description="Sản phẩm có thể đã được gỡ hoặc đường dẫn không còn chính xác."
                    action={
                        <Button asChild>
                            <Link to="/shop">Quay lại cửa hàng</Link>
                        </Button>
                    }
                />
            </div>
        );
    }

    if (loading) return <DetailSkeleton />;

    if (loadError || !product) {
        return (
            <div className="mx-auto max-w-3xl px-4 py-20 sm:px-6">
                <ErrorState
                    title="Chưa thể tải sản phẩm"
                    description={loadError || "Đã xảy ra lỗi khi tải thông tin sản phẩm."}
                    action={
                        <div className="flex flex-col gap-2 sm:flex-row">
                            <Button type="button" onClick={() => { void loadProduct(); }}>Thử lại</Button>
                            <Button asChild variant="outline"><Link to="/shop">Về cửa hàng</Link></Button>
                        </div>
                    }
                />
            </div>
        );
    }

    const stock = Math.max(0, product.stock ?? 0);

    const handleAdd = async () => {
        if (addingToCart || added) return;
        if (!user) {
            toast.error("Vui lòng đăng nhập để thêm vào giỏ hàng!");
            navigate("/signin");
            return;
        }
        if (!product.inStock || stock < 1) return;
        if (qty > stock) {
            setQty(stock);
            toast.error(`Sản phẩm chỉ còn ${stock} trong kho. Vui lòng kiểm tra lại số lượng.`);
            return;
        }

        setAddingToCart(true);
        try {
            await addItem(product, qty);
            toast.success(`Đã thêm ${qty} "${product.name}" vào giỏ hàng!`);
            setAdded(true);
        } catch (error) {
            toast.error(getErrorMessage(error, "Không thể thêm vào giỏ hàng. Vui lòng thử lại."));
        } finally {
            setAddingToCart(false);
        }
    };

    const handleToggleWishlist = async () => {
        if (updatingWishlist) return;
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
            const message = error && typeof error === "object" && "response" in error
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
            if (next.has(productId)) next.delete(productId);
            else next.add(productId);
            return next;
        });
    };

    const handleAddCombo = async () => {
        if (addingCombo) return;
        if (!user) {
            toast.error("Vui lòng đăng nhập để thêm combo vào giỏ hàng.");
            navigate("/signin");
            return;
        }
        if (!product.inStock || stock < 1) {
            toast.error("Sản phẩm hiện tại đã hết hàng.");
            return;
        }
        if (qty > stock) {
            setQty(stock);
            toast.error(`Sản phẩm chính chỉ còn ${stock} trong kho. Vui lòng kiểm tra lại số lượng.`);
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
        } catch (error) {
            toast.error(getErrorMessage(error, "Không thể thêm combo vào giỏ hàng. Vui lòng thử lại."));
        } finally {
            setAddingCombo(false);
        }
    };

    const discount = calculateDiscountPercent(product.price, product.originalPrice);
    const hasDiscount = discount >= 1;
    const visibleRecommendations = recommendations.filter((item) => item.id !== product.id);
    const visibleComboProducts = comboProducts.filter((item) => item.id !== product.id);
    const selectedComboProducts = visibleComboProducts.filter((item) => selectedComboIds.has(item.id));
    const selectedComboTotal = selectedComboProducts.reduce((sum, item) => sum + item.price, 0);
    const comboSubtotal = product.price * qty + selectedComboTotal;
    const reviews = product.reviews || [];
    const reviewCount = reviews.length;
    const averageRating = reviewCount > 0 ? reviews.reduce((sum, review) => sum + review.rating, 0) / reviewCount : 0;
    const lowStock = product.inStock && stock > 0 && stock <= 5;

    return (
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 lg:py-10">
            <nav aria-label="Đường dẫn trang" className="mb-6 flex min-w-0 items-center gap-2 text-sm text-muted-foreground">
                <Link to="/" className="shrink-0 rounded-sm transition-colors hover:text-primary">Trang chủ</Link>
                <span aria-hidden="true">/</span>
                <Link to="/shop" className="shrink-0 rounded-sm transition-colors hover:text-primary">Cửa hàng</Link>
                <span aria-hidden="true">/</span>
                <span className="line-clamp-1 min-w-0 font-medium text-foreground" aria-current="page">{product.name}</span>
            </nav>

            <div className="grid gap-8 lg:grid-cols-2 lg:gap-12">
                <ProductGallery product={product} selectedImage={selectedImage} onSelectImage={setSelectedImage} />

                <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                        {product.badge && (product.badge !== "sale" || hasDiscount) && (
                            <Badge tone={product.badge === "hot" ? "error" : product.badge === "new" ? "success" : "warning"}>
                                {product.badge === "new" ? "Mới" : product.badge === "hot" ? "Nổi bật" : `Giảm ${discount}%`}
                            </Badge>
                        )}
                        {lowStock && <Badge tone="warning"><PackageCheck aria-hidden="true" className="mr-1 size-3.5" /> Chỉ còn {stock}</Badge>}
                    </div>

                    <h1 className="mt-4 break-words text-3xl font-bold text-text-strong sm:text-4xl">{product.name}</h1>

                    {(product.breed || product.age) && (
                        <p className="mt-3 text-sm text-muted-foreground">
                            {[product.breed && `Giống: ${product.breed}`, product.age && `Tuổi: ${product.age}`].filter(Boolean).join(" · ")}
                        </p>
                    )}

                    <div className="mt-4 flex flex-wrap items-center gap-2" aria-label={`${averageRating.toFixed(1)} trên 5 sao, ${product.reviewCount || reviewCount} đánh giá`}>
                        <RatingStars rating={averageRating} />
                        <span className="text-sm font-medium text-text-strong">{reviewCount > 0 ? averageRating.toFixed(1) : "Chưa có đánh giá"}</span>
                        {reviewCount > 0 && <a href="#reviews-heading" className="text-sm text-muted-foreground underline-offset-4 hover:text-primary hover:underline">{product.reviewCount || reviewCount} đánh giá</a>}
                    </div>

                    <div className="mt-5 flex flex-wrap items-baseline gap-x-3 gap-y-1">
                        <span className="text-3xl font-bold text-primary">{formatCurrency(product.price)}</span>
                        {hasDiscount && product.originalPrice && <span className="text-lg text-muted-foreground line-through">{formatCurrency(product.originalPrice)}</span>}
                        {hasDiscount && <Badge tone="warning">Tiết kiệm {discount}%</Badge>}
                    </div>

                    <div className="mt-6 border-t border-divider pt-5">
                        <p className="max-w-prose whitespace-pre-line break-words text-sm leading-7 text-muted-foreground">
                            {product.description || "Chưa có mô tả chi tiết cho sản phẩm này."}
                        </p>
                    </div>

                    <div className="mt-6 rounded-lg bg-surface-subtle p-4 sm:p-5">
                        <div className={`flex items-center gap-2 text-sm font-semibold ${product.inStock ? (lowStock ? "text-warning" : "text-success") : "text-destructive"}`}>
                            {product.inStock ? <BadgeCheck aria-hidden="true" className="size-5" /> : <PackageCheck aria-hidden="true" className="size-5" />}
                            {product.inStock ? (lowStock ? `Sắp hết hàng — còn ${stock} sản phẩm` : "Còn hàng") : "Tạm hết hàng"}
                        </div>

                        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end">
                            <div>
                                <span id="quantity-label" className="mb-2 block text-sm font-medium text-text-strong">Số lượng</span>
                                <div className="flex items-center" role="group" aria-labelledby="quantity-label">
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="icon"
                                        onClick={() => setQty((current) => Math.max(1, current - 1))}
                                        disabled={!product.inStock || qty <= 1 || addingToCart || addingCombo}
                                        aria-label="Giảm số lượng"
                                        className="rounded-r-none"
                                    >
                                        <Minus aria-hidden="true" />
                                    </Button>
                                    <output className="flex h-11 min-w-14 items-center justify-center border-y border-border-strong bg-surface px-3 font-semibold text-text-strong" aria-live="polite">
                                        {qty}
                                    </output>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="icon"
                                        onClick={() => setQty((current) => Math.min(stock, current + 1))}
                                        disabled={!product.inStock || qty >= stock || addingToCart || addingCombo}
                                        aria-label="Tăng số lượng"
                                        className="rounded-l-none"
                                    >
                                        <Plus aria-hidden="true" />
                                    </Button>
                                </div>
                                {product.inStock && (
                                    <p className="mt-1.5 text-xs text-muted-foreground">Tối đa {stock} sản phẩm theo tồn kho hiện tại.</p>
                                )}
                            </div>

                            <Button
                                id="detail-add-cart"
                                type="button"
                                size="lg"
                                loading={addingToCart}
                                disabled={!product.inStock || stock < 1 || added || addingCombo}
                                onClick={handleAdd}
                                className="min-w-0 flex-1"
                            >
                                {added ? <><Check aria-hidden="true" /> Đã thêm vào giỏ</> : <><ShoppingCart aria-hidden="true" /> Thêm vào giỏ</>}
                            </Button>
                            <Button
                                type="button"
                                variant={wishlisted ? "destructive" : "outline"}
                                size="lg"
                                loading={updatingWishlist}
                                onClick={handleToggleWishlist}
                                aria-pressed={wishlisted}
                                aria-label={wishlisted ? "Bỏ khỏi danh sách yêu thích" : "Thêm vào danh sách yêu thích"}
                                className="sm:px-4"
                            >
                                <Heart aria-hidden="true" fill={wishlisted ? "currentColor" : "none"} />
                                <span className="sm:sr-only">{wishlisted ? "Đã yêu thích" : "Yêu thích"}</span>
                            </Button>
                        </div>
                    </div>

                    <div className="mt-5 grid gap-3 border-t border-divider pt-5 sm:grid-cols-3">
                        <div className="flex items-center gap-3 text-sm"><Truck aria-hidden="true" className="size-5 shrink-0 text-secondary" /><span>Giao hàng 24h</span></div>
                        <div className="flex items-center gap-3 text-sm"><ShieldCheck aria-hidden="true" className="size-5 shrink-0 text-secondary" /><span>Bảo hành 30 ngày</span></div>
                        <div className="flex items-center gap-3 text-sm"><BadgeCheck aria-hidden="true" className="size-5 shrink-0 text-secondary" /><span>Kiểm dịch</span></div>
                    </div>
                </div>
            </div>

            <section className="mt-14 border-t border-divider pt-10" aria-labelledby="combo-heading">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                        <h2 id="combo-heading" className="section-title">Thường mua cùng</h2>
                        <p className="mt-2 text-sm text-muted-foreground">Chỉ những sản phẩm bạn chọn mới được thêm cùng sản phẩm chính.</p>
                    </div>
                    {!comboLoading && visibleComboProducts.length > 0 && (
                        <p className="text-sm text-muted-foreground"><span className="font-semibold text-text-strong">{selectedComboProducts.length}</span> món mua kèm đã chọn</p>
                    )}
                </div>

                {comboLoading && <div className="mt-6"><SkeletonBlock className="h-48 w-full" /></div>}
                {!comboLoading && comboError && <ErrorState title="Chưa thể tải sản phẩm mua kèm" description={comboError} className="mt-4" />}
                {!comboLoading && !comboError && visibleComboProducts.length === 0 && (
                    <EmptyState title="Chưa có sản phẩm mua kèm" description="Hiện chưa có gợi ý phù hợp với sản phẩm này." className="mt-4" />
                )}

                {!comboLoading && !comboError && visibleComboProducts.length > 0 && (
                    <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start">
                        <div className="grid gap-3 sm:grid-cols-2">
                            <div className="flex min-h-28 items-center gap-3 rounded-lg bg-primary-subtle p-4">
                                <img
                                    src={product.image || IMAGE_ASSETS.placeholder}
                                    alt=""
                                    onError={(event) => { event.currentTarget.src = IMAGE_ASSETS.placeholder; }}
                                    className="size-20 shrink-0 rounded-md object-cover"
                                />
                                <div className="min-w-0">
                                    <Badge tone="neutral">Luôn được thêm</Badge>
                                    <p className="mt-2 line-clamp-2 text-sm font-semibold text-text-strong">{product.name}</p>
                                    <p className="mt-1 text-sm font-bold text-primary">{formatCurrency(product.price)} × {qty}</p>
                                </div>
                            </div>

                            {visibleComboProducts.map((item) => {
                                const selected = selectedComboIds.has(item.id);
                                return (
                                    <button
                                        key={item.id}
                                        type="button"
                                        onClick={() => toggleComboProduct(item.id)}
                                        disabled={addingCombo}
                                        aria-pressed={selected}
                                        className={`flex min-h-28 items-center gap-3 rounded-lg border p-4 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${
                                            selected ? "border-primary bg-primary-subtle" : "border-border bg-surface hover:border-border-strong hover:bg-surface-subtle"
                                        }`}
                                    >
                                        <span className={`flex size-6 shrink-0 items-center justify-center rounded-md border ${selected ? "border-primary bg-primary text-primary-foreground" : "border-border-strong bg-surface"}`}>
                                            {selected && <Check aria-hidden="true" className="size-4" />}
                                        </span>
                                        <img
                                            src={item.image || IMAGE_ASSETS.placeholder}
                                            alt=""
                                            onError={(event) => { event.currentTarget.src = IMAGE_ASSETS.placeholder; }}
                                            className="size-16 shrink-0 rounded-md object-cover"
                                            loading="lazy"
                                        />
                                        <span className="min-w-0 flex-1">
                                            <span className="line-clamp-2 text-sm font-semibold text-text-strong">{item.name}</span>
                                            <span className="mt-1 block text-sm font-bold text-primary">{formatCurrency(item.price)}</span>
                                            <span className="mt-1 block text-xs text-success">Còn hàng</span>
                                        </span>
                                    </button>
                                );
                            })}
                        </div>

                        <aside className="rounded-lg bg-surface-subtle p-5 lg:sticky lg:top-24" aria-label="Tóm tắt combo">
                            <h3 className="text-base font-semibold text-text-strong">Tóm tắt lựa chọn</h3>
                            <dl className="mt-4 space-y-3 text-sm">
                                <div className="flex justify-between gap-3"><dt className="text-muted-foreground">Sản phẩm chính × {qty}</dt><dd className="font-medium text-text-strong">{formatCurrency(product.price * qty)}</dd></div>
                                <div className="flex justify-between gap-3"><dt className="text-muted-foreground">{selectedComboProducts.length} món mua kèm</dt><dd className="font-medium text-text-strong">{formatCurrency(selectedComboTotal)}</dd></div>
                                <div className="flex justify-between gap-3 border-t border-divider pt-3"><dt className="font-semibold text-text-strong">Tổng tạm tính</dt><dd className="text-lg font-bold text-primary">{formatCurrency(comboSubtotal)}</dd></div>
                            </dl>
                            <Button
                                type="button"
                                loading={addingCombo}
                                disabled={!product.inStock || stock < 1 || addingToCart}
                                onClick={handleAddCombo}
                                className="mt-5 w-full"
                            >
                                <ShoppingCart aria-hidden="true" />
                                {selectedComboProducts.length > 0 ? "Thêm lựa chọn vào giỏ" : "Thêm sản phẩm chính"}
                            </Button>
                            <p className="mt-3 text-xs leading-5 text-muted-foreground">Sản phẩm chính dùng số lượng đã chọn; mỗi món mua kèm được thêm 1 sản phẩm.</p>
                        </aside>
                    </div>
                )}
            </section>

            <ProductReviews
                productId={product.id}
                reviews={reviews}
                averageRating={averageRating}
                reviewCount={product.reviewCount || reviewCount}
                onReviewAdded={() => { void loadProduct(false); }}
            />

            <section className="mt-14 border-t border-divider pt-10" aria-labelledby="related-heading">
                <div className="mb-6">
                    <h2 id="related-heading" className="section-title">Sản phẩm liên quan</h2>
                    <p className="mt-2 text-sm text-muted-foreground">Gợi ý phù hợp với sản phẩm bạn đang xem.</p>
                </div>

                {recommendationsLoading && (
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        {Array.from({ length: 3 }).map((_, index) => <ProductCardSkeleton key={index} />)}
                    </div>
                )}
                {!recommendationsLoading && recommendationsError && <ErrorState title="Chưa thể tải sản phẩm liên quan" description={recommendationsError} />}
                {!recommendationsLoading && !recommendationsError && visibleRecommendations.length === 0 && (
                    <EmptyState title="Chưa có sản phẩm liên quan" description="Hiện chưa có gợi ý phù hợp cho sản phẩm này." />
                )}
                {!recommendationsLoading && !recommendationsError && visibleRecommendations.length > 0 && (
                    <ProductList products={visibleRecommendations} />
                )}
            </section>
        </div>
    );
};

export default ProductDetailPage;
