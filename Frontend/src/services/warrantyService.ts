import api from "@/lib/axios";
import type { WarrantyRequest, WarrantyStatus } from "@/types/warranty";

export const warrantyService = {
    createRequest: async (data: FormData): Promise<WarrantyRequest> => {
        const res = await api.post<WarrantyRequest>("/warranty", data, {
            headers: { "Content-Type": "multipart/form-data" },
        });
        return res.data;
    },

    getMyRequests: async (): Promise<WarrantyRequest[]> => {
        const res = await api.get<WarrantyRequest[]>("/warranty/my-requests");
        return res.data;
    },

    getAllRequests: async (): Promise<WarrantyRequest[]> => {
        const res = await api.get<WarrantyRequest[]>("/warranty/admin");
        return res.data;
    },

    updateStatus: async (id: string, status: WarrantyStatus, adminResponse?: string): Promise<WarrantyRequest> => {
        const res = await api.put<WarrantyRequest>(`/warranty/admin/${id}`, {
            status,
            adminResponse,
        });
        return res.data;
    },
};
