import moment from 'moment';
import crypto from 'crypto';
import vnpayConfig from '../config/vnpayConfig.js';
import Order from '../models/Order.js';

function sortObject(obj) {
    let sorted = {};
    let str = [];
    let key;
    for (key in obj){
        if (obj.hasOwnProperty(key)) {
            // Keys MUST be encoded before sorting
            str.push(encodeURIComponent(key));
        }
    }
    str.sort();
    for (key = 0; key < str.length; key++) {
        // Values MUST have %20 replaced with + to match PHP urlencode
        sorted[str[key]] = encodeURIComponent(obj[str[key]]).replace(/%20/g, "+");
    }
    return sorted;
}

function buildSignData(sortedObj) {
    return Object.keys(sortedObj)
        .map(key => `${key}=${sortedObj[key]}`)
        .join('&');
}

function buildQueryString(obj) {
    return Object.keys(obj)
        .map(key => `${key}=${obj[key]}`)
        .join('&');
}

// ---------------------------------------------------------------------------
// Shared helper — verify VNPay HMAC-SHA512 signature
// ---------------------------------------------------------------------------
function verifySignature(queryParams, secretKey) {
    const params       = { ...queryParams };
    const receivedHash = params['vnp_SecureHash'];

    if (!receivedHash) {
        return { isValid: false, sortedParams: {} };
    }

    delete params['vnp_SecureHash'];
    delete params['vnp_SecureHashType'];

    const sortedParams = sortObject(params);
    const signData     = buildSignData(sortedParams);
    const computedHash = crypto
        .createHmac('sha512', secretKey.trim())
        .update(Buffer.from(signData, 'utf-8'))
        .digest('hex');

    return { isValid: computedHash.toLowerCase() === receivedHash.toLowerCase(), sortedParams };
}

async function findOrderByTxnRef(txnRef) {
    if (!txnRef) return null;

    return Order.findOne({
        $expr: {
            $eq: [
                { $toUpper: { $substr: [{ $toString: '$_id' }, 16, 8] } },
                String(txnRef).toUpperCase(),
            ],
        },
    });
}

function isAmountMatching(order, queryParams) {
    const vnpAmount = Number(queryParams['vnp_Amount']);
    if (!Number.isFinite(vnpAmount)) return false;

    return Math.round(order.totalPrice * 100) === Math.round(vnpAmount);
}

async function markOrderPaidFromVNPay(order, queryParams) {
    if (order.isPaid) return order;

    order.isPaid = true;
    order.paidAt = new Date();
    order.status = 'Processing';
    order.paymentResult = {
        id: queryParams['vnp_TransactionNo'],
        status: queryParams['vnp_ResponseCode'],
        update_time: queryParams['vnp_PayDate'],
    };

    return order.save();
}

// ---------------------------------------------------------------------------
// @desc    Tạo URL thanh toán VNPay
// @route   POST /api/payment/create_payment_url
// @body    { amount: number, bankCode?: string, orderId?: string }
// ---------------------------------------------------------------------------
export const createPaymentUrl = (req, res) => {
    // ── 1. Read & trim all env values (whitespace in .env silently breaks HMAC) ──
    const tmnCode   = (vnpayConfig.vnp_TmnCode   || '').trim();
    const secretKey = (vnpayConfig.vnp_HashSecret || '').trim();
    const vnpUrl    = (vnpayConfig.vnp_Url        || '').trim();
    const returnUrl = (vnpayConfig.vnp_ReturnUrl  || '').trim();

    if (!tmnCode || !secretKey) {
        return res.status(500).json({ message: 'VNPay credentials are not configured.' });
    }

    // ── 2. Vietnam time via explicit UTC+7 offset (NOT process.env.TZ — unreliable) ──
    const now        = moment().utcOffset('+07:00');
    const createDate = now.format('YYYYMMDDHHmmss');   // e.g. 20260424214500

    // ── 3. TxnRef: unique per transaction ──
    const txnRef = req.body.orderId
        ? String(req.body.orderId).slice(-8).toUpperCase()
        : now.format('HHmmss') + Math.floor(Math.random() * 1000).toString().padStart(3, '0');

    // ── 4. Amount: integer * 100, no floats ──
    const rawAmount = parseFloat(req.body.amount) || 0;
    const amount    = Math.round(rawAmount * 100);  // Math.round avoids 0.1+0.2 drift

    if (amount <= 0) {
        return res.status(400).json({ message: 'Invalid amount.' });
    }

    // ── 5. IP address: strip IPv6 prefix, take first IP from x-forwarded-for ──
    const rawIp  = (req.headers['x-forwarded-for'] || '').split(',')[0].trim()
        || req.socket?.remoteAddress
        || '127.0.0.1';
    const ipAddr = rawIp.replace(/^::ffff:/, '');  // strip "::ffff:192.168.x.x" → "192.168.x.x"

    // ── 6. Build params — only defined, non-empty values ──
    const vnp_Params = {
        vnp_Version:    '2.1.0',
        vnp_Command:    'pay',
        vnp_TmnCode:    tmnCode,
        vnp_Locale:     'vn',
        vnp_CurrCode:   'VND',
        vnp_TxnRef:     txnRef,
        vnp_OrderInfo:  'Thanh toan don hang ' + txnRef,
        vnp_OrderType:  'other',
        vnp_Amount:     amount,           // plain integer — no * 100 again
        vnp_ReturnUrl:  returnUrl,
        vnp_IpAddr:     ipAddr,
        vnp_CreateDate: createDate,
    };

    if (req.body.bankCode?.trim()) {
        vnp_Params['vnp_BankCode'] = req.body.bankCode.trim();
    }

    // ── 7. Sort alphabetically on RAW key names, filter empty values ──
    const sorted = sortObject(vnp_Params);

    // ── 8. Build the sign data string ──
    const signData = buildSignData(sorted);

    // ── 9. HMAC-SHA512 with TRIMMED secret key ──
    const signed = crypto
        .createHmac('sha512', secretKey)
        .update(Buffer.from(signData, 'utf-8'))
        .digest('hex');

    // ── 10. Append hash and build final URL ──
    sorted['vnp_SecureHash'] = signed;
    const paymentUrl = vnpUrl + '?' + buildQueryString(sorted);

    // Debug log — remove before production
    console.log('[VNPay] TmnCode  :', tmnCode);
    console.log('[VNPay] signData :', signData);
    console.log('[VNPay] signed   :', signed);

    return res.status(200).json({ paymentUrl });
};

// ---------------------------------------------------------------------------
// @desc    Nhận kết quả trả về từ VNPay (người dùng được redirect về đây)
// @route   GET /api/payment/vnpay_return
// Flow: VNPay → GET this endpoint → verify → res.redirect to React /payment/result
// ---------------------------------------------------------------------------
export const vnpayReturn = async (req, res) => {
    const frontendUrl  = (process.env.CLIENT_URL || 'http://localhost:5173').trim();
    const txnRef       = req.query['vnp_TxnRef'] || '';
    const responseCode = req.query['vnp_ResponseCode'];
    const secretKey    = (vnpayConfig.vnp_HashSecret || '').trim();

    const { isValid } = verifySignature(req.query, secretKey);

    if (!isValid) {
        return res.redirect(
            `${frontendUrl}/payment/result?status=failed&orderId=${txnRef}&code=checksum_error`
        );
    }

    if (responseCode === '00') {
        try {
            const order = await findOrderByTxnRef(txnRef);

            if (!order) {
                return res.redirect(
                    `${frontendUrl}/payment/result?status=failed&orderId=${txnRef}&code=order_not_found`
                );
            }

            if (!isAmountMatching(order, req.query)) {
                return res.redirect(
                    `${frontendUrl}/payment/result?status=failed&orderId=${order._id}&code=invalid_amount`
                );
            }

            await markOrderPaidFromVNPay(order, req.query);

            return res.redirect(
                `${frontendUrl}/payment/result?status=success&orderId=${order._id}`
            );
        } catch (err) {
            console.error('[VNPay return error]', err);
            return res.redirect(
                `${frontendUrl}/payment/result?status=failed&orderId=${txnRef}&code=server_error`
            );
        }
    }

    return res.redirect(
        `${frontendUrl}/payment/result?status=failed&orderId=${txnRef}&code=${responseCode || 'unknown'}`
    );
};

// ---------------------------------------------------------------------------
// @desc    VNPay IPN — server-to-server webhook để cập nhật trạng thái đơn hàng
// @route   GET /api/payment/vnpay_ipn
// VNPay calls this in the background. Must reply within 3s with exact JSON.
// ---------------------------------------------------------------------------
export const vnpayIpn = async (req, res) => {
    const secretKey = (vnpayConfig.vnp_HashSecret || '').trim();
    const { isValid } = verifySignature(req.query, secretKey);

    if (!isValid) {
        return res.status(200).json({ RspCode: '97', Message: 'Fail checksum' });
    }

    const responseCode = req.query['vnp_ResponseCode'];
    const txnRef       = req.query['vnp_TxnRef'];

    try {
        // txnRef = orderId.slice(-8).toUpperCase() — match via $expr on _id suffix
        const order = await findOrderByTxnRef(txnRef);

        if (!order) {
            return res.status(200).json({ RspCode: '01', Message: 'Order not found' });
        }

        // Guard: duplicate IPN
        if (order.isPaid) {
            return res.status(200).json({ RspCode: '02', Message: 'Order already confirmed' });
        }

        // Guard: amount integrity
        if (!isAmountMatching(order, req.query)) {
            return res.status(200).json({ RspCode: '04', Message: 'Invalid amount' });
        }

        if (responseCode === '00') {
            await markOrderPaidFromVNPay(order, req.query);
            return res.status(200).json({ RspCode: '00', Message: 'Confirm Success' });
        }

        // Payment failed / user cancelled
        order.status = 'Cancelled';
        await order.save();
        return res.status(200).json({ RspCode: '00', Message: 'Confirm Success' });

    } catch (err) {
        console.error('[VNPay IPN error]', err);
        return res.status(200).json({ RspCode: '99', Message: 'Unknown error' });
    }
};
