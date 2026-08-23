import Coupon from '../models/Coupon.js';
import Product from '../models/Product.js';

const createReservationError = (code, message, statusCode = 400) => {
    const error = new Error(message);
    error.code = code;
    error.statusCode = statusCode;
    return error;
};

export const reserveOrderInventory = async (orderItems, session) => {
    for (const item of orderItems) {
        const quantity = Number(item.qty);
        const result = await Product.updateOne(
            {
                _id: item.product,
                stock: { $gte: quantity },
            },
            {
                $inc: {
                    stock: -quantity,
                    sold: quantity,
                },
            },
            { session },
        );

        if (result.matchedCount !== 1) {
            throw createReservationError(
                'ORDER_STOCK_CHANGED',
                `Sản phẩm "${item.name || 'đã chọn'}" vừa thay đổi tồn kho. Vui lòng kiểm tra lại giỏ hàng.`,
                409,
            );
        }
    }
};

export const reserveCouponUsage = async (coupon, itemsPrice, session) => {
    if (!coupon) return false;

    const now = new Date();
    const result = await Coupon.updateOne(
        {
            _id: coupon._id,
            expirationDate: { $gte: now },
            minOrderValue: { $lte: itemsPrice },
            $or: [
                { usageLimit: { $lte: 0 } },
                { $expr: { $lt: [{ $ifNull: ['$usedCount', 0] }, '$usageLimit'] } },
            ],
        },
        { $inc: { usedCount: 1 } },
        { session },
    );

    if (result.matchedCount !== 1) {
        throw createReservationError(
            'COUPON_UNAVAILABLE',
            'Mã giảm giá không còn khả dụng. Vui lòng kiểm tra lại trước khi đặt hàng.',
        );
    }

    return true;
};

export const releaseOrderReservations = async (order, session) => {
    if (!order.inventoryReservationActive) return false;

    for (const item of order.orderItems || []) {
        const quantity = Number(item.qty);
        if (!Number.isFinite(quantity) || quantity <= 0) continue;

        await Product.updateOne(
            { _id: item.product },
            [
                {
                    $set: {
                        stock: { $add: [{ $ifNull: ['$stock', 0] }, quantity] },
                        sold: {
                            $max: [
                                0,
                                { $subtract: [{ $ifNull: ['$sold', 0] }, quantity] },
                            ],
                        },
                    },
                },
            ],
            { session, updatePipeline: true },
        );
    }

    if (order.couponUsageCounted && order.coupon) {
        await Coupon.updateOne(
            { _id: order.coupon, usedCount: { $gt: 0 } },
            { $inc: { usedCount: -1 } },
            { session },
        );
    }

    order.inventoryReservationActive = false;
    order.inventoryReleasedAt = new Date();
    order.couponUsageCounted = false;
    return true;
};
