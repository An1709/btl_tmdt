import Order from '../models/Order.js';

export const canReview = async (req, res, next) => {
    try {
        const userId = req.user._id;
        const productId = req.body.productId || req.params.productId || req.params.id;

        if (!productId) {
            return res.status(400).json({ message: 'Thieu thong tin san pham' });
        }

        const hasPurchased = await Order.findOne({
            user: userId,
            'orderItems.product': productId,
            $or: [
                { status: { $in: ['Delivered', 'Completed'] } },
                { isDelivered: true },
            ],
        });

        if (!hasPurchased) {
            return res.status(403).json({
                message: 'Ban chi co the danh gia san pham da mua va da giao thanh cong.',
            });
        }

        return next();
    } catch (error) {
        console.error('Error in reviewMiddleware:', error);
        return res.status(500).json({ message: 'Loi server khi kiem tra quyen danh gia' });
    }
};
