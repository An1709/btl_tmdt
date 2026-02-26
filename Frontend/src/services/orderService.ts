import api from "@/lib/axios";
import type { Order, OrderStatus, ShippingAddress, PaymentMethod } from "@/types/order";
import type { ApiResponse } from "@/types/api";

export interface CreateOrderPayload {
    items: { productId: string; quantity: number }[];
    shippingAddress: ShippingAddress;
    paymentMethod: PaymentMethod;
    couponCode?: string;
    note?: string;
}

export const orderService = {
    createOrder: async (payload: CreateOrderPayload): Promise<Order> => {
        const res = await api.post<ApiResponse<Order>>("/orders", payload);
        return res.data.data;
    },

    getMyOrders: async (): Promise<Order[]> => {
        const res = await api.get<ApiResponse<Order[]>>("/orders/my");
        return res.data.data;
    },

    getOrderById: async (id: string): Promise<Order> => {
        const res = await api.get<ApiResponse<Order>>(`/orders/${id}`);
        return res.data.data;
    },

    getAllOrders: async (page = 1, limit = 20): Promise<{ orders: Order[]; total: number }> => {
        const res = await api.get<ApiResponse<{ orders: Order[]; total: number }>>(
            `/orders?page=${page}&limit=${limit}`
        );
        return res.data.data;
    },

    updateStatus: async (id: string, status: OrderStatus): Promise<Order> => {
        const res = await api.put<ApiResponse<Order>>(`/orders/${id}/status`, { status });
        return res.data.data;
    },

    cancelOrder: async (id: string): Promise<void> => {
        await api.put(`/orders/${id}/cancel`);
    },
};