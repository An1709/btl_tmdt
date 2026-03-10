export interface User {
    _id: string;
    username: string;
    email: string;
    displayName: string;
    role?: 'customer' | 'admin' | 'staff';
    avatarUrl?: string;
    bio?: string;
    phone?: string;
    address?: string;
    isBlocked?: boolean;
    createdAt?: string;
    updatedAt?: string;
}