import api from "@/lib/axios";

export interface VNPayCreatePayload {
    orderId: string;
    bankCode?: string;
}

export const paymentService = {
    // Backend route: POST /api/payment/create_payment_url
    // Response: { paymentUrl: string }
    createVNPayUrl: async (payload: VNPayCreatePayload): Promise<string> => {
        const res = await api.post<{ paymentUrl: string }>("/payment/create_payment_url", payload);
        return res.data.paymentUrl;
    },
};
