import Order from '../models/Order.js';
import Product from '../models/Product.js';

// @desc    Tạo đơn hàng mới
// @route   POST /api/orders
export const addOrderItems = async (req, res) => {
    const {
        orderItems,
        shippingAddress,
        paymentMethod,
        itemsPrice,
        shippingPrice,
        totalPrice,
    } = req.body;

    if (orderItems && orderItems.length === 0) {
        return res.status(400).json({ message: 'Giỏ hàng trống' });
    } else {
        try {
            const order = new Order({
                orderItems,
                user: req.user._id,
                shippingAddress,
                paymentMethod,
                itemsPrice,
                shippingPrice,
                totalPrice,
            });

            const createdOrder = await order.save();

            // Trừ tồn kho (Stock)
            for (const item of orderItems) {
                const product = await Product.findById(item.product);
                if (product) {
                    product.stock = product.stock - item.qty;
                    product.sold = (product.sold || 0) + item.qty; // Tăng số lượng đã bán
                    await product.save();
                }
            }

            res.status(201).json(createdOrder);
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    }
};

// @desc    Lấy đơn hàng của tôi
// @route   GET /api/orders/myorders
export const getMyOrders = async (req, res) => {
    try {
        const orders = await Order.find({ user: req.user._id }).sort({ createdAt: -1 });
        res.json(orders);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Lấy chi tiết đơn hàng
// @route   GET /api/orders/:id
export const getOrderById = async (req, res) => {
    try {
        const order = await Order.findById(req.params.id).populate('user', 'fullName email');
        if (order) {
            // Kiểm tra quyền: Chỉ Admin hoặc Chủ đơn hàng mới được xem
            if(req.user.role === 'admin' || order.user._id.equals(req.user._id)){
                res.json(order);
            } else {
                res.status(403).json({ message: 'Không có quyền xem đơn hàng này' });
            }
        } else {
            res.status(404).json({ message: 'Không tìm thấy đơn hàng' });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};