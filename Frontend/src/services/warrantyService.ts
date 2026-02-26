import api from "@/lib/axios";
import type { WarrantyRequest, WarrantyStatus } from "@/types/warranty";
import type { ApiResponse } from "@/types/api";

export const warrantyService = {
    createRequest: async (data: FormData): Promise<WarrantyRequest> => {
        const res = await api.post<ApiResponse<WarrantyRequest>>("/warranty", data, {
            headers: { "Content-Type": "multipart/form-data" },
        });
        return res.data.data;
    },

    getMyRequests: async (): Promise<WarrantyRequest[]> => {
        const res = await api.get<ApiResponse<WarrantyRequest[]>>("/warranty/my");
        return res.data.data;
    },

    getAllRequests: async (): Promise<WarrantyRequest[]> => {
        const res = await api.get<ApiResponse<WarrantyRequest[]>>("/warranty");
        return res.data.data;
    },

    updateStatus: async (id: string, status: WarrantyStatus, adminNote?: string): Promise<WarrantyRequest> => {
        const res = await api.put<ApiResponse<WarrantyRequest>>(`/warranty/${id}`, {
            status,
            adminNote,
        });
        return res.data.data;
    },
};