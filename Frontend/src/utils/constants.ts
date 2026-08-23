export const PAGE_SIZE = 12;

const trimTrailingSlash = (value: string) => value.replace(/\/+$/, "");

const rawApiUrl = import.meta.env.VITE_API_URL || "http://localhost:5001";

export const API_URL = trimTrailingSlash(rawApiUrl).replace(/\/api$/, "");
export const API_BASE_URL = `${API_URL}/api`;

export const IMAGE_ASSETS = {
    logo: "https://res.cloudinary.com/dvijnss6y/image/upload/v1779287171/logo_q9v0ln.svg",
    placeholder: "https://res.cloudinary.com/dvijnss6y/image/upload/v1779287172/placeholder_jwspfn.png",
    placeholderSignUp: "https://res.cloudinary.com/dvijnss6y/image/upload/v1779287172/placeholderSignUp_ufpsxz.png",
} as const;

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
    Pending: "Chờ xác nhận",
    Processing: "Đang xử lý",
    Shipping: "Đang giao",
    Delivered: "Đã giao",
    Cancelled: "Đã hủy",
};

export const PAYMENT_STATUS_LABELS: Record<string, string> = {
    unpaid: "Chưa thanh toán",
    paid: "Đã thanh toán",
    refunded: "Đã hoàn tiền",
};

export const WARRANTY_STATUS_LABELS: Record<string, string> = {
    Pending: "Chờ xử lý",
    Approved: "Đã tiếp nhận",
    Rejected: "Từ chối",
    Completed: "Đã hoàn tất",
};
