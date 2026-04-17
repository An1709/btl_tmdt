import api from "@/lib/axios";

export interface CouponCheckResult {
    valid: boolean;
    discountAmount: number;
    couponId: string;
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

    getAllCoupons: async () => {
        const res = await api.get("/coupons");
        return res.data;
    },

    createCoupon: async (data: Record<string, unknown>) => {
        const res = await api.post("/coupons", data);
        return res.data;
    },

    updateCoupon: async (id: string, data: Record<string, unknown>) => {
        const res = await api.put(`/coupons/${id}`, data);
        return res.data;
    },

    deleteCoupon: async (id: string): Promise<void> => {
        await api.delete(`/coupons/${id}`);
    },
};