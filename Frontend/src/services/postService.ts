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

const fallbackAuthor = {
    _id: "",
    username: "petmart",
    displayName: "PetMart",
};

const normalizePost = (post: Post): Post => ({
    ...post,
    excerpt: post.excerpt ?? "",
    coverImage: post.coverImage ?? "",
    author: post.author ?? fallbackAuthor,
    tags: Array.isArray(post.tags) ? post.tags : [],
    comments: Array.isArray(post.comments) ? post.comments : [],
    viewCount: Number(post.viewCount ?? 0),
});

const normalizePaginatedPosts = (response: PaginatedResponse<Post>): PaginatedResponse<Post> => ({
    ...response,
    data: Array.isArray(response.data) ? response.data.map(normalizePost) : [],
    total: Number(response.total ?? 0),
    page: Number(response.page ?? 1),
    limit: Number(response.limit ?? 9),
    totalPages: Number(response.totalPages ?? 0),
});

export const postService = {
    getPosts: async (page = 1, limit = 9, search = ""): Promise<PaginatedResponse<Post>> => {
        const res = await api.get<ApiResponse<PaginatedResponse<Post>>>(
            `/posts?page=${page}&limit=${limit}&search=${encodeURIComponent(search)}`
        );
        return normalizePaginatedPosts(res.data.data);
    },

    getPostBySlug: async (slug: string): Promise<Post> => {
        const res = await api.get<ApiResponse<Post>>(`/posts/${slug}`);
        return normalizePost(res.data.data);
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
