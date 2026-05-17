import api from "@/lib/axios";
import type { ApiResponse } from "@/types/api";

export interface ChatMessage {
    role: "user" | "assistant";
    content: string;
    timestamp: string;
}

interface ChatbotResponse {
    success?: boolean;
    reply?: string;
    data?: {
        reply?: string;
    };
    message?: string;
}

export const aiService = {
    sendMessage: async (message: string): Promise<string> => {
        const res = await api.post<ApiResponse<{ reply: string }> & ChatbotResponse>("/chatbot/message", { message });
        const reply = res.data.reply || res.data.data?.reply;

        if (!reply) {
            throw new Error(res.data.message || "Không thể gửi tin nhắn. Vui lòng thử lại.");
        }

        return reply;
    },
};
