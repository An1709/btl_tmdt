// Matches the backend Coupon model exactly
export interface Coupon {
    _id: string;
    code: string;
    discountType: "percent" | "fixed";
    value: number;             // backend field name is 'value'
    minOrderValue: number;
    expirationDate: string;    // backend field name is 'expirationDate'
    usageLimit: number;
    usedCount: number;
    createdAt: string;
    updatedAt: string;
}