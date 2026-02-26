import { create } from "zustand";
import { persist } from "zustand/middleware";

interface UIStore {
    isDark: boolean;
    toggleDark: () => void;
    setDark: (value: boolean) => void;
}

export const useUIStore = create<UIStore>()(
    persist(
        (set, get) => ({
            isDark: false,

            toggleDark: () => {
                const next = !get().isDark;
                set({ isDark: next });
                document.documentElement.classList.toggle("dark", next);
            },

            setDark: (value: boolean) => {
                set({ isDark: value });
                document.documentElement.classList.toggle("dark", value);
            },
        }),
        {
            name: "petmart-ui",
            onRehydrateStorage: () => (state) => {
                // Apply persisted dark mode on page load
                if (state?.isDark) {
                    document.documentElement.classList.add("dark");
                }
            },
        }
    )
);