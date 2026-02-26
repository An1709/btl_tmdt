export type OrderStatus = "pending" | "confirmed" | "shipping" | "delivered" | "cancelled";
export type PaymentMethod = "vnpay" | "cod";
export type PaymentStatus = "unpaid" | "paid" | "refunded";

export interface OrderItem {
    productId: string;
    productName: string;
    productImage: string;
    quantity: number;
    price: number;
}

export interface ShippingAddress {
    fullName: string;
    phone: string;
    address: string;
    city: string;
    district: string;
}

export interface Order {
    _id: string;
    userId: string;
    items: OrderItem[];
    shippingAddress: ShippingAddress;
    subtotal: number;
    discount: number;
    shippingFee: number;
    total: number;
    couponCode?: string;
    paymentMethod: PaymentMethod;
    paymentStatus: PaymentStatus;
    status: OrderStatus;
    note?: string;
    createdAt: string;
    updatedAt: string;
}