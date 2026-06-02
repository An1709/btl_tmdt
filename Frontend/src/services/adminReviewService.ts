import api from "@/lib/axios";

export interface AdminReview {
    _id: string;
    product: {
        _id: string;
        name: string;
    } | null;
    user: {
        _id: string;
        displayName?: string;
        username?: string;
        fullName?: string;
        email?: string;
    } | null;
    rating: number;
    comment: string;
    createdAt: string;
}

export const adminReviewService = {
    getAll: async (): Promise<AdminReview[]> => {
        const res = await api.get<AdminReview[]>("/reviews");
        return res.data;
    },
    delete: async (id: string): Promise<void> => {
        await api.delete(`/reviews/${id}`);
    },
};
