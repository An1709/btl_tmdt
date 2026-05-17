import { useEffect, useState } from "react";
import Sidebar from "@/components/common/Sidebar";
import { collectionService } from "@/services/collectionService";
import type { Product } from "@/types/product";
import ProductList from "@/components/features/product/ProductList";
import Loading from "@/components/common/Loading";
import { toast } from "sonner";

const WishlistPage = () => {
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let isMounted = true;

        const loadWishlist = async () => {
            try {
                const wishlistProducts = await collectionService.getWishlist();
                if (isMounted) {
                    setProducts(wishlistProducts);
                }
            } catch {
                toast.error("Không thể tải danh sách yêu thích. Vui lòng thử lại.");
            } finally {
                if (isMounted) {
                    setLoading(false);
                }
            }
        };

        void loadWishlist();

        return () => {
            isMounted = false;
        };
    }, []);

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex gap-8">
            <Sidebar mode="user" />
            <main className="flex-1">
                <h1 className="section-title mb-6">❤️ Yêu Thích ({products.length})</h1>
                {loading ? <Loading /> : products.length === 0 ? (
                    <div className="text-center py-16">
                        <div className="text-5xl mb-3">❤️</div>
                        <p className="text-muted-foreground">Chưa có sản phẩm yêu thích.</p>
                    </div>
                ) : (
                    <ProductList
                        products={products}
                        onWishlistChange={(productId, wishlisted) => {
                            if (!wishlisted) {
                                setProducts((currentProducts) => currentProducts.filter((product) => product.id !== productId));
                            }
                        }}
                    />
                )}
            </main>
        </div>
    );
};

export default WishlistPage;
