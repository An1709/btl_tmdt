import api from "@/lib/axios";
import type { Product } from "@/types/product";
import type { ApiResponse, PaginatedResponse } from "@/types/api";

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

export const productService = {
    getAll: async (filters: ProductFilters = {}): Promise<PaginatedResponse<Product>> => {
        const params = new URLSearchParams();
        Object.entries(filters).forEach(([k, v]) => {
            if (v !== undefined && v !== "") params.append(k, String(v));
        });
        const res = await api.get<ApiResponse<PaginatedResponse<Product>>>(
            `/products?${params.toString()}`
        );
        return res.data.data;
    },

    getById: async (id: string): Promise<Product> => {
        const res = await api.get<ApiResponse<Product>>(`/products/${id}`);
        return res.data.data;
    },

    create: async (data: FormData): Promise<Product> => {
        const res = await api.post<ApiResponse<Product>>("/products", data, {
            headers: { "Content-Type": "multipart/form-data" },
        });
        return res.data.data;
    },

    update: async (id: string, data: FormData): Promise<Product> => {
        const res = await api.put<ApiResponse<Product>>(`/products/${id}`, data, {
            headers: { "Content-Type": "multipart/form-data" },
        });
        return res.data.data;
    },

    delete: async (id: string): Promise<void> => {
        await api.delete(`/products/${id}`);
    },

    submitReview: async (productId: string, payload: ReviewPayload): Promise<void> => {
        await api.post(`/products/${productId}/reviews`, payload);
    },
};