import Order from '../models/Order.js';
import Product from '../models/Product.js';
import User from '../models/User.js';

const COMPLETED_STATUS = 'Delivered';
const LOW_STOCK_THRESHOLD = 5;
const RECENT_LIMIT = 8;
const TOP_LIMIT = 6;

const ORDER_STATUS_LABELS = {
    Pending: 'Chờ xác nhận',
    Processing: 'Đang xử lý',
    Shipping: 'Đang giao',
    Delivered: 'Đã giao',
    Cancelled: 'Đã hủy',
};

const isValidRevenueExpression = {
    $and: [
        { $eq: ['$status', COMPLETED_STATUS] },
        {
            $or: [
                { $eq: [{ $toLower: '$paymentMethod' }, 'cod'] },
                {
                    $and: [
                        { $eq: [{ $toLower: '$paymentMethod' }, 'vnpay'] },
                        { $eq: ['$isPaid', true] },
                    ],
                },
            ],
        },
    ],
};

const buildDateBuckets = (days = 30) => {
    const buckets = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (let index = days - 1; index >= 0; index -= 1) {
        const date = new Date(today);
        date.setDate(today.getDate() - index);
        buckets.push(date.toISOString().slice(0, 10));
    }

    return buckets;
};

const normalizePaymentMethod = (value) => {
    const method = String(value || '').toLowerCase();
    if (method === 'vnpay') return 'VNPay';
    if (method === 'cod') return 'COD';
    return value || 'Khác';
};

const getRevenueChart = async () => {
    const days = 30;
    const buckets = buildDateBuckets(days);
    const startDate = new Date(`${buckets[0]}T00:00:00.000Z`);

    const revenue = await Order.aggregate([
        {
            $addFields: {
                isValidRevenue: isValidRevenueExpression,
            },
        },
        {
            $match: {
                createdAt: { $gte: startDate },
                isValidRevenue: true,
            },
        },
        {
            $group: {
                _id: {
                    $dateToString: {
                        format: '%Y-%m-%d',
                        date: '$createdAt',
                        timezone: 'Asia/Ho_Chi_Minh',
                    },
                },
                revenue: { $sum: { $ifNull: ['$totalPrice', 0] } },
                orders: { $sum: 1 },
            },
        },
        { $sort: { _id: 1 } },
    ]);

    const revenueMap = new Map(revenue.map((item) => [item._id, item]));

    return buckets.map((date) => ({
        date,
        revenue: revenueMap.get(date)?.revenue || 0,
        orders: revenueMap.get(date)?.orders || 0,
    }));
};

const getStatusStats = async () => {
    const [statusCounts, cancelRequested] = await Promise.all([
        Order.aggregate([
            { $group: { _id: '$status', count: { $sum: 1 } } },
        ]),
        Order.countDocuments({ cancelStatus: 'pending' }),
    ]);

    const countMap = new Map(statusCounts.map((item) => [item._id, item.count]));
    const statuses = Object.entries(ORDER_STATUS_LABELS).map(([status, label]) => ({
        status,
        label,
        count: countMap.get(status) || 0,
    }));

    if (cancelRequested > 0) {
        statuses.push({
            status: 'CancelRequested',
            label: 'Yêu cầu hủy',
            count: cancelRequested,
        });
    }

    return statuses;
};

const getPaymentStats = async () => {
    const stats = await Order.aggregate([
        {
            $group: {
                _id: { $toLower: '$paymentMethod' },
                count: { $sum: 1 },
                paidOrders: {
                    $sum: {
                        $cond: [
                            isValidRevenueExpression,
                            1,
                            0,
                        ],
                    },
                },
                revenue: {
                    $sum: {
                        $cond: [
                            isValidRevenueExpression,
                            { $ifNull: ['$totalPrice', 0] },
                            0,
                        ],
                    },
                },
            },
        },
    ]);

    const statMap = new Map(stats.map((item) => [item._id, item]));

    return ['cod', 'vnpay'].map((method) => ({
        method: normalizePaymentMethod(method),
        count: statMap.get(method)?.count || 0,
        paidOrders: statMap.get(method)?.paidOrders || 0,
        revenue: statMap.get(method)?.revenue || 0,
    }));
};

const getTopSellingProducts = async () => Order.aggregate([
    {
        $addFields: {
            isValidRevenue: isValidRevenueExpression,
        },
    },
    { $match: { isValidRevenue: true } },
    { $unwind: '$orderItems' },
    {
        $group: {
            _id: '$orderItems.product',
            name: { $first: '$orderItems.name' },
            soldQuantity: { $sum: { $ifNull: ['$orderItems.qty', 0] } },
            revenue: {
                $sum: {
                    $multiply: [
                        { $ifNull: ['$orderItems.qty', 0] },
                        { $ifNull: ['$orderItems.price', 0] },
                    ],
                },
            },
        },
    },
    { $sort: { soldQuantity: -1, revenue: -1 } },
    { $limit: TOP_LIMIT },
    {
        $project: {
            _id: 0,
            productId: '$_id',
            name: 1,
            soldQuantity: 1,
            revenue: 1,
        },
    },
]);

const getBestCustomers = async () => Order.aggregate([
    {
        $addFields: {
            isValidRevenue: isValidRevenueExpression,
        },
    },
    { $match: { isValidRevenue: true } },
    {
        $group: {
            _id: '$user',
            totalSpent: { $sum: { $ifNull: ['$totalPrice', 0] } },
            orderCount: { $sum: 1 },
        },
    },
    { $sort: { totalSpent: -1, orderCount: -1 } },
    { $limit: TOP_LIMIT },
    {
        $lookup: {
            from: 'users',
            localField: '_id',
            foreignField: '_id',
            as: 'user',
        },
    },
    { $unwind: { path: '$user', preserveNullAndEmptyArrays: true } },
    {
        $project: {
            _id: 0,
            userId: '$_id',
            name: { $ifNull: ['$user.displayName', '$user.username'] },
            email: '$user.email',
            totalSpent: 1,
            orderCount: 1,
        },
    },
]);

export const getDashboardStats = async (req, res, next) => {
    try {
        const newUsersStartDate = new Date();
        newUsersStartDate.setDate(newUsersStartDate.getDate() - 30);

        const [
            totalRevenueAgg,
            totalOrders,
            totalUsers,
            totalProducts,
            pendingOrders,
            cancelledOrders,
            lowStockProductsCount,
            newUsers,
            revenueChart,
            orderStatusStats,
            paymentMethodStats,
            topSellingProducts,
            recentOrders,
            lowStockProducts,
            bestCustomers,
        ] = await Promise.all([
            Order.aggregate([
                {
                    $addFields: {
                        isValidRevenue: isValidRevenueExpression,
                    },
                },
                { $match: { isValidRevenue: true } },
                {
                    $group: {
                        _id: null,
                        totalRevenue: { $sum: { $ifNull: ['$totalPrice', 0] } },
                    },
                },
            ]),
            Order.countDocuments(),
            User.countDocuments(),
            Product.countDocuments(),
            Order.countDocuments({ status: 'Pending' }),
            Order.countDocuments({
                $or: [
                    { status: 'Cancelled' },
                    { cancelStatus: 'approved' },
                ],
            }),
            Product.countDocuments({ stock: { $lte: LOW_STOCK_THRESHOLD } }),
            User.countDocuments({ createdAt: { $gte: newUsersStartDate } }),
            getRevenueChart(),
            getStatusStats(),
            getPaymentStats(),
            getTopSellingProducts(),
            Order.find({})
                .populate('user', 'displayName username email')
                .select('user totalPrice status paymentMethod isPaid createdAt')
                .sort({ createdAt: -1 })
                .limit(RECENT_LIMIT)
                .lean(),
            Product.find({ stock: { $lte: LOW_STOCK_THRESHOLD } })
                .populate('category', 'name slug')
                .select('name stock category')
                .sort({ stock: 1, updatedAt: -1 })
                .limit(RECENT_LIMIT)
                .lean(),
            getBestCustomers(),
        ]);

        res.json({
            overview: {
                totalRevenue: totalRevenueAgg[0]?.totalRevenue || 0,
                totalOrders,
                totalUsers,
                totalProducts,
                pendingOrders,
                cancelledOrders,
                lowStockProducts: lowStockProductsCount,
                newUsers,
            },
            revenueChart,
            orderStatusStats,
            paymentMethodStats,
            topSellingProducts,
            recentOrders: recentOrders.map((order) => ({
                id: order._id,
                orderCode: `#${String(order._id).slice(-8).toUpperCase()}`,
                customer: {
                    name: order.user?.displayName || order.user?.username || 'Khách hàng',
                    email: order.user?.email || '',
                },
                totalAmount: order.totalPrice || 0,
                status: order.status,
                paymentMethod: normalizePaymentMethod(order.paymentMethod),
                isPaid: Boolean(order.isPaid),
                createdAt: order.createdAt,
            })),
            lowStockProducts: lowStockProducts.map((product) => ({
                id: product._id,
                name: product.name,
                stock: product.stock || 0,
                category: product.category
                    ? {
                        name: product.category.name,
                        slug: product.category.slug,
                    }
                    : null,
            })),
            bestCustomers,
        });
    } catch (error) {
        next(error);
    }
};
