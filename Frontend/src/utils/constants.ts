export const PAGE_SIZE = 12;
export const API_URL =
    import.meta.env.MODE === "development"
        ? "http://localhost:5001/api"
        : "/api";

export const ROUTES = {
    HOME: "/",
    SHOP: "/shop",
    PRODUCT: (id: string) => `/product/${id}`,
    CART: "/cart",
    CHECKOUT: "/checkout",
    PAYMENT_RESULT: "/payment/result",
    BLOG: "/blog",
    BLOG_DETAIL: (slug: string) => `/blog/${slug}`,
    PROFILE: "/profile",
    ORDERS: "/orders",
    ORDER_DETAIL: (id: string) => `/orders/${id}`,
    WISHLIST: "/wishlist",
    WARRANTY: "/warranty",
    SIGNIN: "/signin",
    SIGNUP: "/signup",
    ADMIN: {
        DASHBOARD: "/admin",
        PRODUCTS: "/admin/products",
        ORDERS: "/admin/orders",
        USERS: "/admin/users",
        COUPONS: "/admin/coupons",
        REVIEWS: "/admin/reviews",
        WARRANTY: "/admin/warranty",
    },
} as const;

export const ORDER_STATUS_LABELS: Record<string, string> = {
    pending: "Chờ xác nhận",
    confirmed: "Đã xác nhận",
    shipping: "Đang giao hàng",
    delivered: "Đã giao",
    cancelled: "Đã hủy",
};

export const PAYMENT_STATUS_LABELS: Record<string, string> = {
    unpaid: "Chưa thanh toán",
    paid: "Đã thanh toán",
    refunded: "Đã hoàn tiền",
};

export const WARRANTY_STATUS_LABELS: Record<string, string> = {
    pending: "Chờ xử lý",
    processing: "Đang xử lý",
    resolved: "Đã giải quyết",
    rejected: "Từ chối",
};