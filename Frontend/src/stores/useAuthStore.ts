import { create } from "zustand";
import { toast } from "sonner";
import { authService } from "@/services/authService";
import type { AuthState } from "@/types/store";
import type { User } from "@/types/user";

const getAuthError = (error: unknown) =>
    (error as { response?: { data?: { code?: string; email?: string; message?: string } } }).response?.data;

const normalizeUser = (user: User): User => ({
    ...user,
    avatarUrl: user.avatarUrl || user.avatar || user.photoURL || user.image || "",
});

export const useAuthStore = create<AuthState>((set, get) => ({
    accessToken: null,
    user: null,
    loading: false,
    initialized: false,

    setAccessToken: (accessToken) => {
        set({ accessToken });
    },

    setUser: (user) => {
        set({ user: user ? normalizeUser(user) : null });
    },

    clearState: () => {
        set({ accessToken: null, user: null, loading: false, initialized: true });
    },

    signUp: async (username, password, email, firstname, lastname) => {
        try {
            set({ loading: true });
            const response = await authService.signUp(username, password, email, firstname, lastname);
            toast.success(response.message || "Mã OTP đã được gửi đến email của bạn.");
            return response;
        } catch (error) {
            const authError = getAuthError(error);
            toast.error(authError?.message || "Đăng ký thất bại. Vui lòng thử lại.");
            throw error;
        } finally {
            set({ loading: false });
        }
    },

    signIn: async (username, password) => {
        try {
            set({ loading: true });

            const { accessToken } = await authService.signIn(username, password);
            get().setAccessToken(accessToken);

            await get().fetchMe();
            set({ initialized: true });

            toast.success("Đăng nhập thành công!");
        } catch (error) {
            console.error("Đăng nhập thất bại:", error);
            const authError = getAuthError(error);
            toast.error(
                authError?.code === "EMAIL_NOT_VERIFIED"
                    ? "Vui lòng xác minh email trước khi đăng nhập."
                    : "Sai tên đăng nhập hoặc mật khẩu. Vui lòng thử lại."
            );
            throw error;
        } finally {
            set({ loading: false });
        }
    },

    signOut: async () => {
        try {
            get().clearState();
            await authService.signOut();
            toast.success("Đăng xuất thành công!");
        } catch (error) {
            console.error("Đăng xuất thất bại:", error);
            toast.error("Đăng xuất thất bại. Vui lòng thử lại.");
            throw error;
        } finally {
            set({ loading: false });
        }
    },

    fetchMe: async () => {
        try {
            set({ loading: true });

            const res = await authService.fetchMe();
            const userData = normalizeUser(res.user ? res.user : res);

            set({ user: userData });
        } catch (error) {
            console.error("Lấy thông tin người dùng thất bại:", error);
            set({ user: null, accessToken: null });
            toast.error("Lấy thông tin người dùng thất bại. Vui lòng đăng nhập lại.");
            throw error;
        } finally {
            set({ loading: false });
        }
    },

    refresh: async () => {
        try {
            set({ loading: true });

            const newAccessToken = await authService.refresh();
            get().setAccessToken(newAccessToken);

            if (!get().user) {
                await get().fetchMe();
            }

            return newAccessToken;
        } catch (error) {
            console.error("Làm mới access token thất bại:", error);
            toast.error("Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.");
            return false;
        } finally {
            set({ loading: false });
        }
    },

    initializeAuth: async () => {
        if (get().initialized || get().loading) return;

        try {
            set({ loading: true });

            const accessToken = await authService.refresh();
            set({ accessToken });

            const res = await authService.fetchMe();
            const userData = normalizeUser(res.user ? res.user : res);
            set({ user: userData });
        } catch {
            set({ accessToken: null, user: null });
        } finally {
            set({ loading: false, initialized: true });
        }
    },
}));
