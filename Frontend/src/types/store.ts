import type { User } from "./user";
import type { SignUpResponse } from "@/services/authService";

export interface AuthState {
    accessToken: string | null;
    user: User | null;
    loading: boolean;   
    initialized: boolean;
    clearState: () => void;
    signUp: (
        username: string,
        password: string,
        email: string,
        firstname: string,
        lastname: string
    ) => Promise<SignUpResponse>;

    signIn: (username: string, password: string) => Promise<void>;
    signOut: () => Promise<void>;
    fetchMe: () => Promise<void>;
    refresh: () => Promise<string | false>;
    initializeAuth: () => Promise<void>;
    setAccessToken: (accessToken: string | null) => void;
    setUser: (user: User | null) => void;
}
