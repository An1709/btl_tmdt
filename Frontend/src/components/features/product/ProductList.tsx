import type { Product } from "@/types/product";
import ProductCard from "./ProductCard";
import { Link } from "react-router";

interface ProductListProps {
    products: Product[];
    title?: string;
    subtitle?: string;
    viewAllLink?: string;
}

const ProductList = ({ products, title, subtitle, viewAllLink }: ProductListProps) => {
    if (products.length === 0) {
        return (
            <div className="text-center py-16 text-muted-foreground">
                <div className="text-5xl mb-4">🐾</div>
                <p className="font-semibold">Không tìm thấy sản phẩm nào.</p>
            </div>
        );
    }

    return (
        <section className="py-4">
            {/* Section Header */}
            {title && (
                <div className="flex items-end justify-between mb-6">
                    <div>
                        <h2 className="section-title">{title}</h2>
                        {subtitle && <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>}
                    </div>
                    {viewAllLink && (
                        <Link
                            to={viewAllLink}
                            className="text-sm font-semibold text-[var(--pet-coral)] hover:underline underline-offset-2 flex items-center gap-1 shrink-0"
                        >
                            Xem tất cả
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                        </Link>
                    )}
                </div>
            )}

            {/* Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                {products.map((product, idx) => (
                    <div
                        key={product.id}
                        className="animate-fade-in-up"
                        style={{ animationDelay: `${idx * 0.07}s` }}
                    >
                        <ProductCard product={product} />
                    </div>
                ))}
            </div>
        </section>
    );
};

export default ProductList;