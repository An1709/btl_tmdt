import api from "@/lib/axios";
import type { ApiResponse } from "@/types/api";

export interface VNPayCreatePayload {
    orderId: string;
    amount: number;
    orderInfo?: string;
}

export interface VNPayReturnParams {
    vnp_ResponseCode: string;
    vnp_TxnRef: string;
    [key: string]: string;
}

export const paymentService = {
    createVNPayUrl: async (payload: VNPayCreatePayload): Promise<string> => {
        const res = await api.post<ApiResponse<{ payUrl: string }>>("/payment/vnpay/create", payload);
        return res.data.data.payUrl;
    },

    verifyReturn: async (params: VNPayReturnParams): Promise<{ success: boolean; message: string; orderId: string }> => {
        const res = await api.get<ApiResponse<{ success: boolean; message: string; orderId: string }>>(
            `/payment/vnpay/return?${new URLSearchParams(params).toString()}`
        );
        return res.data.data;
    },
};