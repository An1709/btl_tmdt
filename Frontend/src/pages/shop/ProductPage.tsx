import { useState, useEffect } from "react";
import { useSearchParams } from "react-router";
import { fakeProducts } from "@/data/fakeProducts";
import type { Product } from "@/types/product";
import type { ProductFilters } from "@/services/productService";
import ProductFilter from "@/components/features/product/ProductFilter";
import ProductList from "@/components/features/product/ProductList";
import Pagination from "@/components/common/Pagination";
import { PAGE_SIZE } from "@/utils/constants";
import { useDebounce } from "@/hooks/useDebounce";

const ProductPage = () => {
    const [searchParams, setSearchParams] = useSearchParams();
    const [filters, setFilters] = useState<ProductFilters>({
        page: 1,
        limit: PAGE_SIZE,
        category: searchParams.get("cat") || undefined,
        sort: "newest",
    });
    const [search, setSearch] = useState(searchParams.get("q") || "");
    const debouncedSearch = useDebounce(search, 400);

    // Filter fake products client-side (replace with API call in production)
    const filtered = fakeProducts.filter((p) => {
        if (filters.category && p.category !== filters.category) return false;
        if (filters.minPrice && p.price < filters.minPrice) return false;
        if (filters.maxPrice && p.price > filters.maxPrice) return false;
        if (debouncedSearch && !p.name.toLowerCase().includes(debouncedSearch.toLowerCase())) return false;
        return true;
    });

    const sorted = [...filtered].sort((a, b) => {
        if (filters.sort === "price_asc") return a.price - b.price;
        if (filters.sort === "price_desc") return b.price - a.price;
        if (filters.sort === "popular") return b.rating - a.rating;
        return 0; // newest — preserve order
    });

    const page = filters.page ?? 1;
    const limit = filters.limit ?? PAGE_SIZE;
    const totalPages = Math.ceil(sorted.length / limit);
    const paginated = sorted.slice((page - 1) * limit, page * limit);

    useEffect(() => {
        const params: Record<string, string> = {};
        if (debouncedSearch) params.q = debouncedSearch;
        if (filters.category) params.cat = filters.category;
        setSearchParams(params, { replace: true });
    }, [debouncedSearch, filters.category, setSearchParams]);

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {/* Page header */}
            <div className="mb-6">
                <h1 className="section-title mb-1">🛍️ Cửa Hàng PetMart</h1>
                <p className="text-sm text-muted-foreground">{sorted.length} sản phẩm</p>
            </div>

            {/* Search */}
            <div className="relative mb-6">
                <input
                    type="text"
                    id="shop-search"
                    value={search}
                    onChange={(e) => { setSearch(e.target.value); setFilters((f) => ({ ...f, page: 1 })); }}
                    placeholder="🔍 Tìm kiếm thú cưng, phụ kiện..."
                    className="w-full px-5 py-3 pl-12 rounded-2xl border border-border bg-white dark:bg-card text-sm
                     focus:outline-none focus:ring-2 focus:ring-[var(--pet-coral)]/40 focus:border-[var(--pet-coral)] transition-all shadow-sm"
                />
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground text-lg">🔍</span>
            </div>

            <div className="flex gap-6">
                {/* Sidebar filters */}
                <div className="hidden lg:block">
                    <ProductFilter filters={filters} onChange={setFilters} />
                </div>

                {/* Product grid */}
                <div className="flex-1 min-w-0">
                    <ProductList products={paginated as Product[]} />
                    <Pagination page={page} totalPages={totalPages} onChange={(p) => setFilters((f) => ({ ...f, page: p }))} />
                </div>
            </div>
        </div>
    );
};

export default ProductPage;