import type { Product } from "@/types/product";
import ProductCard from "./ProductCard";
import { Link } from "react-router";
import { EmptyState } from "@/components/ui/feedback-state";

interface ProductListProps {
    products: Product[];
    title?: string;
    subtitle?: string;
    viewAllLink?: string;
    onWishlistChange?: (productId: string, wishlisted: boolean) => void;
}

const ProductList = ({ products, title, subtitle, viewAllLink, onWishlistChange }: ProductListProps) => {
    if (products.length === 0) {
        return <EmptyState title="Không tìm thấy sản phẩm nào" description="Hãy thử lại với một lựa chọn khác." />;
    }

    return (
        <section className="py-1" aria-label={title ?? "Sản phẩm"}>
            {title && (
                <div className="mb-5 flex items-end justify-between gap-4">
                    <div>
                        <h2 className="section-title">{title}</h2>
                        {subtitle && <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>}
                    </div>
                    {viewAllLink && (
                        <Link to={viewAllLink} className="shrink-0 text-sm font-semibold text-primary underline-offset-4 hover:underline">
                            Xem tất cả <span aria-hidden="true">→</span>
                        </Link>
                    )}
                </div>
            )}

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {products.map((product) => (
                    <ProductCard key={product.id} product={product} onWishlistChange={onWishlistChange} />
                ))}
            </div>
        </section>
    );
};

export default ProductList;
