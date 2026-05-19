import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import StatCard from "@/components/features/admin/StatCard";
import { adminDashboardService, type AdminDashboardStats } from "@/services/adminDashboardService";
import { formatCurrency, formatDate } from "@/utils/format";
import { ORDER_STATUS_LABELS } from "@/utils/constants";

const STATUS_COLORS: Record<string, string> = {
    Pending: "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300",
    Processing: "bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300",
    Shipping: "bg-teal-100 text-teal-700 dark:bg-teal-950/40 dark:text-teal-300",
    Delivered: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300",
    Cancelled: "bg-red-100 text-red-600 dark:bg-red-950/40 dark:text-red-300",
    CancelRequested: "bg-orange-100 text-orange-700 dark:bg-orange-950/40 dark:text-orange-300",
};

const STATUS_BADGE_BASE =
    "inline-flex min-w-[96px] items-center justify-center rounded-full px-3 py-1 text-xs font-bold leading-none whitespace-nowrap";

const SectionCard = ({ title, children }: { title: string; children: ReactNode }) => (
    <section className="bg-white dark:bg-card rounded-2xl border border-border p-5 shadow-sm">
        <h2 className="font-bold text-foreground mb-4" style={{ fontFamily: "'Nunito', sans-serif" }}>
            {title}
        </h2>
        {children}
    </section>
);

const EmptyState = ({ text }: { text: string }) => (
    <div className="py-8 text-center text-sm text-muted-foreground">{text}</div>
);

const MiniBar = ({ value, max }: { value: number; max: number }) => {
    const width = max > 0 ? Math.max((value / max) * 100, value > 0 ? 6 : 0) : 0;

    return (
        <div className="h-2 rounded-full bg-muted overflow-hidden">
            <div
                className="h-full rounded-full bg-[var(--pet-coral)] transition-all"
                style={{ width: `${width}%` }}
            />
        </div>
    );
};

const DashboardPage = () => {
    const [stats, setStats] = useState<AdminDashboardStats | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    const loadStats = useCallback(() => {
        setLoading(true);
        setError("");

        adminDashboardService.getStats()
            .then((data) => setStats(data))
            .catch(() => {
                setStats(null);
                setError("Không thể tải dữ liệu thống kê. Vui lòng thử lại.");
            })
            .finally(() => setLoading(false));
    }, []);

    useEffect(() => {
        void Promise.resolve().then(loadStats);
    }, [loadStats]);

    const maxRevenue = useMemo(
        () => Math.max(...(stats?.revenueChart.map((item) => item.revenue) ?? [0]), 0),
        [stats],
    );
    const maxStatusCount = useMemo(
        () => Math.max(...(stats?.orderStatusStats.map((item) => item.count) ?? [0]), 0),
        [stats],
    );
    const maxPaymentCount = useMemo(
        () => Math.max(...(stats?.paymentMethodStats.map((item) => item.count) ?? [0]), 0),
        [stats],
    );

    if (loading) {
        return (
            <div className="flex flex-col gap-6">
                <h1 className="section-title">Tổng quan kinh doanh</h1>
                <div className="bg-white dark:bg-card rounded-2xl border border-border p-8 text-center text-muted-foreground">
                    Đang tải thống kê...
                </div>
            </div>
        );
    }

    if (error || !stats) {
        return (
            <div className="flex flex-col gap-6">
                <h1 className="section-title">Tổng quan kinh doanh</h1>
                <div className="bg-white dark:bg-card rounded-2xl border border-border p-8 text-center">
                    <p className="text-sm text-muted-foreground mb-4">
                        {error || "Không thể tải dữ liệu thống kê. Vui lòng thử lại."}
                    </p>
                    <button type="button" onClick={loadStats} className="btn-pet-primary inline-flex">
                        Tải lại
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-6">
            <div className="flex items-end justify-between gap-3 flex-wrap">
                <div>
                    <h1 className="section-title">Tổng quan kinh doanh</h1>
                    <p className="text-sm text-muted-foreground mt-1">
                        Theo dõi doanh thu, đơn hàng, kho hàng và khách hàng của PetMart.
                    </p>
                </div>
                <button type="button" onClick={loadStats} className="btn-pet-secondary text-sm">
                    Làm mới
                </button>
            </div>

            <section>
                <h2 className="font-bold text-foreground mb-3" style={{ fontFamily: "'Nunito', sans-serif" }}>
                    Tổng quan
                </h2>
                <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
                    <StatCard label="Doanh thu hợp lệ" value={formatCurrency(stats.overview.totalRevenue)} icon="₫" color="coral" />
                    <StatCard label="Tổng đơn hàng" value={stats.overview.totalOrders} icon="ĐH" color="mint" />
                    <StatCard label="Người dùng" value={stats.overview.totalUsers} icon="KH" color="amber" />
                    <StatCard label="Sản phẩm" value={stats.overview.totalProducts} icon="SP" color="purple" />
                    <StatCard label="Chờ xác nhận" value={stats.overview.pendingOrders} icon="CX" color="amber" />
                    <StatCard label="Đã hủy" value={stats.overview.cancelledOrders} icon="H" color="coral" />
                    <StatCard label="Sắp hết hàng" value={stats.overview.lowStockProducts} icon="TK" color="purple" />
                    <StatCard label="Người dùng mới 30 ngày" value={stats.overview.newUsers} icon="M" color="mint" />
                </div>
            </section>

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                <SectionCard title="Doanh thu">
                    {stats.revenueChart.length === 0 ? (
                        <EmptyState text="Chưa có dữ liệu doanh thu." />
                    ) : (
                        <div className="flex items-end gap-1 h-64 border-b border-border px-1">
                            {stats.revenueChart.map((item) => {
                                const height = maxRevenue > 0 ? Math.max((item.revenue / maxRevenue) * 100, item.revenue > 0 ? 4 : 0) : 0;

                                return (
                                    <div key={item.date} className="flex-1 h-full flex items-end group relative">
                                        <div
                                            className="w-full rounded-t-lg bg-[var(--pet-coral)]/80 group-hover:bg-[var(--pet-coral)] transition-all"
                                            style={{ height: `${height}%` }}
                                        />
                                        <div className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block min-w-40 rounded-xl bg-foreground text-background text-xs px-3 py-2 shadow-lg z-10">
                                            <p className="font-bold">{formatDate(item.date)}</p>
                                            <p>{formatCurrency(item.revenue)}</p>
                                            <p>{item.orders} đơn đã giao</p>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                    <p className="text-xs text-muted-foreground mt-3">
                        Doanh thu 30 ngày gần nhất, chỉ tính đơn đã giao hợp lệ.
                    </p>
                </SectionCard>

                <SectionCard title="Trạng thái đơn hàng">
                    {stats.orderStatusStats.length === 0 ? (
                        <EmptyState text="Chưa có đơn hàng." />
                    ) : (
                        <div className="space-y-4">
                            {stats.orderStatusStats.map((item) => (
                                <div key={item.status} className="space-y-1.5">
                                    <div className="flex justify-between text-sm">
                                        <span className="font-semibold text-foreground">{item.label}</span>
                                        <span className="text-muted-foreground">{item.count}</span>
                                    </div>
                                    <MiniBar value={item.count} max={maxStatusCount} />
                                </div>
                            ))}
                        </div>
                    )}
                </SectionCard>

                <SectionCard title="Phương thức thanh toán">
                    {stats.paymentMethodStats.length === 0 ? (
                        <EmptyState text="Chưa có dữ liệu thanh toán." />
                    ) : (
                        <div className="space-y-4">
                            {stats.paymentMethodStats.map((item) => (
                                <div key={item.method} className="rounded-xl border border-border p-3">
                                    <div className="flex justify-between text-sm mb-2">
                                        <span className="font-bold text-foreground">{item.method}</span>
                                        <span className="text-muted-foreground">{item.count} đơn</span>
                                    </div>
                                    <MiniBar value={item.count} max={maxPaymentCount} />
                                    <div className="flex justify-between text-xs text-muted-foreground mt-2">
                                        <span>{item.paidOrders} đơn tính doanh thu</span>
                                        <span>{formatCurrency(item.revenue)}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </SectionCard>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                <SectionCard title="Sản phẩm bán chạy">
                    {stats.topSellingProducts.length === 0 ? (
                        <EmptyState text="Chưa có sản phẩm bán chạy." />
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b border-border text-left">
                                        {["Sản phẩm", "Đã bán", "Doanh thu"].map((header) => (
                                            <th key={header} className="pb-3 pr-4 font-bold text-muted-foreground text-xs uppercase tracking-wider">
                                                {header}
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {stats.topSellingProducts.map((product) => (
                                        <tr key={product.productId || product.name} className="border-b border-border/50 last:border-b-0">
                                            <td className="py-3 pr-4 font-semibold text-foreground">{product.name}</td>
                                            <td className="py-3 pr-4 text-muted-foreground">{product.soldQuantity}</td>
                                            <td className="py-3 pr-4 font-bold text-[var(--pet-coral)]">{formatCurrency(product.revenue)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </SectionCard>

                <SectionCard title="Sản phẩm sắp hết hàng">
                    {stats.lowStockProducts.length === 0 ? (
                        <EmptyState text="Không có sản phẩm sắp hết hàng." />
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b border-border text-left">
                                        {["Sản phẩm", "Danh mục", "Tồn kho"].map((header) => (
                                            <th key={header} className="pb-3 pr-4 font-bold text-muted-foreground text-xs uppercase tracking-wider">
                                                {header}
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {stats.lowStockProducts.map((product) => (
                                        <tr key={product.id} className="border-b border-border/50 last:border-b-0">
                                            <td className="py-3 pr-4 font-semibold text-foreground">{product.name}</td>
                                            <td className="py-3 pr-4 text-muted-foreground">{product.category?.name || product.category?.slug || "-"}</td>
                                            <td className="py-3 pr-4">
                                                <span className="text-xs font-bold px-2 py-1 rounded-lg bg-red-100 text-red-600">
                                                    {product.stock}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </SectionCard>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                <SectionCard title="Đơn hàng gần đây">
                    {stats.recentOrders.length === 0 ? (
                        <EmptyState text="Chưa có đơn hàng gần đây." />
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full min-w-[900px] table-auto text-sm">
                                <thead>
                                    <tr className="border-b border-border text-left">
                                        <th className="w-28 pb-3 pr-4 font-bold text-muted-foreground text-xs uppercase tracking-wider">Mã đơn</th>
                                        <th className="min-w-48 pb-3 pr-4 font-bold text-muted-foreground text-xs uppercase tracking-wider">Khách hàng</th>
                                        <th className="w-32 pb-3 pr-4 font-bold text-muted-foreground text-xs uppercase tracking-wider">Tổng tiền</th>
                                        <th className="w-28 pb-3 pr-4 font-bold text-muted-foreground text-xs uppercase tracking-wider">Thanh toán</th>
                                        <th className="w-36 pb-3 pr-4 font-bold text-muted-foreground text-xs uppercase tracking-wider">Trạng thái</th>
                                        <th className="w-28 pb-3 pr-4 font-bold text-muted-foreground text-xs uppercase tracking-wider">Ngày</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {stats.recentOrders.map((order) => (
                                        <tr key={order.id} className="border-b border-border/50 last:border-b-0">
                                            <td className="py-3 pr-4 font-mono text-xs font-semibold text-foreground whitespace-nowrap">{order.orderCode}</td>
                                            <td className="py-3 pr-4">
                                                <p className="font-semibold text-foreground">{order.customer.name}</p>
                                                {order.customer.email && <p className="text-xs text-muted-foreground">{order.customer.email}</p>}
                                            </td>
                                            <td className="py-3 pr-4 font-bold text-[var(--pet-coral)] whitespace-nowrap">{formatCurrency(order.totalAmount)}</td>
                                            <td className="py-3 pr-4 text-muted-foreground whitespace-nowrap">{order.paymentMethod}</td>
                                            <td className="py-3 pr-4">
                                                <span className={`${STATUS_BADGE_BASE} ${STATUS_COLORS[order.status] ?? "bg-muted text-muted-foreground"}`}>
                                                    {ORDER_STATUS_LABELS[order.status] ?? order.status}
                                                </span>
                                            </td>
                                            <td className="py-3 pr-4 text-muted-foreground whitespace-nowrap">{formatDate(order.createdAt)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </SectionCard>

                <SectionCard title="Khách hàng chi tiêu nhiều">
                    {stats.bestCustomers.length === 0 ? (
                        <EmptyState text="Chưa có dữ liệu khách hàng." />
                    ) : (
                        <div className="space-y-3">
                            {stats.bestCustomers.map((customer, index) => (
                                <div key={customer.userId || customer.email || index} className="flex items-center justify-between gap-4 rounded-xl border border-border p-3">
                                    <div className="min-w-0">
                                        <p className="font-bold text-foreground truncate">{index + 1}. {customer.name || "Khách hàng"}</p>
                                        {customer.email && <p className="text-xs text-muted-foreground truncate">{customer.email}</p>}
                                    </div>
                                    <div className="text-right shrink-0">
                                        <p className="font-black text-[var(--pet-coral)]">{formatCurrency(customer.totalSpent)}</p>
                                        <p className="text-xs text-muted-foreground">{customer.orderCount} đơn</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </SectionCard>
            </div>
        </div>
    );
};

export default DashboardPage;
