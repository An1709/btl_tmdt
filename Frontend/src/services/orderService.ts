import api from "@/lib/axios";
import type { Order, OrderStatus, PaymentMethod } from "@/types/order";

export interface CreateOrderPayload {
    orderItems: {
        product: string;
        name: string;
        qty: number;
        price: number;
        image: string;
    }[];
    shippingAddress: {
        address: string;
        city: string;
        phone: string;
    };
    paymentMethod: PaymentMethod;
    itemsPrice: number;
    shippingPrice: number;
    totalPrice: number;
    discountAmount?: number;
    coupon?: string; // couponId
}

export const orderService = {
    createOrder: async (payload: CreateOrderPayload): Promise<Order & { paymentUrl?: string }> => {
        const res = await api.post<Order & { paymentUrl?: string }>("/orders", payload);
        return res.data;
    },

    getMyOrders: async (): Promise<Order[]> => {
        const res = await api.get<Order[]>("/orders/myorders");
        return res.data;
    },

    getOrderById: async (id: string): Promise<Order> => {
        const res = await api.get<Order>(`/orders/${id}`);
        return res.data;
    },

    getAllOrders: async (page = 1, limit = 20): Promise<{ orders: Order[]; total: number }> => {
        const res = await api.get<Order[]>(`/orders?page=${page}&limit=${limit}`);
        const orders = Array.isArray(res.data) ? res.data : [];
        return { orders, total: orders.length };
    },

    updateStatus: async (id: string, status: OrderStatus): Promise<Order> => {
        const res = await api.put<Order>(`/orders/${id}/status`, { status });
        return res.data;
    },

    cancelOrder: async (id: string): Promise<void> => {
        await api.put(`/orders/${id}/cancel`);
    },
};