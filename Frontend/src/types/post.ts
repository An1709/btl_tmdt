export interface Comment {
    _id: string;
    userId: string;
    username: string;
    avatarUrl?: string;
    user?: {
        _id: string;
        username?: string;
        displayName?: string;
        avatarUrl?: string;
    } | null;
    rating: number;
    content: string;
    createdAt: string;
    updatedAt?: string;
}

export interface Post {
    _id: string;
    title: string;
    slug: string;
    excerpt: string;
    content: string;
    coverImage: string;
    author: {
        _id: string;
        username: string;
        avatarUrl?: string;
        displayName: string;
    };
    tags: string[];
    comments: Comment[];
    averageRating: number;
    commentCount: number;
    reviewCount: number;
    viewCount: number;
    createdAt: string;
    updatedAt: string;
}
