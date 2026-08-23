import { useCallback, useEffect, useMemo, useState } from "react";
import { Clock3, DollarSign, Package, RefreshCw, UserPlus, Warehouse, XCircle } from "lucide-react";

import { AdminPageHeader, AdminPanel } from "@/components/features/admin/AdminSurface";
import DataTable, { type Column } from "@/components/features/admin/DataTable";
import StatCard from "@/components/features/admin/StatCard";
import { SkeletonBlock } from "@/components/common/Loading";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState, ErrorState } from "@/components/ui/feedback-state";
import {
  adminDashboardService,
  type AdminDashboardStats,
  type LowStockProduct,
  type RecentDashboardOrder,
  type TopSellingProduct,
} from "@/services/adminDashboardService";
import { couponService } from "@/services/couponService";
import type { Coupon } from "@/types/coupon";
import { ORDER_STATUS_LABELS } from "@/utils/constants";
import { formatCurrency, formatDate } from "@/utils/format";

type BadgeTone = "neutral" | "success" | "warning" | "error" | "info" | "pending" | "disabled";

const getOrderStatusTone = (status: string): BadgeTone => {
  if (status === "Delivered") return "success";
  if (status === "Cancelled") return "error";
  if (status === "CancelRequested") return "warning";
  if (status === "Processing" || status === "Shipping") return "info";
  return "pending";
};

const getCouponStatus = (coupon: Coupon): { label: string; tone: BadgeTone } => {
  const endDate = coupon.endDate ?? coupon.expirationDate;
  const isExpired = endDate ? new Date(endDate).getTime() < Date.now() : false;
  const isUsageEnded = coupon.usageLimit > 0 && coupon.usedCount >= coupon.usageLimit;

  if (isExpired) return { label: "Hết hạn", tone: "error" };
  if (isUsageEnded) return { label: "Hết lượt", tone: "warning" };
  if (coupon.isActive === false) return { label: "Tạm tắt", tone: "disabled" };
  return { label: "Đang hoạt động", tone: "success" };
};

const formatCouponValue = (coupon: Coupon) => {
  const value = coupon.discountValue ?? coupon.value ?? 0;
  return coupon.discountType === "percent" ? `${value}%` : formatCurrency(value);
};

function MiniBar({ value, max, label }: { value: number; max: number; label: string }) {
  const width = max > 0 ? Math.max((value / max) * 100, value > 0 ? 6 : 0) : 0;

  return (
    <div
      className="h-2 overflow-hidden rounded-full bg-surface-subtle"
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={max}
      aria-valuenow={value}
    >
      <div className="h-full rounded-full bg-primary transition-[width] duration-base ease-standard" style={{ width: `${width}%` }} />
    </div>
  );
}

function DashboardLoading() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Đang tải dữ liệu tổng quan">
      <div className="space-y-3 border-b border-divider pb-5"><SkeletonBlock className="h-8 w-64" /><SkeletonBlock className="h-5 w-full max-w-xl" /></div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }, (_, index) => <SkeletonBlock key={index} className="h-36 rounded-lg" />)}
      </div>
      <div className="grid gap-6 xl:grid-cols-3">
        {Array.from({ length: 3 }, (_, index) => <SkeletonBlock key={index} className="h-80 rounded-lg" />)}
      </div>
    </div>
  );
}

const topSellingColumns: Column<TopSellingProduct>[] = [
  { key: "name", header: "Sản phẩm", render: (product) => <span className="font-medium text-text-strong">{product.name}</span> },
  { key: "sold", header: "Đã bán", hideOnMobile: true, render: (product) => <span>{product.soldQuantity}</span> },
  { key: "revenue", header: "Doanh thu", headerClassName: "text-right", cellClassName: "text-right font-semibold text-primary", render: (product) => formatCurrency(product.revenue) },
];

const lowStockColumns: Column<LowStockProduct>[] = [
  { key: "name", header: "Sản phẩm", render: (product) => <span className="font-medium text-text-strong">{product.name}</span> },
  { key: "category", header: "Danh mục", hideOnMobile: true, render: (product) => product.category?.name || product.category?.slug || "—" },
  { key: "stock", header: "Tồn kho", headerClassName: "text-right", cellClassName: "text-right", render: (product) => <Badge tone="warning">{product.stock}</Badge> },
];

const recentOrderColumns: Column<RecentDashboardOrder>[] = [
  { key: "code", header: "Mã đơn", render: (order) => <span className="font-mono text-xs font-semibold text-text-strong">{order.orderCode}</span> },
  {
    key: "customer",
    header: "Khách hàng",
    render: (order) => <div className="min-w-40"><p className="font-medium text-text-strong">{order.customer.name}</p>{order.customer.email && <p className="truncate text-xs text-muted-foreground">{order.customer.email}</p>}</div>,
  },
  { key: "total", header: "Tổng tiền", headerClassName: "text-right", cellClassName: "text-right font-semibold text-primary whitespace-nowrap", render: (order) => formatCurrency(order.totalAmount) },
  { key: "payment", header: "Thanh toán", hideOnMobile: true, render: (order) => order.paymentMethod },
  { key: "status", header: "Trạng thái", render: (order) => <Badge tone={getOrderStatusTone(order.status)}>{ORDER_STATUS_LABELS[order.status] ?? order.status}</Badge> },
  { key: "date", header: "Ngày", hideOnMobile: true, render: (order) => <span className="whitespace-nowrap">{formatDate(order.createdAt)}</span> },
];

const couponColumns: Column<Coupon>[] = [
  { key: "code", header: "Mã", render: (coupon) => <span className="font-mono text-xs font-semibold text-text-strong">{coupon.code}</span> },
  { key: "discount", header: "Giá trị", render: (coupon) => <span className="font-semibold text-primary">{formatCouponValue(coupon)}</span> },
  { key: "usage", header: "Đã dùng", hideOnMobile: true, render: (coupon) => `${coupon.usedCount}/${coupon.usageLimit > 0 ? coupon.usageLimit : "∞"}` },
  { key: "expiry", header: "Hạn dùng", hideOnMobile: true, render: (coupon) => formatDate(coupon.endDate ?? coupon.expirationDate) },
  { key: "status", header: "Trạng thái", render: (coupon) => { const status = getCouponStatus(coupon); return <Badge tone={status.tone}>{status.label}</Badge>; } },
];

const DashboardPage = () => {
  const [stats, setStats] = useState<AdminDashboardStats | null>(null);
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [couponsLoading, setCouponsLoading] = useState(true);
  const [couponsError, setCouponsError] = useState("");

  const loadStats = useCallback(() => {
    setLoading(true);
    setError("");
    adminDashboardService.getStats()
      .then(setStats)
      .catch(() => {
        setStats(null);
        setError("Không thể tải dữ liệu thống kê. Vui lòng thử lại.");
      })
      .finally(() => setLoading(false));
  }, []);

  const loadCoupons = useCallback(() => {
    setCouponsLoading(true);
    setCouponsError("");
    couponService.getAllCoupons(8)
      .then(setCoupons)
      .catch(() => {
        setCoupons([]);
        setCouponsError("Không thể tải danh sách mã giảm giá. Vui lòng thử lại.");
      })
      .finally(() => setCouponsLoading(false));
  }, []);

  useEffect(() => {
    void Promise.resolve().then(loadStats);
    void Promise.resolve().then(loadCoupons);
  }, [loadCoupons, loadStats]);

  const maxRevenue = useMemo(() => Math.max(...(stats?.revenueChart.map((item) => item.revenue) ?? [0]), 0), [stats]);
  const maxStatusCount = useMemo(() => Math.max(...(stats?.orderStatusStats.map((item) => item.count) ?? [0]), 0), [stats]);
  const maxPaymentCount = useMemo(() => Math.max(...(stats?.paymentMethodStats.map((item) => item.count) ?? [0]), 0), [stats]);

  if (loading) return <DashboardLoading />;

  if (error || !stats) {
    return (
      <div className="space-y-6">
        <AdminPageHeader title="Tổng quan kinh doanh" description="Theo dõi doanh thu, đơn hàng, kho hàng và khách hàng của PetMart." />
        <div className="rounded-lg border border-border bg-surface-elevated">
          <ErrorState title="Chưa thể tải tổng quan" description={error || "Không thể tải dữ liệu thống kê. Vui lòng thử lại."} action={<Button type="button" onClick={loadStats}><RefreshCw aria-hidden="true" />Tải lại</Button>} />
        </div>
      </div>
    );
  }

  const chartDates = stats.revenueChart;

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Tổng quan kinh doanh"
        description="Theo dõi các tín hiệu vận hành và kết quả bán hàng hiện có của PetMart."
        actions={<Button type="button" variant="outline" onClick={loadStats}><RefreshCw aria-hidden="true" />Làm mới</Button>}
      />

      <section aria-labelledby="admin-primary-metrics">
        <h2 id="admin-primary-metrics" className="mb-3 text-base font-semibold text-text-strong">Chỉ số chính</h2>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard label="Doanh thu hợp lệ" value={formatCurrency(stats.overview.totalRevenue)} description="Đơn đã giao hợp lệ" icon={<DollarSign className="size-5" />} tone="primary" />
          <StatCard label="Tổng đơn hàng" value={stats.overview.totalOrders} description={`${stats.overview.pendingOrders} đơn chờ xác nhận`} icon={<Package className="size-5" />} tone="secondary" />
          <StatCard label="Chờ xác nhận" value={stats.overview.pendingOrders} description="Cần xử lý theo quy trình đơn hàng" icon={<Clock3 className="size-5" />} tone="warning" />
          <StatCard label="Sắp hết hàng" value={stats.overview.lowStockProducts} description="Sản phẩm cần theo dõi tồn kho" icon={<Warehouse className="size-5" />} tone="destructive" />
        </div>
      </section>

      <AdminPanel title="Theo dõi vận hành" description="Các chỉ số bổ sung không làm thay đổi định nghĩa metric hiện có.">
        <dl className="grid gap-x-6 gap-y-5 sm:grid-cols-2 xl:grid-cols-4">
          <div><dt className="text-sm text-muted-foreground">Người dùng</dt><dd className="mt-1 text-xl font-semibold text-text-strong">{stats.overview.totalUsers}</dd></div>
          <div><dt className="text-sm text-muted-foreground">Sản phẩm</dt><dd className="mt-1 text-xl font-semibold text-text-strong">{stats.overview.totalProducts}</dd></div>
          <div><dt className="text-sm text-muted-foreground">Đơn đã hủy</dt><dd className="mt-1 flex items-center gap-2 text-xl font-semibold text-text-strong"><XCircle className="size-4 text-destructive" aria-hidden="true" />{stats.overview.cancelledOrders}</dd></div>
          <div><dt className="text-sm text-muted-foreground">Người dùng mới 30 ngày</dt><dd className="mt-1 flex items-center gap-2 text-xl font-semibold text-text-strong"><UserPlus className="size-4 text-secondary" aria-hidden="true" />{stats.overview.newUsers}</dd></div>
        </dl>
      </AdminPanel>

      <div className="grid gap-6 xl:grid-cols-3">
        <AdminPanel title="Doanh thu" description="30 ngày gần nhất; chỉ tính đơn đã giao hợp lệ.">
          {chartDates.length === 0 ? <EmptyState title="Chưa có dữ liệu doanh thu" description="Dữ liệu sẽ xuất hiện khi có đơn đã giao hợp lệ." /> : (
            <>
              <div className="h-56 border-b border-divider pb-2" role="img" aria-label="Biểu đồ doanh thu 30 ngày gần nhất">
                <div className="flex h-full items-end gap-1" aria-hidden="true">
                  {chartDates.map((item) => {
                    const height = maxRevenue > 0 ? Math.max((item.revenue / maxRevenue) * 100, item.revenue > 0 ? 4 : 0) : 0;
                    return <span key={item.date} title={`${formatDate(item.date)}: ${formatCurrency(item.revenue)}, ${item.orders} đơn đã giao`} className="group relative flex h-full flex-1 items-end"><span className="w-full rounded-t-sm bg-primary/80 transition-colors duration-fast group-hover:bg-primary" style={{ height: `${height}%` }} /></span>;
                  })}
                </div>
              </div>
              <div className="mt-2 flex justify-between gap-3 text-xs text-muted-foreground"><span>{formatDate(chartDates[0].date)}</span><span>{formatDate(chartDates[chartDates.length - 1].date)}</span></div>
              <ul className="sr-only">{chartDates.map((item) => <li key={item.date}>{formatDate(item.date)}: {formatCurrency(item.revenue)}, {item.orders} đơn đã giao.</li>)}</ul>
            </>
          )}
        </AdminPanel>

        <AdminPanel title="Trạng thái đơn hàng" description="Phân bổ đơn theo trạng thái hiện tại.">
          {stats.orderStatusStats.length === 0 ? <EmptyState title="Chưa có đơn hàng" description="Chưa có trạng thái đơn hàng để tổng hợp." /> : <div className="space-y-4">{stats.orderStatusStats.map((item) => <div key={item.status} className="space-y-2"><div className="flex items-center justify-between gap-3 text-sm"><span className="font-medium text-text-strong">{item.label}</span><span className="text-muted-foreground">{item.count}</span></div><MiniBar value={item.count} max={maxStatusCount} label={`${item.label}: ${item.count} đơn`} /></div>)}</div>}
        </AdminPanel>

        <AdminPanel title="Phương thức thanh toán" description="Số đơn, đơn tính doanh thu và doanh thu theo phương thức.">
          {stats.paymentMethodStats.length === 0 ? <EmptyState title="Chưa có dữ liệu thanh toán" description="Dữ liệu sẽ xuất hiện khi có đơn thanh toán." /> : <div className="space-y-5">{stats.paymentMethodStats.map((item) => <div key={item.method} className="space-y-2"><div className="flex items-start justify-between gap-3"><div><p className="text-sm font-medium text-text-strong">{item.method}</p><p className="mt-1 text-xs text-muted-foreground">{item.paidOrders} đơn tính doanh thu</p></div><div className="text-right"><p className="text-sm font-semibold text-primary">{formatCurrency(item.revenue)}</p><p className="mt-1 text-xs text-muted-foreground">{item.count} đơn</p></div></div><MiniBar value={item.count} max={maxPaymentCount} label={`${item.method}: ${item.count} đơn`} /></div>)}</div>}
        </AdminPanel>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <AdminPanel title="Sản phẩm bán chạy" description="Dựa trên số lượng đã bán và doanh thu ghi nhận.">
          <DataTable columns={topSellingColumns} data={stats.topSellingProducts} keyExtractor={(product) => product.productId || product.name} emptyTitle="Chưa có sản phẩm bán chạy" emptyText="Dữ liệu sẽ xuất hiện khi có đơn hàng hợp lệ." tableLabel="Bảng sản phẩm bán chạy" />
        </AdminPanel>
        <AdminPanel title="Sản phẩm sắp hết hàng" description="Ưu tiên kiểm tra các mặt hàng có tồn kho thấp.">
          <DataTable columns={lowStockColumns} data={stats.lowStockProducts} keyExtractor={(product) => product.id} emptyTitle="Không có sản phẩm sắp hết hàng" emptyText="Tồn kho hiện không có mặt hàng cần theo dõi." tableLabel="Bảng sản phẩm sắp hết hàng" />
        </AdminPanel>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <AdminPanel title="Đơn hàng gần đây" description="Các đơn mới nhất kèm trạng thái và phương thức thanh toán.">
          <DataTable columns={recentOrderColumns} data={stats.recentOrders} keyExtractor={(order) => order.id} emptyTitle="Chưa có đơn hàng gần đây" emptyText="Đơn hàng mới sẽ xuất hiện ở đây." tableLabel="Bảng đơn hàng gần đây" />
        </AdminPanel>
        <AdminPanel title="Mã giảm giá" description="Tối đa 8 mã gần đây từ nguồn dữ liệu hiện có.">
          <DataTable
            columns={couponColumns}
            data={coupons}
            keyExtractor={(coupon) => coupon._id}
            isLoading={couponsLoading}
            error={couponsError ? { title: "Chưa thể tải mã giảm giá", description: couponsError, action: <Button type="button" variant="outline" onClick={loadCoupons}><RefreshCw aria-hidden="true" />Tải lại</Button> } : null}
            emptyTitle="Chưa có mã giảm giá"
            emptyText="Tạo mã giảm giá từ khu vực quản lý để bắt đầu."
            tableLabel="Bảng mã giảm giá"
          />
        </AdminPanel>
      </div>

      <AdminPanel title="Khách hàng chi tiêu nhiều" description="Danh sách dựa trên dữ liệu chi tiêu và số đơn hiện có.">
        {stats.bestCustomers.length === 0 ? <EmptyState title="Chưa có dữ liệu khách hàng" description="Dữ liệu sẽ xuất hiện khi có lịch sử đơn hàng." /> : <ol className="divide-y divide-divider">{stats.bestCustomers.map((customer, index) => <li key={customer.userId || customer.email || index} className="flex items-center justify-between gap-4 py-4 first:pt-0 last:pb-0"><div className="min-w-0"><p className="truncate font-medium text-text-strong">{index + 1}. {customer.name || "Khách hàng"}</p>{customer.email && <p className="mt-1 truncate text-sm text-muted-foreground">{customer.email}</p>}</div><div className="shrink-0 text-right"><p className="font-semibold text-primary">{formatCurrency(customer.totalSpent)}</p><p className="mt-1 text-xs text-muted-foreground">{customer.orderCount} đơn</p></div></li>)}</ol>}
      </AdminPanel>
    </div>
  );
};

export default DashboardPage;
