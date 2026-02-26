import { Navigate, Outlet } from "react-router";
import { useAuthStore } from "@/stores/useAuthStore";
import Loading from "@/components/common/Loading";

const AdminRoute = () => {
    const { accessToken, user, loading } = useAuthStore();

    if (loading) return <Loading fullPage text="Đang xác thực..." />;

    if (!accessToken || !user) {
        return <Navigate to="/signin" replace />;
    }

    // Check admin role (extend User type or cast for now)
    const isAdmin = (user as unknown as { role?: string }).role === "admin";
    if (!isAdmin) {
        return <Navigate to="/" replace />;
    }

    return <Outlet />;
};

export default AdminRoute;