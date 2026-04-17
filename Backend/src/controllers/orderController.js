import Order from '../models/Order.js';
import Product from '../models/Product.js';
import moment from 'moment';
import qs from 'qs';
import crypto from 'crypto';
import vnpayConfig from '../config/vnpayConfig.js';

// Helper: generate VNPay payment URL (mirrors paymentController logic but uses real orderId)
function buildVNPayUrl(orderId, amount, ipAddr) {
    process.env.TZ = 'Asia/Ho_Chi_Minh';

    const createDate = moment().format('YYYYMMDDHHmmss');
    const txnRef = String(orderId).slice(-8).toUpperCase(); // use order ID as ref

    let vnp_Params = {
        vnp_Version: '2.1.0',
        vnp_Command: 'pay',
        vnp_TmnCode: vnpayConfig.vnp_TmnCode,
        vnp_Locale: 'vn',
        vnp_CurrCode: 'VND',
        vnp_TxnRef: txnRef,
        vnp_OrderInfo: 'Thanh toan don hang #' + txnRef,
        vnp_OrderType: 'other',
        vnp_Amount: amount * 100,
        vnp_ReturnUrl: vnpayConfig.vnp_ReturnUrl,
        vnp_IpAddr: ipAddr,
        vnp_CreateDate: createDate,
    };

    // Sort params (VNPAY requirement)
    const sortedParams = {};
    Object.keys(vnp_Params)
        .sort()
        .forEach((key) => {
            sortedParams[encodeURIComponent(key)] = encodeURIComponent(vnp_Params[key]).replace(/%20/g, '+');
        });

    const signData = qs.stringify(sortedParams, { encode: false });
    const hmac = crypto.createHmac('sha512', vnpayConfig.vnp_HashSecret);
    const signed = hmac.update(Buffer.from(signData, 'utf-8')).digest('hex');

    sortedParams['vnp_SecureHash'] = signed;
    return vnpayConfig.vnp_Url + '?' + qs.stringify(sortedParams, { encode: false });
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