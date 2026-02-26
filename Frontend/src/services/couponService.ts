import api from "@/lib/axios";
import type { Coupon } from "@/types/coupon";
import type { ApiResponse } from "@/types/api";

export interface ApplyCouponResult {
    discountAmount: number;
    coupon: Coupon;
}

export const couponService = {
    checkCoupon: async (code: string, orderTotal: number): Promise<ApplyCouponResult> => {
        const res = await api.post<ApiResponse<ApplyCouponResult>>("/coupons/check", {
            code,
            orderTotal,
        });
        return res.data.data;
    },

    getAllCoupons: async (): Promise<Coupon[]> => {
        const res = await api.get<ApiResponse<Coupon[]>>("/coupons");
        return res.data.data;
    },

    createCoupon: async (data: Omit<Coupon, "_id" | "usedCount" | "createdAt">): Promise<Coupon> => {
        const res = await api.post<ApiResponse<Coupon>>("/coupons", data);
        return res.data.data;
    },

    updateCoupon: async (id: string, data: Partial<Coupon>): Promise<Coupon> => {
        const res = await api.put<ApiResponse<Coupon>>(`/coupons/${id}`, data);
        return res.data.data;
    },

    deleteCoupon: async (id: string): Promise<void> => {
        await api.delete(`/coupons/${id}`);
    },
};