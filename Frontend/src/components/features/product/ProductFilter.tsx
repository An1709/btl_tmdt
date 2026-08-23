import { useEffect, useState } from "react";
import { SlidersHorizontal } from "lucide-react";
import { categoryService, type DbCategory } from "@/services/categoryService";
import type { ProductFilters } from "@/services/productService";
import { Button } from "@/components/ui/button";

interface ProductFilterProps {
    filters: ProductFilters;
    onChange: (filters: ProductFilters) => void;
    variant?: "sidebar" | "panel";
    showSort?: boolean;
}

const SORT_OPTIONS = [
    { value: "newest", label: "Mới nhất" },
    { value: "popular", label: "Phổ biến nhất" },
    { value: "price_asc", label: "Giá tăng dần" },
    { value: "price_desc", label: "Giá giảm dần" },
] as const;

const PRICE_PRESETS = [
    { label: "Tất cả", min: undefined, max: undefined },
    { label: "Dưới 500K", min: 0, max: 500_000 },
    { label: "500K – 2M", min: 500_000, max: 2_000_000 },
    { label: "2M – 10M", min: 2_000_000, max: 10_000_000 },
    { label: "Trên 10M", min: 10_000_000, max: undefined },
];

const ALL_ENTRY: DbCategory = { _id: "", name: "Tất cả", slug: "" };

const ProductFilter = ({ filters, onChange, variant = "sidebar", showSort = true }: ProductFilterProps) => {
    const [categories, setCategories] = useState<DbCategory[]>([ALL_ENTRY]);
    const isSidebar = variant === "sidebar";
    const set = (partial: Partial<ProductFilters>) => onChange({ ...filters, ...partial, page: 1 });
    const reset = () => onChange({ page: 1, limit: filters.limit, sort: "newest" });

    useEffect(() => {
        categoryService.getAll()
            .then((cats) => setCategories([ALL_ENTRY, ...cats]))
            .catch(() => { /* Keep the all-categories option when category loading fails. */ });
    }, []);

    const content = (
        <div className="flex flex-col gap-6">
            <div className="flex items-center justify-between gap-3">
                <h2 className="flex items-center gap-2 text-base font-semibold text-text-strong">
                    <SlidersHorizontal aria-hidden="true" className="size-4 text-primary" />
                    Bộ lọc
                </h2>
                <Button type="button" variant="link" size="sm" onClick={reset} className="h-auto px-0 text-muted-foreground">
                    Xóa bộ lọc
                </Button>
            </div>

            <fieldset>
                <legend className="mb-2 text-sm font-semibold text-text-strong">Danh mục</legend>
                <div className="flex flex-wrap gap-2">
                    {categories.map((category) => {
                        const isActive = (filters.category ?? "") === category.slug;
                        return (
                            <button
                                key={category._id || "all"}
                                type="button"
                                onClick={() => set({ category: category.slug || undefined })}
                                aria-pressed={isActive}
                                className={`min-h-10 rounded-md border px-3 py-2 text-left text-sm font-medium transition-colors ${
                                    isActive
                                        ? "border-primary bg-primary text-primary-foreground"
                                        : "border-border bg-surface text-muted-foreground hover:border-border-strong hover:bg-surface-subtle hover:text-text-strong"
                                }`}
                            >
                                {category.name}
                            </button>
                        );
                    })}
                </div>
            </fieldset>

            <fieldset>
                <legend className="mb-2 text-sm font-semibold text-text-strong">Khoảng giá</legend>
                <div className="flex flex-col gap-1">
                    {PRICE_PRESETS.map((preset) => {
                        const isActive = filters.minPrice === preset.min && filters.maxPrice === preset.max;
                        return (
                            <button
                                key={preset.label}
                                type="button"
                                onClick={() => set({ minPrice: preset.min, maxPrice: preset.max })}
                                aria-pressed={isActive}
                                className={`min-h-10 rounded-md px-3 py-2 text-left text-sm font-medium transition-colors ${
                                    isActive ? "bg-primary-subtle text-primary-subtle-foreground" : "text-muted-foreground hover:bg-surface-subtle hover:text-text-strong"
                                }`}
                            >
                                {preset.label}
                            </button>
                        );
                    })}
                </div>
            </fieldset>

            {showSort && (
                <label className="block text-sm font-semibold text-text-strong">
                    <span className="mb-2 block">Sắp xếp</span>
                    <select
                        value={filters.sort ?? "newest"}
                        onChange={(event) => set({ sort: event.target.value as ProductFilters["sort"] })}
                        className="h-11 w-full rounded-md border border-border-strong bg-surface px-3 text-sm font-normal text-foreground shadow-elevation-1 outline-none transition-[border-color,box-shadow] focus-visible:border-focus focus-visible:ring-[3px] focus-visible:ring-focus/45"
                    >
                        {SORT_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                    </select>
                </label>
            )}
        </div>
    );

    if (!isSidebar) return <div>{content}</div>;

    return (
        <aside className="w-72 shrink-0" aria-label="Bộ lọc sản phẩm">
            <div className="sticky top-24 rounded-lg border border-border bg-surface-elevated p-5 shadow-elevation-1">
                {content}
            </div>
        </aside>
    );
};

export { SORT_OPTIONS };
export default ProductFilter;
