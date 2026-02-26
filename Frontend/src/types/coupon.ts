export interface Coupon {
    _id: string;
    code: string;
    discountType: "percentage" | "fixed";
    discountValue: number;
    minOrderValue: number;
    maxDiscount?: number;
    expiresAt: string;
    isActive: boolean;
    usageLimit: number;
    usedCount: number;
    createdAt: string;
}