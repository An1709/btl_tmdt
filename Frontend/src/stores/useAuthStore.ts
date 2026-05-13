import { create } from "zustand";
import { toast } from "sonner";
import { authService } from "@/services/authService";
import type { AuthState } from "@/types/store";

export const useAuthStore = create<AuthState>((set, get) => ({
    accessToken: null,
    user: null,
    loading: false,
    initialized: false,

    setAccessToken: (accessToken) => {
        set({ accessToken });
    },

    clearState: () => {
        set({ accessToken: null, user: null, loading: false, initialized: true });
    },

    signUp: async (username, password, email, firstname, lastname) => {
        try {
            set({ loading: true });
            await authService.signUp(username, password, email, firstname, lastname);
            toast.success("Đăng ký thành công! Vui lòng đăng nhập.");
        } catch (error) {
            console.error("Đăng ký thất bại:", error);
            toast.error("Đăng ký thất bại. Vui lòng thử lại.");
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
            toast.error("Sai tên đăng nhập hoặc mật khẩu. Vui lòng thử lại.");
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
            const userData = res.user ? res.user : res;

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
            const userData = res.user ? res.user : res;
            set({ user: userData });
        } catch {
            set({ accessToken: null, user: null });
        } finally {
            set({ loading: false, initialized: true });
        }
    },
}));
