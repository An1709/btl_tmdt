import api from "@/lib/axios";

export interface NewsletterResponse {
    success: boolean;
    message: string;
    code?: string;
}

export const newsletterService = {
    subscribe: async (email: string): Promise<NewsletterResponse> => {
        const response = await api.post<NewsletterResponse>("/newsletter/subscribe", { email });
        return response.data;
    },
};
