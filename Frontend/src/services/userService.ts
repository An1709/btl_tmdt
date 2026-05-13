import api from "@/lib/axios";
import type { User } from "@/types/user";
import type { ApiResponse } from "@/types/api";

export interface UpdateProfilePayload {
    displayName?: string;
    bio?: string;
    phone?: string;
    address?: string;
}

export interface AdminUserPayload {
    username: string;
    email: string;
    displayName: string;
    role: "customer" | "admin" | "staff";
    phone?: string;
    address?: string;
    bio?: string;
    password?: string;
}

export const userService = {
    getProfile: async (): Promise<User> => {
        const res = await api.get<User>("/users/profile");
        return res.data;
    },

    updateProfile: async (payload: UpdateProfilePayload): Promise<User> => {
        const res = await api.put<User>("/users/profile", payload);
        return res.data;
    },

    updateAvatar: async (file: File): Promise<User> => {
        const form = new FormData();
        form.append("avatar", file);
        const res = await api.put<ApiResponse<User>>("/users/me/avatar", form, {
            headers: { "Content-Type": "multipart/form-data" },
        });
        return res.data.data;
    },

    changePassword: async (oldPassword: string, newPassword: string): Promise<void> => {
        await api.put("/users/me/password", { oldPassword, newPassword });
    },

    getAllUsers: async (page = 1, limit = 20, search = ""): Promise<{ users: User[]; total: number }> => {
        const res = await api.get<ApiResponse<{ users: User[]; total: number }>>(
            `/users?page=${page}&limit=${limit}&search=${encodeURIComponent(search)}`
        );
        return res.data.data;
    },

    createUser: async (payload: AdminUserPayload): Promise<User> => {
        const res = await api.post<ApiResponse<User>>("/users", payload);
        return res.data.data;
    },

    updateUser: async (userId: string, payload: AdminUserPayload): Promise<User> => {
        const res = await api.put<ApiResponse<User>>(`/users/${userId}`, payload);
        return res.data.data;
    },

    blockUser: async (userId: string): Promise<User> => {
        const res = await api.put<ApiResponse<User>>(`/users/${userId}/block`);
        return res.data.data;
    },

    unblockUser: async (userId: string): Promise<User> => {
        const res = await api.put<ApiResponse<User>>(`/users/${userId}/unblock`);
        return res.data.data;
    },

    deleteUser: async (userId: string): Promise<User> => {
        const res = await api.delete<ApiResponse<User>>(`/users/${userId}`);
        return res.data.data;
    },
};
