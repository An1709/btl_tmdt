export interface Comment {
    _id: string;
    userId: string;
    username: string;
    avatarUrl?: string;
    content: string;
    createdAt: string;
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
    viewCount: number;
    createdAt: string;
    updatedAt: string;
}