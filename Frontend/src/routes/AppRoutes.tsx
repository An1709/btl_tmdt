import { Routes, Route } from "react-router";

import { Suspense, lazy } from "react";
import Loading from "@/components/common/Loading";
import MainLayout from "@/layouts/MainLayout";
import AdminLayout from "@/layouts/AdminLayout";
import AuthLayout from "@/layouts/AuthLayout";
import ProtectedRoute from "@/routes/ProtectedRoute";
import AdminRoute from "@/routes/AdminRoute";

// Eager load small pages
import HomePage from "@/pages/HomePage";
import ProductPage from "@/pages/shop/ProductPage";

// Lazy load heavier pages
const ProductDetailPage = lazy(() => import("@/pages/shop/ProductDetailPage"));
const CartPage = lazy(() => import("@/pages/shop/CartPage"));
const CheckoutPage = lazy(() => import("@/pages/shop/CheckoutPage"));
const PaymentResultPage = lazy(() => import("@/pages/payment/PaymentResultPage"));
const ProfilePage = lazy(() => import("@/pages/user/ProfilePage"));
const OrderHistoryPage = lazy(() => import("@/pages/user/OrderHistoryPage"));
const OrderDetailPage = lazy(() => import("@/pages/user/OrderDetailPage"));
const WishlistPage = lazy(() => import("@/pages/user/WishlistPage"));
const WarrantyRequestPage = lazy(() => import("@/pages/user/WarrantyRequestPage"));
const BlogListPage = lazy(() => import("@/pages/blog/BlogListPage"));
const BlogDetailPage = lazy(() => import("@/pages/blog/BlogDetailPage"));
const DashboardPage = lazy(() => import("@/pages/admin/DashboardPage"));
const OrderManagePage = lazy(() => import("@/pages/admin/OrderManagePage"));
const UserManagePage = lazy(() => import("@/pages/admin/UserManagePage"));
const ProductManagePage = lazy(() => import("@/pages/admin/ProductManagePage"));
const CouponManagePage = lazy(() => import("@/pages/admin/CouponManagePage"));
const ReviewManagePage = lazy(() => import("@/pages/admin/ReviewManagePage"));
const WarrantyManagePage = lazy(() => import("@/pages/admin/WarrantyManagePage"));

const SuspenseWrap = ({ children }: { children: React.ReactNode }) => (
    <Suspense fallback={<Loading fullPage />}>{children}</Suspense>
);

const AppRoutes = () => (
    <Routes>
        {/* ── Public (MainLayout) ── */}
        <Route element={<MainLayout />}>
            <Route index element={<HomePage />} />
            <Route path="shop" element={<ProductPage />} />
            <Route path="product/:id" element={<SuspenseWrap><ProductDetailPage /></SuspenseWrap>} />
            <Route path="blog" element={<SuspenseWrap><BlogListPage /></SuspenseWrap>} />
            <Route path="blog/:slug" element={<SuspenseWrap><BlogDetailPage /></SuspenseWrap>} />

            {/* ── Cart page (accessible without login, guarded in checkout) ── */}
            <Route path="cart" element={<SuspenseWrap><CartPage /></SuspenseWrap>} />

            {/* ── Protected user routes ── */}
            <Route element={<ProtectedRoute />}>
                <Route path="checkout" element={<SuspenseWrap><CheckoutPage /></SuspenseWrap>} />
                <Route path="orders" element={<SuspenseWrap><OrderHistoryPage /></SuspenseWrap>} />
                <Route path="orders/:id" element={<SuspenseWrap><OrderDetailPage /></SuspenseWrap>} />
                <Route path="profile" element={<SuspenseWrap><ProfilePage /></SuspenseWrap>} />
                <Route path="wishlist" element={<SuspenseWrap><WishlistPage /></SuspenseWrap>} />
                <Route path="warranty" element={<SuspenseWrap><WarrantyRequestPage /></SuspenseWrap>} />
            </Route>
        </Route>

        {/* ── Payment result (standalone, no main layout needed) ── */}
        <Route path="payment/result" element={<SuspenseWrap><PaymentResultPage /></SuspenseWrap>} />

        {/* ── Auth layout ── */}
        <Route element={<AuthLayout />}>
            {/* SignIn / SignUp (provided by existing pages) */}
            {/* <Route path="signin" element={<SignInPage />} /> */}
            {/* <Route path="signup" element={<SignUpPage />} /> */}
        </Route>

        {/* ── Admin routes ── */}
        <Route element={<AdminRoute />}>
            <Route element={<AdminLayout />}>
                <Route path="admin" element={<SuspenseWrap><DashboardPage /></SuspenseWrap>} />
                <Route path="admin/orders" element={<SuspenseWrap><OrderManagePage /></SuspenseWrap>} />
                <Route path="admin/users" element={<SuspenseWrap><UserManagePage /></SuspenseWrap>} />
                <Route path="admin/products" element={<SuspenseWrap><ProductManagePage /></SuspenseWrap>} />
                <Route path="admin/coupons" element={<SuspenseWrap><CouponManagePage /></SuspenseWrap>} />
                <Route path="admin/reviews" element={<SuspenseWrap><ReviewManagePage /></SuspenseWrap>} />
                <Route path="admin/warranty" element={<SuspenseWrap><WarrantyManagePage /></SuspenseWrap>} />
            </Route>
        </Route>

        {/* ── 404 fallback ── */}
        <Route path="*" element={
            <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-background">
                <div className="text-7xl">😿</div>
                <h1 className="text-3xl font-black text-foreground" style={{ fontFamily: "'Nunito', sans-serif" }}>404 – Trang không tồn tại</h1>
                <a href="/" className="btn-pet-primary">🏠 Về trang chủ</a>
            </div>
        } />
    </Routes>
);

export default AppRoutes;