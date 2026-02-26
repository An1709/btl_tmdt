export type WarrantyStatus = "pending" | "processing" | "resolved" | "rejected";

export interface WarrantyRequest {
    _id: string;
    userId: string;
    username?: string;
    orderId: string;
    productId: string;
    productName: string;
    issue: string;
    description: string;
    images: string[];
    status: WarrantyStatus;
    adminNote?: string;
    createdAt: string;
    updatedAt: string;
}