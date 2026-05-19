import Order from '../models/Order.js';
import Product from '../models/Product.js';
import User from '../models/User.js';
import moment from 'moment';
import qs from 'qs';
import crypto from 'crypto';
import vnpayConfig from '../config/vnpayConfig.js';
import { isValidVietnamMobilePhone, normalizeVietnamPhone } from '../utils/vietnamPhone.js';

const ORDER_STATUS_FLOW = ['Pending', 'Processing', 'Shipping', 'Delivered'];
const CUSTOMER_CANCELLABLE_STATUSES = ['Pending', 'Processing'];
const POINTS_PER_VND = 10000;
const MEMBERSHIP_THRESHOLDS = [
    { level: 'Đồng', min: 0 },
    { level: 'Bạc', min: 100 },
    { level: 'Vàng', min: 300 },
    { level: 'Kim cương', min: 700 },
];
const ORDER_STATUS_NOTES = {
    Created: 'Đơn hàng đã được tạo',
    Pending: 'Chờ xác nhận',
    Processing: 'Đơn hàng đang được xử lý',
    Shipping: 'Đơn hàng đang được giao',
    Delivered: 'Đơn hàng đã giao thành công',
    CancelRequested: 'Khách hàng đã yêu cầu hủy đơn',
    CancelRejected: 'Shop đã từ chối yêu cầu hủy đơn',
    Cancelled: 'Đơn hàng đã bị hủy',
};
const VNPAY_CONFIG_ERROR = 'Thiếu cấu hình VNPay. Vui lòng kiểm tra VNP_TMN_CODE, VNP_HASH_SECRET và VNP_RETURN_URL.';
const VNPAY_EXPECTED_RETURN_PATH = '/api/payment/vnpay_return';
const VNPAY_EXPECTED_IPN_PATH = '/api/payment/vnpay_ipn';

const buildFullAddress = ({ streetAddress, ward, district, province }) =>
    [streetAddress, ward, district, province]
        .map((part) => String(part || '').trim())
        .filter(Boolean)
        .join(', ');

const validateAndNormalizeShippingAddress = (shippingAddress = {}) => {
    const fullName = String(shippingAddress.fullName || '').trim();
    const rawPhone = String(shippingAddress.phone || '').trim();
    const normalizedPhone = normalizeVietnamPhone(rawPhone);
    const province = String(shippingAddress.province || shippingAddress.city || '').trim();
    const district = String(shippingAddress.district || '').trim();
    const ward = String(shippingAddress.ward || '').trim();
    const streetAddress = String(shippingAddress.streetAddress || shippingAddress.address || '').trim();

    if (!fullName) return { error: 'Vui lòng nhập họ và tên.' };
    if (!rawPhone) return { error: 'Vui lòng nhập số điện thoại.' };
    if (!/^\d+$/.test(normalizedPhone)) return { error: 'Số điện thoại không hợp lệ.' };
    if (!isValidVietnamMobilePhone(rawPhone)) {
        return { error: 'Số điện thoại phải là số di động Việt Nam hợp lệ.' };
    }
    if (!province) return { error: 'Vui lòng chọn Tỉnh/Thành phố.' };
    if (!district) return { error: 'Vui lòng chọn Quận/Huyện.' };
    if (!ward) return { error: 'Vui lòng chọn Phường/Xã.' };
    if (!streetAddress) return { error: 'Vui lòng nhập địa chỉ cụ thể.' };

    const fullAddress = buildFullAddress({ streetAddress, ward, district, province });

    return {
        value: {
            fullName,
            phone: normalizedPhone,
            province,
            district,
            ward,
            streetAddress,
            fullAddress,
            address: streetAddress,
            city: province,
        },
    };
};

const getActorRole = (user) => user?.role || 'customer';

const getActorId = (user) => user?._id || undefined;

const appendStatusHistory = (order, { status, note, user, updatedAt = new Date() }) => {
    const nextStatus = String(status || '').trim();
    if (!nextStatus) return;

    const nextNote = String(note || ORDER_STATUS_NOTES[nextStatus] || nextStatus).trim();
    const history = Array.isArray(order.statusHistory) ? order.statusHistory : [];
    const last = history[history.length - 1];

    if (
        last
        && last.status === nextStatus
        && String(last.note || '') === nextNote
    ) {
        return;
    }

    order.statusHistory = history;
    order.statusHistory.push({
        status: nextStatus,
        note: nextNote,
        updatedAt,
        updatedBy: getActorId(user),
        updatedByRole: getActorRole(user),
    });
};

const buildFallbackStatusHistory = (order) => {
    const createdAt = order.createdAt || order._id?.getTimestamp?.() || new Date();
    const history = [{
        status: 'Created',
        note: ORDER_STATUS_NOTES.Created,
        updatedAt: createdAt,
        updatedBy: order.user?._id || order.user,
        updatedByRole: 'customer',
    }];

    if (order.status && order.status !== 'Pending') {
        history.push({
            status: order.status,
            note: ORDER_STATUS_NOTES[order.status] || order.status,
            updatedAt: order.updatedAt || createdAt,
            updatedByRole: order.status === 'Cancelled' ? 'admin' : 'system',
        });
    } else {
        history.push({
            status: 'Pending',
            note: ORDER_STATUS_NOTES.Pending,
            updatedAt: createdAt,
            updatedByRole: 'system',
        });
    }

    if (order.cancelRequestedAt) {
        history.push({
            status: 'CancelRequested',
            note: ORDER_STATUS_NOTES.CancelRequested,
            updatedAt: order.cancelRequestedAt,
            updatedBy: order.user?._id || order.user,
            updatedByRole: 'customer',
        });
    }

    if (order.cancelStatus === 'rejected' && order.cancelResolvedAt) {
        history.push({
            status: 'CancelRejected',
            note: order.cancelRejectionReason
                ? `${ORDER_STATUS_NOTES.CancelRejected}: ${order.cancelRejectionReason}`
                : ORDER_STATUS_NOTES.CancelRejected,
            updatedAt: order.cancelResolvedAt,
            updatedByRole: 'admin',
        });
    }

    if (order.status === 'Cancelled') {
        history.push({
            status: 'Cancelled',
            note: ORDER_STATUS_NOTES.Cancelled,
            updatedAt: order.cancelResolvedAt || order.updatedAt || createdAt,
            updatedByRole: 'admin',
        });
    }

    return history
        .filter((item, index, items) => (
            index === 0
            || item.status !== items[index - 1].status
            || item.note !== items[index - 1].note
        ))
        .sort((a, b) => new Date(a.updatedAt) - new Date(b.updatedAt));
};

const sanitizeStatusHistory = (history = []) => history.map((item) => ({
    status: item.status,
    note: item.note,
    updatedAt: item.updatedAt,
    updatedBy: item.updatedBy,
    updatedByRole: item.updatedByRole,
}));

const withStatusHistory = (order) => {
    const orderObject = typeof order.toObject === 'function' ? order.toObject() : order;
    const history = Array.isArray(orderObject.statusHistory) && orderObject.statusHistory.length
        ? orderObject.statusHistory
        : buildFallbackStatusHistory(orderObject);

    return {
        ...orderObject,
        statusHistory: sanitizeStatusHistory(history),
    };
};

const getMembershipLevel = (points = 0) => {
    const safePoints = Math.max(Number(points) || 0, 0);
    return [...MEMBERSHIP_THRESHOLDS].reverse().find((item) => safePoints >= item.min)?.level || 'Đồng';
};

const isPaymentEligibleForLoyalty = (order) => {
    const paymentMethod = String(order.paymentMethod || '').toLowerCase();
    return paymentMethod === 'cod' || order.isPaid === true;
};

const awardLoyaltyPointsIfEligible = async (order) => {
    if (
        order.status !== 'Delivered'
        || order.loyaltyPointsAwarded
        || order.status === 'Cancelled'
        || !isPaymentEligibleForLoyalty(order)
    ) {
        return order;
    }

    const points = Math.floor(Number(order.totalPrice || 0) / POINTS_PER_VND);
    if (points <= 0) return order;

    const updatedUser = await User.findByIdAndUpdate(
        order.user,
        { $inc: { loyaltyPoints: points } },
        { new: true },
    ).select('loyaltyPoints membershipLevel');

    if (updatedUser) {
        updatedUser.membershipLevel = getMembershipLevel(updatedUser.loyaltyPoints);
        await updatedUser.save({ validateBeforeSave: false });
    }

    order.loyaltyPointsAwarded = true;
    order.loyaltyPoints = points;
    order.loyaltyAwardedAt = new Date();

    return order;
};

// Must match paymentController.js exactly — this is the VNPay-verified sort logic
function sortObject(obj) {
    const sorted = {};
    const keys = Object.keys(obj).map(k => encodeURIComponent(k)).sort();
    for (const key of keys) {
        sorted[key] = encodeURIComponent(obj[decodeURIComponent(key)]).replace(/%20/g, '+');
    }
    return sorted;
}

function getUrlPath(url) {
    try {
        return new URL(url).pathname;
    } catch {
        return '';
    }
}

function getVNPaySettings() {
    const tmnCode = String(vnpayConfig.vnp_TmnCode || '').trim();
    const hashSecret = String(vnpayConfig.vnp_HashSecret || '').trim();
    const vnpUrl = String(vnpayConfig.vnp_Url || '').trim();
    const returnUrl = String(vnpayConfig.vnp_ReturnUrl || '').trim();
    const ipnUrl = String(vnpayConfig.vnp_IpnUrl || '').trim();

    const returnPath = getUrlPath(returnUrl);
    const ipnPath = ipnUrl ? getUrlPath(ipnUrl) : '';

    if (!tmnCode || !hashSecret || !vnpUrl || !returnUrl || returnPath !== VNPAY_EXPECTED_RETURN_PATH || (ipnUrl && ipnPath !== VNPAY_EXPECTED_IPN_PATH)) {
        const error = new Error(VNPAY_CONFIG_ERROR);
        error.statusCode = 500;
        throw error;
    }

    return { tmnCode, hashSecret, vnpUrl, returnUrl, ipnUrl };
}

function logVNPayDiagnostics({ vnpUrl, returnUrl, ipnUrl, params, paymentUrl }) {
    if (process.env.NODE_ENV === 'production') return;

    const safeUrl = new URL(paymentUrl);
    safeUrl.searchParams.delete('vnp_SecureHash');

    console.info('[VNPay:create-url]', {
        tmnCodeExists: true,
        vnpUrl,
        returnUrl,
        ipnUrl,
        paramNames: Object.keys(params).sort(),
        paymentUrlWithoutSecureHash: safeUrl.toString(),
    });
}

// Helper: generate VNPay payment URL using real order ID
function buildVNPayUrl(orderId, amount, ipAddr) {
    const { tmnCode, hashSecret, vnpUrl, returnUrl, ipnUrl } = getVNPaySettings();

    const now = moment().utcOffset('+07:00');
    const createDate = now.format('YYYYMMDDHHmmss');
    const expireDate = now.clone().add(15, 'minutes').format('YYYYMMDDHHmmss');
    // txnRef must be unique per transaction; use last 8 chars of Mongo ObjectId
    const txnRef = String(orderId).slice(-8).toUpperCase();
    const rawIp = String(ipAddr || '127.0.0.1').split(',')[0].trim();

    let vnp_Params = {};
    vnp_Params['vnp_Version']   = '2.1.0';
    vnp_Params['vnp_Command']   = 'pay';
    vnp_Params['vnp_TmnCode']   = tmnCode;
    vnp_Params['vnp_Locale']    = 'vn';
    vnp_Params['vnp_CurrCode']  = 'VND';
    vnp_Params['vnp_TxnRef']    = txnRef;
    vnp_Params['vnp_OrderInfo'] = 'Thanh toan don hang:' + txnRef;
    vnp_Params['vnp_OrderType'] = 'other';
    vnp_Params['vnp_Amount']    = Math.round(Number(amount || 0) * 100);
    vnp_Params['vnp_ReturnUrl'] = returnUrl;
    vnp_Params['vnp_IpAddr']    = rawIp.replace(/^::ffff:/, '') || '127.0.0.1';
    vnp_Params['vnp_CreateDate']= createDate;
    vnp_Params['vnp_ExpireDate']= expireDate;

    // Sort BEFORE hashing (VNPay requirement)
    vnp_Params = sortObject(vnp_Params);

    const signData = qs.stringify(vnp_Params, { encode: false });
    const hmac     = crypto.createHmac('sha512', hashSecret);
    const signed   = hmac.update(Buffer.from(signData, 'utf-8')).digest('hex');

    vnp_Params['vnp_SecureHash'] = signed;
    const paymentUrl = vnpUrl + '?' + qs.stringify(vnp_Params, { encode: false });
    logVNPayDiagnostics({ vnpUrl, returnUrl, ipnUrl, params: vnp_Params, paymentUrl });

    return paymentUrl;
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
        const normalizedAddress = validateAndNormalizeShippingAddress(shippingAddress);
        if (normalizedAddress.error) {
            return res.status(400).json({ message: normalizedAddress.error });
        }

        if (paymentMethod && paymentMethod.toLowerCase() === 'vnpay') {
            getVNPaySettings();
        }

        // 1. Save the order
        const order = new Order({
            orderItems,
            user: req.user._id,
            shippingAddress: normalizedAddress.value,
            paymentMethod,
            itemsPrice,
            shippingPrice,
            totalPrice,
            discountAmount: discountAmount || 0,
            ...(coupon && { coupon }),
        });
        appendStatusHistory(order, {
            status: 'Created',
            note: ORDER_STATUS_NOTES.Created,
            user: req.user,
        });
        appendStatusHistory(order, {
            status: 'Pending',
            note: ORDER_STATUS_NOTES.Pending,
            user: req.user,
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

            return res.status(201).json({ ...withStatusHistory(createdOrder), paymentUrl });
        }

        // 4. COD: return order as-is
        return res.status(201).json(withStatusHistory(createdOrder));

    } catch (error) {
        if (error?.message === VNPAY_CONFIG_ERROR) {
            return res.status(error.statusCode || 500).json({ message: VNPAY_CONFIG_ERROR });
        }

        console.error('Create order error:', error);
        next(error); // delegate to Express global error handler
    }
};

// @desc    Lấy đơn hàng của tôi
// @route   GET /api/orders/myorders
export const getMyOrders = async (req, res, next) => {
    try {
        const orders = await Order.find({ user: req.user._id }).sort({ createdAt: -1 });
        res.json(orders.map(withStatusHistory));
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

        res.json(orders.map(withStatusHistory));
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
        await awardLoyaltyPointsIfEligible(order);
        appendStatusHistory(order, {
            status,
            note: ORDER_STATUS_NOTES[status],
            user: req.user,
        });

        const updatedOrder = await order.save();
        res.json(withStatusHistory(updatedOrder));
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
        appendStatusHistory(order, {
            status: 'CancelRequested',
            note: order.cancelReason
                ? `${ORDER_STATUS_NOTES.CancelRequested}: ${order.cancelReason}`
                : ORDER_STATUS_NOTES.CancelRequested,
            user: req.user,
            updatedAt: order.cancelRequestedAt,
        });

        const updatedOrder = await order.save();
        res.status(200).json({
            message: 'Yêu cầu hủy đơn đã được gửi.',
            order: withStatusHistory(updatedOrder),
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
            appendStatusHistory(order, {
                status: 'Cancelled',
                note: ORDER_STATUS_NOTES.Cancelled,
                user: req.user,
                updatedAt: order.cancelResolvedAt,
            });
        } else if (action === 'reject') {
            order.cancelRequested = false;
            order.cancelStatus = 'rejected';
            order.cancelResolvedAt = new Date();
            order.cancelRejectionReason = String(reason || '').trim();
            appendStatusHistory(order, {
                status: 'CancelRejected',
                note: order.cancelRejectionReason
                    ? `${ORDER_STATUS_NOTES.CancelRejected}: ${order.cancelRejectionReason}`
                    : ORDER_STATUS_NOTES.CancelRejected,
                user: req.user,
                updatedAt: order.cancelResolvedAt,
            });
        } else {
            return res.status(400).json({ message: 'Hành động xử lý yêu cầu hủy không hợp lệ.' });
        }

        const updatedOrder = await order.save();
        res.status(200).json(withStatusHistory(updatedOrder));
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
            return res.json(withStatusHistory(order));
        }
        return res.status(403).json({ message: 'Không có quyền xem đơn hàng này' });
    } catch (error) {
        next(error);
    }
};
