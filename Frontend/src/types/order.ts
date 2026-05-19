export type OrderStatus = "Pending" | "Processing" | "Shipping" | "Delivered" | "Cancelled";
export type PaymentMethod = "vnpay" | "cod";

export interface OrderItem {
    product: string;
    name: string;
    qty: number;
    price: number;
    image?: string;
}

export interface OrderStatusHistoryItem {
    status: OrderStatus | "Created" | "CancelRequested" | "CancelRejected";
    note?: string;
    updatedAt?: string;
    updatedBy?: string;
    updatedByRole?: string;
}

export interface ShippingAddress {
    fullName?: string;
    address: string;
    city: string;
    phone: string;
    district?: string;
    province?: string;
    ward?: string;
    streetAddress?: string;
    fullAddress?: string;
}

export interface Order {
    _id: string;
    user: string;
    orderItems: OrderItem[];
    shippingAddress: ShippingAddress;
    paymentMethod: PaymentMethod;
    itemsPrice: number;
    shippingPrice: number;
    discountAmount: number;
    totalPrice: number;
    isPaid: boolean;
    paidAt?: string;
    isDelivered: boolean;
    deliveredAt?: string;
    loyaltyPointsAwarded?: boolean;
    loyaltyPoints?: number;
    loyaltyAwardedAt?: string;
    status: OrderStatus;
    cancelRequested?: boolean;
    cancelReason?: string;
    cancelRequestedAt?: string;
    cancelStatus?: "none" | "pending" | "approved" | "rejected";
    cancelResolvedAt?: string;
    cancelRejectionReason?: string;
    statusHistory?: OrderStatusHistoryItem[];
    coupon?: string;
    createdAt: string;
    updatedAt: string;
}
