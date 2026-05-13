import { Navigate, Outlet } from "react-router";
import { useAuthStore } from "@/stores/useAuthStore";
import Loading from "@/components/common/Loading";

const AdminRoute = () => {
    const { accessToken, user, loading, initialized } = useAuthStore();

    if (!initialized || loading) return <Loading fullPage text="Đang xác thực..." />;

    if (!accessToken || !user) {
        return <Navigate to="/signin" replace />;
    }

    const isAdmin = user.role === "admin";
    if (!isAdmin) {
        return <Navigate to="/" replace />;
    }

    return <Outlet />;
};

export default AdminRoute;
