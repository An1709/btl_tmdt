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

    const load = () => {
        collectionService.getWishlist().then(setProducts).catch(console.error).finally(() => setLoading(false));
    };

    useEffect(load, []);

    const handleRemove = async (productId: string) => {
        try {
            await collectionService.removeFromWishlist(productId);
            setProducts((p) => p.filter((x) => x.id !== productId));
            toast.success("Đã xóa khỏi danh sách yêu thích.");
        } catch {
            toast.error("Không thể xóa. Vui lòng thử lại.");
        }
    };

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
                    <ProductList products={products} />
                )}
                <p className="sr-only">{handleRemove.toString()}</p>
            </main>
        </div>
    );
};

export default WishlistPage;