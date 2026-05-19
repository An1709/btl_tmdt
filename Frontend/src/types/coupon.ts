// Matches the backend Coupon model exactly
export interface Coupon {
    _id: string;
    code: string;
    discountType: "percent" | "fixed";
    value: number;             // backend field name is 'value'
    discountValue?: number;
    minOrderValue: number;
    maxDiscount?: number | null;
    expirationDate: string;    // backend field name is 'expirationDate'
    startDate?: string;
    endDate?: string;
    isActive?: boolean;
    usageLimit: number;
    usedCount: number;
    createdAt: string;
    updatedAt: string;
}
