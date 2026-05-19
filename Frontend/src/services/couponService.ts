import api from "@/lib/axios";
import type { Coupon } from "@/types/coupon";

export interface CouponCheckResult {
    valid: boolean;
    discountAmount: number;
    couponId: string;
}

export interface CouponPayload {
    code: string;
    discountType: "percent" | "fixed";
    discountValue: number;
    minOrderValue: number;
    usageLimit: number;
    endDate: string;
}

export const couponService = {
    // POST /api/coupons/check — backend returns { valid, discountAmount, couponId } directly (no ApiResponse wrapper)
    checkCoupon: async (code: string, orderTotal: number): Promise<CouponCheckResult> => {
        const res = await api.post<CouponCheckResult>("/coupons/check", {
            code,
            orderTotal,
        });
        return res.data;
    },

    getAllCoupons: async (limit?: number): Promise<Coupon[]> => {
        const res = await api.get<Coupon[]>("/coupons", {
            params: limit ? { limit } : undefined,
        });
        return res.data;
    },

    createCoupon: async (data: CouponPayload): Promise<Coupon> => {
        const res = await api.post<Coupon>("/coupons", data);
        return res.data;
    },

    updateCoupon: async (id: string, data: CouponPayload): Promise<Coupon> => {
        const res = await api.patch<Coupon>(`/coupons/${id}`, data);
        return res.data;
    },

    deleteCoupon: async (id: string): Promise<void> => {
        await api.delete(`/coupons/${id}`);
    },
};
