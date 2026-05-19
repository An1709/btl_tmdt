import api from "@/lib/axios";
import type { OrderStatus } from "@/types/order";

export interface DashboardOverview {
    totalRevenue: number;
    totalOrders: number;
    totalUsers: number;
    totalProducts: number;
    pendingOrders: number;
    cancelledOrders: number;
    lowStockProducts: number;
    newUsers: number;
}

export interface RevenuePoint {
    date: string;
    revenue: number;
    orders: number;
}

export interface OrderStatusStat {
    status: OrderStatus | "CancelRequested";
    label: string;
    count: number;
}

export interface PaymentMethodStat {
    method: "COD" | "VNPay" | string;
    count: number;
    paidOrders: number;
    revenue: number;
}

export interface TopSellingProduct {
    productId: string;
    name: string;
    soldQuantity: number;
    revenue: number;
}

export interface RecentDashboardOrder {
    id: string;
    orderCode: string;
    customer: {
        name: string;
        email: string;
    };
    totalAmount: number;
    status: OrderStatus;
    paymentMethod: string;
    isPaid: boolean;
    createdAt: string;
}

export interface LowStockProduct {
    id: string;
    name: string;
    stock: number;
    category: {
        name?: string;
        slug?: string;
    } | null;
}

export interface BestCustomer {
    userId: string;
    name: string;
    email: string;
    totalSpent: number;
    orderCount: number;
}

export interface AdminDashboardStats {
    overview: DashboardOverview;
    revenueChart: RevenuePoint[];
    orderStatusStats: OrderStatusStat[];
    paymentMethodStats: PaymentMethodStat[];
    topSellingProducts: TopSellingProduct[];
    recentOrders: RecentDashboardOrder[];
    lowStockProducts: LowStockProduct[];
    bestCustomers: BestCustomer[];
}

export const adminDashboardService = {
    getStats: async (): Promise<AdminDashboardStats> => {
        const res = await api.get<AdminDashboardStats>("/admin/dashboard/stats");
        return res.data;
    },
};
