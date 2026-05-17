import api from "@/lib/axios";
import type { Product } from "@/types/product";
import { mapProduct } from "@/services/productService";

interface WishlistResponse {
    products: unknown[];
}

export const collectionService = {
    getWishlist: async (): Promise<Product[]> => {
        const res = await api.get<WishlistResponse>("/collection");
        return (res.data.products ?? []).map(mapProduct);
    },

    addToWishlist: async (productId: string): Promise<void> => {
        await api.post("/collection", { productId });
    },

    removeFromWishlist: async (productId: string): Promise<void> => {
        await api.delete(`/collection/${productId}`);
    },
};
