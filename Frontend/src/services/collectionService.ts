import api from "@/lib/axios";
import type { Product } from "@/types/product";
import type { ApiResponse } from "@/types/api";

export const collectionService = {
    getWishlist: async (): Promise<Product[]> => {
        const res = await api.get<ApiResponse<Product[]>>("/collections/wishlist");
        return res.data.data;
    },

    addToWishlist: async (productId: string): Promise<void> => {
        await api.post("/collections/wishlist", { productId });
    },

    removeFromWishlist: async (productId: string): Promise<void> => {
        await api.delete(`/collections/wishlist/${productId}`);
    },
};