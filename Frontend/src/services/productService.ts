import api from "@/lib/axios";
import type { Product, ProductBadge, ProductCategory } from "@/types/product";
import type { PaginatedResponse } from "@/types/api";
import { categoryService } from "@/services/categoryService";


export interface ProductFilters {
    page?: number;
    limit?: number;
    category?: string;
    search?: string;
    minPrice?: number;
    maxPrice?: number;
    sort?: "price_asc" | "price_desc" | "newest" | "popular";
}

export interface ReviewPayload {
    rating: number;
    comment: string;
}

// ── Adapter: normalise MongoDB document → frontend Product ─────────────────
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mapProduct = (raw: any): Product => ({
    id: raw._id ?? raw.id,
    name: raw.name ?? "",
    // breed & age live inside specifications (Map) if present
    breed: raw.specifications?.get?.("Giống") ?? raw.specifications?.Giống ?? (raw.breed ?? ""),
    age: raw.specifications?.get?.("Tuổi") ?? raw.specifications?.Tuổi ?? (raw.age ?? ""),
    price: raw.price ?? 0,
    originalPrice: raw.originalPrice ?? undefined,
    // backend stores images as an array; take first one
    image: Array.isArray(raw.images) && raw.images.length > 0 ? raw.images[0] : (raw.image ?? ""),
    // category may be a populated object or a plain string/id
    category: (typeof raw.category === "object" && raw.category !== null
        ? (raw.category.slug ?? raw.category.name ?? "accessory")
        : (raw.category ?? "accessory")) as ProductCategory,
    rating: raw.averageRating ?? raw.rating ?? 0,
    reviewCount: raw.reviewCount ?? 0,
    // derive badge: sale if discounted, hot if sold >200, new otherwise
    badge: (raw.originalPrice && raw.originalPrice > raw.price
        ? "sale"
        : raw.sold > 200
            ? "hot"
            : raw.badge ?? undefined) as ProductBadge | undefined,
    description: raw.description ?? "",
    inStock: (raw.stock ?? 0) > 0,
});

// ── Backend response type (raw, before mapping) ────────────────────────────
interface RawProductListResponse {
    products: unknown[];
    page: number;
    pages: number;   // total pages
    total: number;
}

interface RawSingleResponse {
    // controller returns the document directly (no wrapper)
    [key: string]: unknown;
}

export const productService = {
    /** Fetch paginated product list. Adapts backend { products, page, pages, total } */
    getAll: async (filters: ProductFilters = {}): Promise<PaginatedResponse<Product>> => {
        const params = new URLSearchParams();

        // Map frontend filter keys → query params the backend understands
        if (filters.page) params.append("page", String(filters.page));
        if (filters.limit) params.append("limit", String(filters.limit));
        if (filters.search) params.append("keyword", filters.search);  // backend uses "keyword"

        // ── KEY FIX: resolve category slug → MongoDB ObjectId ──────────────
        // Product.category is an ObjectId ref in MongoDB, not a plain string.
        // resolveId returns null when the slug isn't in the DB — in that case
        // we skip the filter entirely to avoid a Mongoose CastError → 500.
        if (filters.category) {
            const resolvedId = await categoryService.resolveId(filters.category);
            if (resolvedId) params.append("category", resolvedId);
        }

        if (filters.minPrice) params.append("price[gte]", String(filters.minPrice));
        if (filters.maxPrice) params.append("price[lte]", String(filters.maxPrice));

        // Map frontend sort labels → backend sort strings
        const sortMap: Record<string, string> = {
            price_asc: "price",
            price_desc: "-price",
            popular: "-sold",
            newest: "-createdAt",
        };
        if (filters.sort) params.append("sort", sortMap[filters.sort] ?? "-createdAt");

        const res = await api.get<RawProductListResponse>(`/products?${params.toString()}`);
        const raw = res.data;

        return {
            data: (raw.products ?? []).map(mapProduct),
            total: raw.total ?? 0,
            page: raw.page ?? 1,
            limit: filters.limit ?? 10,
            totalPages: raw.pages ?? 1,
        };
    },


    /** Fetch a single product by id. Backend returns the document directly. */
    getById: async (id: string): Promise<Product> => {
        const res = await api.get<RawSingleResponse>(`/products/${id}`);
        return mapProduct(res.data);
    },

    create: async (data: FormData): Promise<Product> => {
        const res = await api.post<RawSingleResponse>("/products", data, {
            headers: { "Content-Type": "multipart/form-data" },
        });
        return mapProduct(res.data);
    },

    update: async (id: string, data: FormData): Promise<Product> => {
        const res = await api.put<RawSingleResponse>(`/products/${id}`, data, {
            headers: { "Content-Type": "multipart/form-data" },
        });
        return mapProduct(res.data);
    },

    delete: async (id: string): Promise<void> => {
        await api.delete(`/products/${id}`);
    },

    submitReview: async (productId: string, payload: ReviewPayload): Promise<void> => {
        await api.post(`/products/${productId}/reviews`, payload);
    },
};