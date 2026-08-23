import { Moon, PawPrint, Sun } from "lucide-react";
import { Link, Outlet } from "react-router";

import { Button } from "@/components/ui/button";
import { useUIStore } from "@/stores/useUIStore";

const AuthLayout = () => {
    const { isDark, toggleDark } = useUIStore();

    return (
        <div className="flex min-h-screen flex-col bg-canvas text-foreground">
            <header className="border-b border-divider bg-surface/95">
                <div className="mx-auto flex h-16 w-full max-w-[var(--content-max)] items-center justify-between px-page">
                    <Link
                        to="/"
                        className="inline-flex items-center gap-2 rounded-md text-primary focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-focus/45 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                        aria-label="PetMart — về trang chủ"
                    >
                        <span className="flex size-9 items-center justify-center rounded-md bg-primary-subtle" aria-hidden="true">
                            <PawPrint className="size-5" />
                        </span>
                        <span className="font-heading text-xl font-extrabold tracking-tight sm:text-2xl">PetMart</span>
                    </Link>

                    <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={toggleDark}
                        aria-label={isDark ? "Chuyển sang chế độ sáng" : "Chuyển sang chế độ tối"}
                    >
                        {isDark ? <Sun aria-hidden="true" /> : <Moon aria-hidden="true" />}
                    </Button>
                </div>
            </header>

            <main className="mx-auto flex w-full max-w-[var(--content-max)] flex-1 items-center justify-center px-page py-8 sm:py-10 lg:py-12">
                <div className="w-full max-w-lg">
                    <Outlet />
                </div>
            </main>

            <footer className="border-t border-divider px-page py-5 text-center text-xs text-muted-foreground">
                © {new Date().getFullYear()} PetMart. Bảo lưu mọi quyền.
            </footer>
        </div>
    );
};

export default AuthLayout;
