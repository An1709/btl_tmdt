import Order from '../models/Order.js';
import Product from '../models/Product.js';
import moment from 'moment';
import qs from 'qs';
import crypto from 'crypto';
import vnpayConfig from '../config/vnpayConfig.js';

const ORDER_STATUS_FLOW = ['Pending', 'Processing', 'Shipping', 'Delivered'];
const CUSTOMER_CANCELLABLE_STATUSES = ['Pending', 'Processing'];

// Must match paymentController.js exactly — this is the VNPay-verified sort logic
function sortObject(obj) {
    const sorted = {};
    const keys = Object.keys(obj).map(k => encodeURIComponent(k)).sort();
    for (const key of keys) {
        sorted[key] = encodeURIComponent(obj[decodeURIComponent(key)]).replace(/%20/g, '+');
    }
    return sorted;
}

// Helper: generate VNPay payment URL using real order ID
function buildVNPayUrl(orderId, amount, ipAddr) {
    process.env.TZ = 'Asia/Ho_Chi_Minh';

    const createDate = moment().format('YYYYMMDDHHmmss');
    // txnRef must be unique per transaction; use last 8 chars of Mongo ObjectId
    const txnRef = String(orderId).slice(-8).toUpperCase();

    let vnp_Params = {};
    vnp_Params['vnp_Version']   = '2.1.0';
    vnp_Params['vnp_Command']   = 'pay';
    vnp_Params['vnp_TmnCode']   = vnpayConfig.vnp_TmnCode;
    vnp_Params['vnp_Locale']    = 'vn';
    vnp_Params['vnp_CurrCode']  = 'VND';
    vnp_Params['vnp_TxnRef']    = txnRef;
    vnp_Params['vnp_OrderInfo'] = 'Thanh toan don hang:' + txnRef;
    vnp_Params['vnp_OrderType'] = 'other';
    vnp_Params['vnp_Amount']    = amount * 100;
    vnp_Params['vnp_ReturnUrl'] = vnpayConfig.vnp_ReturnUrl;
    vnp_Params['vnp_IpAddr']    = ipAddr;
    vnp_Params['vnp_CreateDate']= createDate;

    // Sort BEFORE hashing (VNPay requirement)
    vnp_Params = sortObject(vnp_Params);

    const signData = qs.stringify(vnp_Params, { encode: false });
    const hmac     = crypto.createHmac('sha512', vnpayConfig.vnp_HashSecret);
    const signed   = hmac.update(Buffer.from(signData, 'utf-8')).digest('hex');

    vnp_Params['vnp_SecureHash'] = signed;
    return vnpayConfig.vnp_Url + '?' + qs.stringify(vnp_Params, { encode: false });
}


// @desc    Tạo đơn hàng mới
// @route   POST /api/orders
// Response (COD):    { ...order }
// Response (VNPay):  { ...order, paymentUrl: string }
export const addOrderItems = async (req, res, next) => {
    const {
        orderItems,
        shippingAddress,
        paymentMethod,
        itemsPrice,
        shippingPrice,
        totalPrice,
        discountAmount,
        coupon,
    } = req.body;

    if (!orderItems || orderItems.length === 0) {
        return res.status(400).json({ message: 'Giỏ hàng trống' });
    }

    try {
        // 1. Save the order
        const order = new Order({
            orderItems,
            user: req.user._id,
            shippingAddress,
            paymentMethod,
            itemsPrice,
            shippingPrice,
            totalPrice,
            discountAmount: discountAmount || 0,
            ...(coupon && { coupon }),
        });

        const createdOrder = await order.save();

        // 2. Decrement stock
        for (const item of orderItems) {
            const product = await Product.findById(item.product);
            if (product) {
                product.stock = Math.max(0, product.stock - item.qty);
                product.sold = (product.sold || 0) + item.qty;
                await product.save();
            }
        }

        // 3. If VNPay: generate payment URL and include it in response
        if (paymentMethod && paymentMethod.toLowerCase() === 'vnpay') {
            const ipAddr =
                req.headers['x-forwarded-for'] ||
                req.socket?.remoteAddress ||
                req.connection?.remoteAddress ||
                '127.0.0.1';

            const paymentUrl = buildVNPayUrl(createdOrder._id, createdOrder.totalPrice, ipAddr);

            return res.status(201).json({ ...createdOrder.toObject(), paymentUrl });
        }

        // 4. COD: return order as-is
        return res.status(201).json(createdOrder);

    } catch (error) {
        console.error('Create order error:', error);
        next(error); // delegate to Express global error handler
    }
};

// @desc    Lấy đơn hàng của tôi
// @route   GET /api/orders/myorders
export const getMyOrders = async (req, res, next) => {
    try {
        const orders = await Order.find({ user: req.user._id }).sort({ createdAt: -1 });
        res.json(orders);
    } catch (error) {
        next(error);
    }
};

// @desc    Lấy chi tiết đơn hàng
// @route   GET /api/orders/:id
// @desc    Admin get all orders
// @route   GET /api/orders
export const getOrders = async (req, res, next) => {
    try {
        const orders = await Order.find({})
            .populate('user', 'username displayName email')
            .sort({ createdAt: -1 });

        res.json(orders);
    } catch (error) {
        next(error);
    }
};

// @desc    Admin update order status one step at a time
// @route   PUT /api/orders/:id/status
export const updateOrderStatus = async (req, res, next) => {
    try {
        const { status } = req.body;
        const order = await Order.findById(req.params.id);

        if (!order) {
            return res.status(404).json({ message: 'Khong tim thay don hang' });
        }

        if (!ORDER_STATUS_FLOW.includes(status)) {
            return res.status(400).json({ message: 'Trang thai don hang khong hop le' });
        }

        if (order.status === 'Cancelled') {
            return res.status(400).json({ message: 'Khong the cap nhat don hang da huy' });
        }

        if (order.cancelStatus === 'pending') {
            return res.status(400).json({ message: 'Don hang dang co yeu cau huy, vui long xu ly yeu cau truoc' });
        }

        const currentIndex = ORDER_STATUS_FLOW.indexOf(order.status);
        if (currentIndex === -1) {
            return res.status(400).json({ message: 'Trang thai hien tai khong hop le' });
        }

        const nextStatus = ORDER_STATUS_FLOW[currentIndex + 1];

        if (!nextStatus) {
            return res.status(400).json({ message: 'Don hang da o trang thai cuoi' });
        }

        if (status !== nextStatus) {
            return res.status(400).json({ message: `Chi co the chuyen sang trang thai ${nextStatus}` });
        }

        order.status = status;

        if (status === 'Delivered') {
            order.isDelivered = true;
            order.deliveredAt = new Date();
        }

        const updatedOrder = await order.save();
        res.json(updatedOrder);
    } catch (error) {
        next(error);
    }
};

// @desc    Customer request order cancellation
// @route   POST /api/orders/:id/cancel-request
export const requestOrderCancellation = async (req, res, next) => {
    try {
        const { reason } = req.body;
        const order = await Order.findById(req.params.id);

        if (!order) {
            return res.status(404).json({ message: 'Không tìm thấy đơn hàng.' });
        }

        if (!order.user.equals(req.user._id)) {
            return res.status(403).json({ message: 'Bạn không có quyền hủy đơn hàng này.' });
        }

        if (!CUSTOMER_CANCELLABLE_STATUSES.includes(order.status)) {
            return res.status(400).json({ message: 'Đơn hàng này không thể hủy ở trạng thái hiện tại.' });
        }

        if (order.cancelStatus === 'pending') {
            return res.status(400).json({ message: 'Yêu cầu hủy đơn đã được gửi trước đó.' });
        }

        order.cancelRequested = true;
        order.cancelReason = String(reason || '').trim();
        order.cancelRequestedAt = new Date();
        order.cancelStatus = 'pending';
        order.cancelResolvedAt = undefined;
        order.cancelRejectionReason = undefined;

        const updatedOrder = await order.save();
        res.status(200).json({
            message: 'Yêu cầu hủy đơn đã được gửi.',
            order: updatedOrder,
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Admin approve/reject cancellation request
// @route   PUT /api/orders/:id/cancel-request
export const resolveOrderCancellation = async (req, res, next) => {
    try {
        const { action, reason } = req.body;
        const order = await Order.findById(req.params.id);

        if (!order) {
            return res.status(404).json({ message: 'Không tìm thấy đơn hàng.' });
        }

        if (order.cancelStatus !== 'pending') {
            return res.status(400).json({ message: 'Đơn hàng không có yêu cầu hủy đang chờ xử lý.' });
        }

        if (action === 'approve') {
            order.status = 'Cancelled';
            order.cancelRequested = false;
            order.cancelStatus = 'approved';
            order.cancelResolvedAt = new Date();
            order.cancelRejectionReason = undefined;
        } else if (action === 'reject') {
            order.cancelRequested = false;
            order.cancelStatus = 'rejected';
            order.cancelResolvedAt = new Date();
            order.cancelRejectionReason = String(reason || '').trim();
        } else {
            return res.status(400).json({ message: 'Hành động xử lý yêu cầu hủy không hợp lệ.' });
        }

        const updatedOrder = await order.save();
        res.status(200).json(updatedOrder);
    } catch (error) {
        next(error);
    }
};

export const getOrderById = async (req, res, next) => {
    try {
        const order = await Order.findById(req.params.id).populate('user', 'fullName email');
        if (!order) {
            return res.status(404).json({ message: 'Không tìm thấy đơn hàng' });
        }
        if (req.user.role === 'admin' || order.user._id.equals(req.user._id)) {
            return res.json(order);
        }
        return res.status(403).json({ message: 'Không có quyền xem đơn hàng này' });
    } catch (error) {
        next(error);
    }
};
