import type { User } from "./user";

export interface AuthState {
    accessToken: string | null;
    user: User | null;
    loading: boolean;   
    clearState: () => void;
    signUp: (
        username: string,
        password: string,
        email: string,
        firstname: string,
        lastname: string
    ) => Promise<void>;

    signIn: (username: string, password: string) => Promise<void>;
    signOut: () => Promise<void>;
    fetchMe: () => Promise<void>;
    refresh: () => Promise<void>;
    setAccessToken: (accessToken: string | null) => void;
}   