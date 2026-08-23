import { useEffect, useMemo, useState } from "react";
import { Filter, SlidersHorizontal } from "lucide-react";
import { useSearchParams } from "react-router";
import type { ProductFilters } from "@/services/productService";
import type { Product } from "@/types/product";
import { useProducts } from "@/hooks/useProducts";
import ProductFilter, { SORT_OPTIONS } from "@/components/features/product/ProductFilter";
import ProductList from "@/components/features/product/ProductList";
import Pagination from "@/components/common/Pagination";
import ProductSearchBox from "@/components/common/ProductSearchBox";
import { Button } from "@/components/ui/button";
import { Dialog, DialogFooter } from "@/components/ui/dialog";
import { EmptyState, ErrorState } from "@/components/ui/feedback-state";
import { Select } from "@/components/ui/select";
import { PAGE_SIZE } from "@/utils/constants";

const ProductSkeleton = () => (
    <div className="overflow-hidden rounded-lg border border-border bg-surface-elevated shadow-elevation-1">
        <div className="aspect-square w-full animate-pulse bg-muted" />
        <div className="flex min-h-56 flex-col gap-3 p-4">
            <div className="h-4 w-4/5 animate-pulse rounded bg-muted" />
            <div className="h-3 w-2/5 animate-pulse rounded bg-muted" />
            <div className="mt-auto flex items-end gap-2">
                <div className="h-6 w-2/5 animate-pulse rounded bg-muted" />
                <div className="h-3 w-1/4 animate-pulse rounded bg-muted" />
            </div>
            <div className="mt-2 grid grid-cols-2 gap-2">
                <div className="h-11 animate-pulse rounded-md bg-muted" />
                <div className="h-11 animate-pulse rounded-md bg-muted" />
            </div>
        </div>
    </div>
);

const getPriceFilterLabel = (filters: ProductFilters) => {
    if (filters.minPrice === 0 && filters.maxPrice === 500_000) return "Dưới 500K";
    if (filters.minPrice === 500_000 && filters.maxPrice === 2_000_000) return "500K – 2M";
    if (filters.minPrice === 2_000_000 && filters.maxPrice === 10_000_000) return "2M – 10M";
    if (filters.minPrice === 10_000_000 && filters.maxPrice === undefined) return "Trên 10M";
    return null;
};

const ProductPage = () => {
    const [searchParams, setSearchParams] = useSearchParams();
    const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
    const [filters, setFilters] = useState<ProductFilters>({
        page: 1,
        limit: PAGE_SIZE,
        category: searchParams.get("cat") || undefined,
        sort: "newest",
    });
    const submittedSearch = searchParams.get("q") || undefined;
    const searchKey = searchParams.toString();

    useEffect(() => {
        const params = new URLSearchParams(searchParams);
        if (submittedSearch) params.set("q", submittedSearch);
        else params.delete("q");
        if (filters.category) params.set("cat", filters.category);
        else params.delete("cat");

        if (params.toString() !== searchKey) {
            setSearchParams(params, { replace: true });
        }
    }, [filters.category, searchKey, searchParams, setSearchParams, submittedSearch]);

    const { products, total, totalPages, loading, error, refetch } = useProducts({
        ...filters,
        search: submittedSearch,
    });

    const activeFilters = useMemo(() => {
        const entries: Array<{ key: "category" | "price" | "sort"; label: string }> = [];
        if (filters.category) entries.push({ key: "category", label: `Danh mục: ${filters.category}` });
        const priceLabel = getPriceFilterLabel(filters);
        if (priceLabel) entries.push({ key: "price", label: `Giá: ${priceLabel}` });
        if (filters.sort && filters.sort !== "newest") {
            entries.push({ key: "sort", label: `Sắp xếp: ${SORT_OPTIONS.find((option) => option.value === filters.sort)?.label ?? filters.sort}` });
        }
        return entries;
    }, [filters]);

    const resetFilters = () => setFilters((current) => ({ page: 1, limit: current.limit ?? PAGE_SIZE, sort: "newest" }));
    const removeFilter = (key: "category" | "price" | "sort") => {
        setFilters((current) => {
            if (key === "category") return { ...current, category: undefined, page: 1 };
            if (key === "price") return { ...current, minPrice: undefined, maxPrice: undefined, page: 1 };
            return { ...current, sort: "newest", page: 1 };
        });
    };

    return (
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 lg:py-10">
            <header className="max-w-3xl">
                <h1 className="section-title">Cửa hàng PetMart</h1>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                    Tìm thức ăn, phụ kiện và người bạn mới phù hợp với thú cưng của bạn.
                </p>
            </header>

            <section aria-label="Tìm kiếm sản phẩm" className="mt-6 rounded-lg border border-border bg-surface-elevated p-4 shadow-elevation-1 sm:p-5">
                <ProductSearchBox
                    initialValue={searchParams.get("q") || ""}
                    inputId="shop-search"
                    formClassName="flex flex-col gap-3 sm:flex-row"
                    inputClassName="h-12 w-full rounded-md border border-border-strong bg-surface py-2 pl-11 pr-11 text-sm text-foreground shadow-elevation-1 outline-none transition-[border-color,box-shadow] placeholder:text-muted-foreground focus-visible:border-focus focus-visible:ring-[3px] focus-visible:ring-focus/45"
                    buttonClassName="btn-pet-primary h-12 justify-center px-6 text-sm"
                    showLeadingIcon
                    onSearchComplete={() => setFilters((current) => ({ ...current, page: 1 }))}
                />
            </section>

            <div className="mt-6 flex flex-col gap-4 border-b border-divider pb-4 lg:flex-row lg:items-center lg:justify-between">
                <p className="text-sm text-muted-foreground" aria-live="polite">
                    {loading ? "Đang tải sản phẩm…" : `${total} sản phẩm${submittedSearch ? ` cho “${submittedSearch}”` : ""}`}
                </p>
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                    <Button type="button" variant="outline" className="lg:hidden" onClick={() => setMobileFiltersOpen(true)}>
                        <Filter aria-hidden="true" /> Bộ lọc
                    </Button>
                    <label className="flex min-h-11 items-center gap-2 text-sm font-medium text-muted-foreground">
                        <SlidersHorizontal aria-hidden="true" className="size-4" />
                        <span className="shrink-0">Sắp xếp</span>
                        <Select
                            aria-label="Sắp xếp sản phẩm"
                            value={filters.sort ?? "newest"}
                            onChange={(event) => setFilters((current) => ({ ...current, sort: event.target.value as ProductFilters["sort"], page: 1 }))}
                            className="w-full min-w-44"
                        >
                            {SORT_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                        </Select>
                    </label>
                </div>
            </div>

            {activeFilters.length > 0 && (
                <div className="mt-4 flex flex-wrap items-center gap-2" aria-label="Bộ lọc đang áp dụng">
                    <span className="text-sm font-medium text-muted-foreground">Đang lọc:</span>
                    {activeFilters.map((filter) => (
                        <button
                            key={filter.key}
                            type="button"
                            onClick={() => removeFilter(filter.key)}
                            className="inline-flex min-h-9 items-center rounded-full border border-border bg-surface px-3 text-sm font-medium text-text-strong transition-colors hover:border-primary hover:bg-primary-subtle hover:text-primary"
                            aria-label={`Bỏ ${filter.label}`}
                        >
                            {filter.label} <span aria-hidden="true" className="ml-2 text-muted-foreground">×</span>
                        </button>
                    ))}
                    <Button type="button" variant="link" size="sm" onClick={resetFilters} className="h-auto px-1">Xóa tất cả</Button>
                </div>
            )}

            <div className="mt-6 flex gap-6">
                <div className="hidden lg:block">
                    <ProductFilter filters={filters} onChange={setFilters} showSort={false} />
                </div>

                <section className="min-w-0 flex-1" aria-label="Danh sách sản phẩm">
                    {error && !loading && (
                        <ErrorState
                            title="Chưa thể tải sản phẩm"
                            description={error}
                            action={<Button type="button" onClick={refetch}>Thử lại</Button>}
                        />
                    )}

                    {loading && (
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
                            {Array.from({ length: PAGE_SIZE }).map((_, index) => <ProductSkeleton key={index} />)}
                        </div>
                    )}

                    {!loading && !error && products.length === 0 && (
                        <EmptyState
                            title="Không tìm thấy sản phẩm phù hợp"
                            description="Hãy thử đổi từ khóa tìm kiếm hoặc bớt điều kiện lọc để xem thêm sản phẩm."
                            action={<Button type="button" variant="outline" onClick={resetFilters}>Đặt lại bộ lọc</Button>}
                        />
                    )}

                    {!loading && !error && products.length > 0 && (
                        <>
                            <ProductList products={products as Product[]} />
                            <Pagination
                                page={filters.page ?? 1}
                                totalPages={totalPages}
                                onChange={(page) => setFilters((current) => ({ ...current, page }))}
                            />
                        </>
                    )}
                </section>
            </div>

            <Dialog
                open={mobileFiltersOpen}
                onOpenChange={setMobileFiltersOpen}
                title="Lọc sản phẩm"
                description="Chọn danh mục và khoảng giá phù hợp. Kết quả sẽ cập nhật ngay."
                size="md"
                footer={
                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={resetFilters}>Xóa bộ lọc</Button>
                        <Button type="button" onClick={() => setMobileFiltersOpen(false)}>Xem sản phẩm</Button>
                    </DialogFooter>
                }
            >
                <ProductFilter filters={filters} onChange={setFilters} variant="panel" showSort={false} />
            </Dialog>
        </div>
    );
};

export default ProductPage;
