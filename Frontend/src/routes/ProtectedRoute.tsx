import { Navigate, Outlet, useLocation } from "react-router";
import { useAuthStore } from "@/stores/useAuthStore";
import Loading from "@/components/common/Loading";

const ProtectedRoute = () => {
    const { accessToken, user, loading, initialized } = useAuthStore();
    const location = useLocation();

    if (!initialized || loading) return <Loading fullPage text="Đang xác thực..." />;

    if (!accessToken || !user) {
        return <Navigate to="/signin" replace state={{ from: location.pathname }} />;
    }

    return <Outlet />;
};

export default ProtectedRoute;
