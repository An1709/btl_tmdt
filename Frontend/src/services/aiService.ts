import api from "@/lib/axios";
import type { ApiResponse } from "@/types/api";

export interface ChatMessage {
    role: "user" | "assistant";
    content: string;
    timestamp: string;
}

export interface ChatPayload {
    message: string;
    history?: ChatMessage[];
}

export const aiService = {
    sendMessage: async (payload: ChatPayload): Promise<string> => {
        const res = await api.post<ApiResponse<{ reply: string }>>("/ai/chat", payload);
        return res.data.data.reply;
    },
};