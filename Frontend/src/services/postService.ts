import api from "@/lib/axios";
import type { Post, Comment } from "@/types/post";
import type { ApiResponse, PaginatedResponse } from "@/types/api";

export interface PostPayload {
    title: string;
    content: string;
    excerpt?: string;
    thumbnail?: string;
    tags?: string[];
    type?: "blog" | "forum_topic";
}

export const postService = {
    getPosts: async (page = 1, limit = 9, search = ""): Promise<PaginatedResponse<Post>> => {
        const res = await api.get<ApiResponse<PaginatedResponse<Post>>>(
            `/posts?page=${page}&limit=${limit}&search=${encodeURIComponent(search)}`
        );
        return res.data.data;
    },

    getPostBySlug: async (slug: string): Promise<Post> => {
        const res = await api.get<ApiResponse<Post>>(`/posts/${slug}`);
        return res.data.data;
    },

    createPost: async (data: PostPayload): Promise<Post> => {
        const res = await api.post<ApiResponse<Post>>("/posts", data);
        return res.data.data;
    },

    updatePost: async (id: string, data: PostPayload): Promise<Post> => {
        const res = await api.put<ApiResponse<Post>>(`/posts/${id}`, data);
        return res.data.data;
    },

    deletePost: async (id: string): Promise<void> => {
        await api.delete(`/posts/${id}`);
    },

    addComment: async (postId: string, content: string): Promise<Comment> => {
        const res = await api.post<ApiResponse<Comment>>(`/posts/${postId}/comments`, { content });
        return res.data.data;
    },

    deleteComment: async (postId: string, commentId: string): Promise<void> => {
        await api.delete(`/posts/${postId}/comments/${commentId}`);
    },
};
