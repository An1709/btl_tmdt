import { create } from "zustand";
import type { Product, CartItem } from "@/types/product";
import { cartService } from "@/services/cartService";

const LEGACY_CART_STORAGE_KEY = "petmart-cart";

interface CartStore {
    items: CartItem[];
    loading: boolean;
    currentUserId: string | null;
    fetchCart: (userId?: string | null) => Promise<void>;
    addItem: (product: Product, quantity?: number) => Promise<void>;
    addCombo: (items: { product: Product; quantity?: number }[]) => Promise<void>;
    removeItem: (productId: string) => Promise<void>;
    updateQty: (productId: string, quantity: number) => Promise<void>;
    clearCart: () => Promise<void>;
    clearLocalCart: () => void;
    totalCount: () => number;
    totalPrice: () => number;
}

const removeLegacyCartStorage = () => {
    localStorage.removeItem(LEGACY_CART_STORAGE_KEY);
};

export const useCartStore = create<CartStore>()((set, get) => ({
    items: [],
    loading: false,
    currentUserId: null,

    fetchCart: async (userId = null) => {
        removeLegacyCartStorage();

        if (!userId) {
            set({ items: [], currentUserId: null, loading: false });
            return;
        }

        set({ items: [], loading: true, currentUserId: userId });
        try {
            const items = await cartService.getCart();
            if (get().currentUserId === userId) {
                set({ items });
            }
        } catch {
            if (get().currentUserId === userId) {
                set({ items: [] });
            }
        } finally {
            if (get().currentUserId === userId) {
                set({ loading: false });
            }
        }
    },

    addItem: async (product: Product, quantity = 1) => {
        removeLegacyCartStorage();
        const userId = get().currentUserId;
        const items = await cartService.addItem(product.id, quantity);
        if (userId && get().currentUserId === userId) {
            set({ items });
        }
    },

    addCombo: async (comboItems) => {
        removeLegacyCartStorage();
        const userId = get().currentUserId;
        const items = await cartService.addCombo(comboItems.map((item) => ({
            productId: item.product.id,
            quantity: item.quantity ?? 1,
        })));
        if (userId && get().currentUserId === userId) {
            set({ items });
        }
    },

    removeItem: async (productId: string) => {
        removeLegacyCartStorage();
        const userId = get().currentUserId;
        const items = await cartService.removeItem(productId);
        if (userId && get().currentUserId === userId) {
            set({ items });
        }
    },

    updateQty: async (productId: string, quantity: number) => {
        removeLegacyCartStorage();
        const userId = get().currentUserId;
        const items = quantity <= 0
            ? await cartService.removeItem(productId)
            : await cartService.updateItem(productId, quantity);
        if (userId && get().currentUserId === userId) {
            set({ items });
        }
    },

    clearCart: async () => {
        removeLegacyCartStorage();
        const userId = get().currentUserId;
        const items = await cartService.clearCart();
        if (userId && get().currentUserId === userId) {
            set({ items });
        }
    },

    clearLocalCart: () => {
        removeLegacyCartStorage();
        set({ items: [], currentUserId: null, loading: false });
    },

    totalCount: () => get().items.reduce((sum, i) => sum + i.quantity, 0),

    totalPrice: () =>
        get().items.reduce((sum, i) => sum + i.product.price * i.quantity, 0),
}));
