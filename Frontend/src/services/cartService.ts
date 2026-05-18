import api from "@/lib/axios";
import type { CartItem } from "@/types/product";
import { mapProduct } from "@/services/productService";

interface CartResponse {
    items: {
        product: unknown;
        quantity: number;
    }[];
}

export interface ComboCartItemPayload {
    productId: string;
    quantity?: number;
}

const mapCart = (data: CartResponse): CartItem[] =>
    (data.items ?? [])
        .filter((item) => item.product)
        .map((item) => ({
            product: mapProduct(item.product),
            quantity: item.quantity,
        }));

export const cartService = {
    getCart: async (): Promise<CartItem[]> => {
        const res = await api.get<CartResponse>("/cart");
        return mapCart(res.data);
    },

    addItem: async (productId: string, quantity = 1): Promise<CartItem[]> => {
        const res = await api.post<CartResponse>("/cart", { productId, quantity });
        return mapCart(res.data);
    },

    addCombo: async (items: ComboCartItemPayload[]): Promise<CartItem[]> => {
        const res = await api.post<CartResponse>("/cart/add-combo", { items });
        return mapCart(res.data);
    },

    updateItem: async (productId: string, quantity: number): Promise<CartItem[]> => {
        const res = await api.put<CartResponse>(`/cart/${productId}`, { quantity });
        return mapCart(res.data);
    },

    removeItem: async (productId: string): Promise<CartItem[]> => {
        const res = await api.delete<CartResponse>(`/cart/${productId}`);
        return mapCart(res.data);
    },

    clearCart: async (): Promise<CartItem[]> => {
        const res = await api.delete<CartResponse>("/cart");
        return mapCart(res.data);
    },
};
