import Header from "@/components/common/Header";
import Sidebar from "@/components/common/Sidebar";
import { Outlet } from "react-router";

const AdminLayout = () => {
    return (
        <div className="flex flex-col min-h-screen bg-background">
            <Header />
            <div className="flex flex-1 max-w-screen-2xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 gap-8">
                <Sidebar mode="admin" />
                <main className="flex-1 min-w-0">
                    <Outlet />
                </main>
            </div>
        </div>
    );
};

export default AdminLayout;