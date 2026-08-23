import Header from "@/components/common/Header";
import Footer from "@/components/common/Footer";
import { Outlet } from "react-router";

const MainLayout = () => {
    return (
        <div className="flex min-h-screen min-w-0 flex-col bg-canvas">
            <a
                href="#main-content"
                className="sr-only fixed left-4 top-4 z-toast rounded-md bg-primary px-4 py-2 font-semibold text-primary-foreground focus:not-sr-only focus-visible:outline-none"
            >
                Bỏ qua điều hướng và đến nội dung chính
            </a>
            <Header />
            <main id="main-content" className="min-w-0 flex-1" tabIndex={-1}>
                <Outlet />
            </main>
            <Footer />
        </div>
    );
};

export default MainLayout;
