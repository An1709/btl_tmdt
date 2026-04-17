import api from "@/lib/axios";

export interface VNPayCreatePayload {
    amount: number;
    bankCode?: string;
    orderId?: string;
    orderInfo?: string;
}

export const paymentService = {
    // Backend route: POST /api/payment/create_payment_url
    // Response: { paymentUrl: string }
    createVNPayUrl: async (payload: VNPayCreatePayload): Promise<string> => {
        const res = await api.post<{ paymentUrl: string }>("/payment/create_payment_url", payload);
        return res.data.paymentUrl;
    },

    // Backend route: GET /api/payment/vnpay_return
    // Response: { status: string; code: string }
    verifyReturn: async (params: Record<string, string>): Promise<{ status: string; code: string }> => {
        const res = await api.get<{ status: string; code: string }>(
            `/payment/vnpay_return?${new URLSearchParams(params).toString()}`
        );
        return res.data;
    },
};