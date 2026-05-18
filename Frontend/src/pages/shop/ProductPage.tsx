import { useState, useEffect } from "react";
import { useSearchParams } from "react-router";
import type { ProductFilters } from "@/services/productService";
import type { Product } from "@/types/product";
import { useProducts } from "@/hooks/useProducts";
import ProductFilter from "@/components/features/product/ProductFilter";
import ProductList from "@/components/features/product/ProductList";
import Pagination from "@/components/common/Pagination";
import ProductSearchBox from "@/components/common/ProductSearchBox";
import { PAGE_SIZE } from "@/utils/constants";

// ── Skeleton card ─────────────────────────────────────────────────────────
const ProductSkeleton = () => (
    <div className="animate-pulse rounded-2xl border border-border overflow-hidden bg-white dark:bg-card">
        <div className="bg-muted aspect-square w-full" />
        <div className="p-4 flex flex-col gap-2">
            <div className="h-4 bg-muted rounded w-3/4" />
            <div className="h-3 bg-muted rounded w-1/2" />
            <div className="h-5 bg-muted rounded w-1/3 mt-2" />
        </div>
    </div>
);

const ProductPage = () => {
    const [searchParams, setSearchParams] = useSearchParams();
    const [filters, setFilters] = useState<ProductFilters>({
        page: 1,
        limit: PAGE_SIZE,
        category: searchParams.get("cat") || undefined,
        sort: "newest",
    });
    const submittedSearch = searchParams.get("q") || undefined;

    useEffect(() => {
        const params: Record<string, string> = {};
        if (submittedSearch) params.q = submittedSearch;
        if (filters.category) params.cat = filters.category;

        const currentQ = searchParams.get("q") || undefined;
        const currentCat = searchParams.get("cat") || undefined;
        if (currentQ !== submittedSearch || currentCat !== filters.category) {
            setSearchParams(params, { replace: true });
        }
    }, [filters.category, searchParams, setSearchParams, submittedSearch]);

    const { products, total, totalPages, loading, error } = useProducts({
        ...filters,
        search: submittedSearch,
    });

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {/* Page header */}
            <div className="mb-6">
                <h1 className="section-title mb-1">🛍️ Cửa Hàng PetMart</h1>
                <p className="text-sm text-muted-foreground">
                    {loading ? "Đang tải..." : `${total} sản phẩm`}
                </p>
            </div>

            {/* Search */}
            <ProductSearchBox
                initialValue={searchParams.get("q") || ""}
                inputId="shop-search"
                wrapperClassName="mb-6"
                inputClassName="w-full px-5 py-3 pl-12 rounded-2xl border border-border bg-white dark:bg-card text-sm focus:outline-none focus:ring-2 focus:ring-[var(--pet-coral)]/40 focus:border-[var(--pet-coral)] transition-all shadow-sm"
                showLeadingIcon
                onSearchComplete={() => setFilters((f) => ({ ...f, page: 1 }))}
            />

            <div className="flex gap-6">
                {/* Sidebar filters */}
                <div className="hidden lg:block">
                    <ProductFilter filters={filters} onChange={setFilters} />
                </div>

                {/* Product grid */}
                <div className="flex-1 min-w-0">
                    {/* Error state */}
                    {error && !loading && (
                        <div className="flex flex-col items-center justify-center py-20 text-center gap-3">
                            <span className="text-5xl">😿</span>
                            <p className="text-muted-foreground text-sm max-w-xs">
                                {error}
                            </p>
                            <button
                                onClick={() => setFilters((f) => ({ ...f }))}
                                className="btn-pet-primary text-sm"
                            >
                                Thử lại
                            </button>
                        </div>
                    )}

                    {/* Skeleton loading */}
                    {loading && (
                        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                            {Array.from({ length: PAGE_SIZE }).map((_, i) => (
                                <ProductSkeleton key={i} />
                            ))}
                        </div>
                    )}

                    {/* Actual product list */}
                    {!loading && !error && (
                        <>
                            <ProductList products={products as Product[]} />
                            <Pagination
                                page={filters.page ?? 1}
                                totalPages={totalPages}
                                onChange={(p) => setFilters((f) => ({ ...f, page: p }))}
                            />
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ProductPage;
