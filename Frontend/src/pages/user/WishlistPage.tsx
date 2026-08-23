import { useCallback, useEffect, useRef, useState } from "react";
import { Heart } from "lucide-react";
import { Link } from "react-router";

import Sidebar from "@/components/common/Sidebar";
import { ProductCardSkeleton } from "@/components/common/Loading";
import ProductList from "@/components/features/product/ProductList";
import { Button } from "@/components/ui/button";
import { EmptyState, ErrorState } from "@/components/ui/feedback-state";
import { collectionService } from "@/services/collectionService";
import type { Product } from "@/types/product";

const getErrorMessage = (error: unknown) => {
    const message = (error as { response?: { data?: { message?: unknown } } })?.response?.data?.message;
    return typeof message === "string" ? message : "Không thể tải danh sách yêu thích. Vui lòng thử lại.";
};

const WishlistPage = () => {
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const requestVersionRef = useRef(0);

    const loadWishlist = useCallback(async () => {
        const requestVersion = ++requestVersionRef.current;
        setLoading(true);
        setError("");

        try {
            const wishlistProducts = await collectionService.getWishlist();
            if (requestVersion === requestVersionRef.current) setProducts(wishlistProducts);
        } catch (loadError) {
            if (requestVersion === requestVersionRef.current) setError(getErrorMessage(loadError));
        } finally {
            if (requestVersion === requestVersionRef.current) setLoading(false);
        }
    }, []);

    useEffect(() => {
        void loadWishlist();
    }, [loadWishlist]);

    const handleWishlistChange = (productId: string, wishlisted: boolean) => {
        if (wishlisted) return;

        requestVersionRef.current += 1;
        setProducts((currentProducts) => currentProducts.filter((product) => product.id !== productId));
    };

    return (
        <div className="mx-auto flex max-w-7xl flex-col gap-6 px-page py-8 lg:flex-row lg:gap-8">
            <Sidebar mode="user" />

            <section className="min-w-0 flex-1" aria-labelledby="wishlist-heading">
                <header className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                        <div className="flex items-center gap-2 text-sm font-semibold text-primary">
                            <Heart className="size-4" aria-hidden="true" />
                            Danh sách của bạn
                        </div>
                        <h1 id="wishlist-heading" className="mt-2 font-heading text-2xl font-bold tracking-tight text-text-strong sm:text-3xl">
                            Sản phẩm yêu thích
                        </h1>
                        <p className="mt-2 text-sm leading-6 text-muted-foreground">
                            {loading ? "Đang cập nhật danh sách sản phẩm đã lưu." : `${products.length} sản phẩm đã lưu để xem lại sau.`}
                        </p>
                    </div>
                    {!loading && products.length > 0 && <span className="text-sm font-medium text-muted-foreground">{products.length} sản phẩm</span>}
                </header>

                {loading ? (
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3" aria-label="Đang tải sản phẩm yêu thích">
                        {Array.from({ length: 6 }, (_, index) => <ProductCardSkeleton key={index} />)}
                    </div>
                ) : error ? (
                    <ErrorState
                        title="Không thể tải danh sách yêu thích"
                        description={error}
                        action={<Button type="button" onClick={() => void loadWishlist()}>Thử lại</Button>}
                    />
                ) : products.length === 0 ? (
                    <EmptyState
                        title="Chưa có sản phẩm yêu thích"
                        description="Lưu những sản phẩm bạn quan tâm để quay lại mua sắm bất cứ lúc nào."
                        action={<Button asChild><Link to="/shop">Khám phá sản phẩm</Link></Button>}
                    />
                ) : (
                    <ProductList products={products} onWishlistChange={handleWishlistChange} />
                )}
            </section>
        </div>
    );
};

export default WishlistPage;
