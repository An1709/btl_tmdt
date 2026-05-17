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

export interface BlogCommentPayload {
    rating: number;
    content: string;
}

export interface BlogCommentResponse {
    comment: Comment;
    averageRating: number;
    commentCount: number;
    reviewCount: number;
}

const fallbackAuthor = {
    _id: "",
    username: "petmart",
    displayName: "PetMart",
};

const normalizeComment = (comment: Comment): Comment => {
    const user = comment.user ?? null;
    const username = comment.username || user?.displayName || user?.username || "Người dùng";
    const avatarUrl = comment.avatarUrl || user?.avatarUrl || "";

    return {
        ...comment,
        user,
        userId: String(comment.userId || user?._id || ""),
        username,
        avatarUrl,
        rating: Number(comment.rating ?? 0),
        content: comment.content ?? "",
        createdAt: comment.createdAt,
    };
};

const normalizePost = (post: Post): Post => ({
    ...post,
    excerpt: post.excerpt ?? "",
    coverImage: post.coverImage ?? "",
    author: post.author ?? fallbackAuthor,
    tags: Array.isArray(post.tags) ? post.tags : [],
    comments: Array.isArray(post.comments) ? post.comments.map(normalizeComment) : [],
    averageRating: Number(post.averageRating ?? 0),
    commentCount: Number(post.commentCount ?? post.comments?.length ?? 0),
    reviewCount: Number(post.reviewCount ?? post.commentCount ?? post.comments?.length ?? 0),
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

    addComment: async (postId: string, payload: BlogCommentPayload): Promise<BlogCommentResponse> => {
        const res = await api.post<ApiResponse<BlogCommentResponse>>(`/posts/${postId}/comments`, payload);
        return {
            ...res.data.data,
            comment: normalizeComment(res.data.data.comment),
            averageRating: Number(res.data.data.averageRating ?? 0),
            commentCount: Number(res.data.data.commentCount ?? 0),
            reviewCount: Number(res.data.data.reviewCount ?? res.data.data.commentCount ?? 0),
        };
    },

    deleteComment: async (postId: string, commentId: string): Promise<void> => {
        await api.delete(`/posts/${postId}/comments/${commentId}`);
    },
};
