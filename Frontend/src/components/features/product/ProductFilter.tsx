import { useEffect, useState } from "react";
import { categoryService, type DbCategory } from "@/services/categoryService";
import type { ProductFilters } from "@/services/productService";

interface ProductFilterProps {
    filters: ProductFilters;
    onChange: (filters: ProductFilters) => void;
}

const SORT_OPTIONS = [
    { value: "newest", label: "Mới nhất" },
    { value: "popular", label: "Phổ biến nhất" },
    { value: "price_asc", label: "Giá tăng dần" },
    { value: "price_desc", label: "Giá giảm dần" },
] as const;

const PRICE_PRESETS = [
    { label: "Tất cả", min: undefined, max: undefined },
    { label: "< 500K", min: 0, max: 500_000 },
    { label: "500K – 2M", min: 500_000, max: 2_000_000 },
    { label: "2M – 10M", min: 2_000_000, max: 10_000_000 },
    { label: "> 10M", min: 10_000_000, max: undefined },
];

// Placeholder entry for "all categories"
const ALL_ENTRY: DbCategory = { _id: "", name: "Tất Cả", slug: "" };

const ProductFilter = ({ filters, onChange }: ProductFilterProps) => {
    const set = (partial: Partial<ProductFilters>) =>
        onChange({ ...filters, ...partial, page: 1 });

    const [categories, setCategories] = useState<DbCategory[]>([ALL_ENTRY]);

    useEffect(() => {
        categoryService.getAll()
            .then((cats) => setCategories([ALL_ENTRY, ...cats]))
            .catch(() => {/* silently keep the "Tất Cả" fallback */ });
    }, []);

    return (
        <aside className="w-64 shrink-0">
            <div className="sticky top-24 bg-white dark:bg-card rounded-2xl border border-border shadow-sm p-5 flex flex-col gap-6">
                <h3 className="font-bold text-foreground" style={{ fontFamily: "'Nunito', sans-serif" }}>
                    🔍 Bộ lọc
                </h3>

                {/* Category — loaded from DB */}
                <div>
                    <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">Loại</p>
                    <div className="flex flex-col gap-1">
                        {categories.map((cat) => {
                            const isActive = (filters.category ?? "") === cat.slug;
                            return (
                                <button
                                    key={cat._id || "all"}
                                    onClick={() => set({ category: cat.slug || undefined })}
                                    className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-semibold text-left transition-all
                                        ${isActive
                                            ? "bg-[var(--pet-coral)] text-white shadow-sm"
                                            : "text-muted-foreground hover:text-[var(--pet-coral)] hover:bg-red-50 dark:hover:bg-red-950/30"
                                        }`}
                                >
                                    {cat.name}
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Price */}
                <div>
                    <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">Giá</p>
                    <div className="flex flex-col gap-1">
                        {PRICE_PRESETS.map((p) => {
                            const isActive =
                                (filters.minPrice ?? undefined) === p.min &&
                                (filters.maxPrice ?? undefined) === p.max;
                            return (
                                <button
                                    key={p.label}
                                    onClick={() => set({ minPrice: p.min, maxPrice: p.max })}
                                    className={`px-3 py-2 rounded-xl text-sm font-semibold text-left transition-all
                                        ${isActive
                                            ? "bg-[var(--pet-coral)] text-white shadow-sm"
                                            : "text-muted-foreground hover:text-[var(--pet-coral)] hover:bg-red-50 dark:hover:bg-red-950/30"
                                        }`}
                                >
                                    {p.label}
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Sort */}
                <div>
                    <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">Sắp xếp</p>
                    <select
                        value={filters.sort ?? "newest"}
                        onChange={(e) => set({ sort: e.target.value as ProductFilters["sort"] })}
                        className="w-full px-3 py-2 rounded-xl border border-border bg-muted/30 text-sm text-foreground
                                   focus:outline-none focus:ring-2 focus:ring-[var(--pet-coral)]/40 cursor-pointer"
                    >
                        {SORT_OPTIONS.map((o) => (
                            <option key={o.value} value={o.value}>{o.label}</option>
                        ))}
                    </select>
                </div>

                {/* Reset */}
                <button
                    onClick={() => onChange({ page: 1, limit: 12 })}
                    className="text-sm text-muted-foreground hover:text-[var(--pet-coral)] transition-colors underline underline-offset-2 text-left"
                >
                    Xóa bộ lọc
                </button>
            </div>
        </aside>
    );
};

export default ProductFilter;