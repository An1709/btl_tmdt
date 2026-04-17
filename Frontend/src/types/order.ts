export type OrderStatus = "Pending" | "Processing" | "Shipping" | "Delivered" | "Cancelled";
export type PaymentMethod = "vnpay" | "cod";

export interface OrderItem {
    product: string;
    name: string;
    qty: number;
    price: number;
    image?: string;
}

export interface ShippingAddress {
    fullName?: string;  // stored by frontend only, not in backend model
    address: string;
    city: string;
    phone: string;
    district?: string;  // frontend extra field
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
    status: OrderStatus;
    coupon?: string;
    createdAt: string;
    updatedAt: string;
}