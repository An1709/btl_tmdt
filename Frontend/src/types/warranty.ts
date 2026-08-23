export type WarrantyStatus = "Pending" | "Approved" | "Rejected" | "Completed";

export interface WarrantyUserReference {
    _id: string;
    username?: string;
    displayName?: string;
    email?: string;
    phone?: string;
}

export interface WarrantyProductReference {
    _id: string;
    name?: string;
    price?: number;
    image?: string;
}

export interface WarrantyRequest {
    _id: string;
    user: string | WarrantyUserReference;
    order: string;
    product: string | WarrantyProductReference;
    reason: string;
    images: string[];
    status: WarrantyStatus;
    adminResponse?: string;
    createdAt: string;
    updatedAt: string;
}
