import Coupon from '../models/Coupon.js';

const toDashboardCoupon = (coupon) => ({
    _id: coupon._id,
    code: coupon.code,
    discountType: coupon.discountType,
    value: coupon.value,
    discountValue: coupon.value,
    minOrderValue: coupon.minOrderValue,
    maxDiscount: null,
    usageLimit: coupon.usageLimit,
    usedCount: coupon.usedCount,
    startDate: coupon.createdAt,
    endDate: coupon.expirationDate,
    expirationDate: coupon.expirationDate,
    isActive: new Date() <= coupon.expirationDate && (coupon.usageLimit <= 0 || coupon.usedCount < coupon.usageLimit),
    createdAt: coupon.createdAt,
});

const normalizeCouponPayload = (body = {}) => {
    const code = String(body.code || '').trim().toUpperCase();
    const discountType = String(body.discountType || '').trim();
    const value = Number(body.discountValue ?? body.value);
    const minOrderValue = Number(body.minOrderValue ?? 0);
    const usageLimit = Number(body.usageLimit ?? 0);
    const expirationDate = body.endDate || body.expirationDate;
    const startDate = body.startDate ? new Date(body.startDate) : null;
    const endDate = expirationDate ? new Date(expirationDate) : null;
    const errors = [];

    if (!code) errors.push('Mã giảm giá là bắt buộc.');
    if (!['percent', 'fixed'].includes(discountType)) errors.push('Loại giảm giá không hợp lệ.');
    if (!Number.isFinite(value) || value <= 0) {
        errors.push('Giá trị giảm phải lớn hơn 0.');
    } else if (discountType === 'percent' && value > 100) {
        errors.push('Giá trị giảm theo phần trăm phải nhỏ hơn hoặc bằng 100.');
    }
    if (!Number.isFinite(minOrderValue) || minOrderValue < 0) errors.push('Đơn tối thiểu phải lớn hơn hoặc bằng 0.');
    if (!Number.isFinite(usageLimit) || usageLimit < 0) errors.push('Giới hạn lượt dùng phải lớn hơn hoặc bằng 0.');
    if (!endDate || Number.isNaN(endDate.getTime())) errors.push('Ngày kết thúc không hợp lệ.');
    if (startDate && endDate && endDate < startDate) errors.push('Ngày kết thúc không được trước ngày bắt đầu.');

    return {
        errors,
        data: {
            code,
            discountType,
            value,
            minOrderValue,
            usageLimit,
            expirationDate: endDate,
        },
    };
};

// @desc    Lấy danh sách mã giảm giá cho admin
// @route   GET /api/coupons
export const getCoupons = async (req, res, next) => {
    try {
        const limit = Math.min(Number(req.query.limit) || 10, 50);
        const coupons = await Coupon.find({})
            .select('code discountType value minOrderValue expirationDate usageLimit usedCount createdAt')
            .sort({ createdAt: -1 })
            .limit(limit)
            .lean();

        res.json(coupons.map(toDashboardCoupon));
    } catch (error) {
        next(error);
    }
};

// @desc    Tạo mã giảm giá cho admin
// @route   POST /api/coupons
export const createCoupon = async (req, res, next) => {
    try {
        const { errors, data } = normalizeCouponPayload(req.body);

        if (errors.length) {
            return res.status(400).json({ message: errors[0], errors });
        }

        const exists = await Coupon.exists({ code: data.code });
        if (exists) {
            return res.status(409).json({ message: 'Mã giảm giá đã tồn tại.' });
        }

        const coupon = await Coupon.create(data);
        return res.status(201).json(toDashboardCoupon(coupon.toObject()));
    } catch (error) {
        if (error?.code === 11000) {
            return res.status(409).json({ message: 'Mã giảm giá đã tồn tại.' });
        }

        next(error);
    }
};

// @desc    Cập nhật mã giảm giá cho admin
// @route   PATCH /api/coupons/:id
export const updateCoupon = async (req, res, next) => {
    try {
        const { id } = req.params;

        if (!id?.match(/^[a-f\d]{24}$/i)) {
            return res.status(400).json({ message: 'Mã giảm giá không hợp lệ.' });
        }

        const { errors, data } = normalizeCouponPayload(req.body);

        if (errors.length) {
            return res.status(400).json({ message: errors[0], errors });
        }

        const duplicate = await Coupon.exists({ code: data.code, _id: { $ne: id } });
        if (duplicate) {
            return res.status(409).json({ message: 'Mã giảm giá đã tồn tại.' });
        }

        const coupon = await Coupon.findByIdAndUpdate(id, data, {
            new: true,
            runValidators: true,
        });

        if (!coupon) {
            return res.status(404).json({ message: 'Không tìm thấy mã giảm giá.' });
        }

        return res.json(toDashboardCoupon(coupon.toObject()));
    } catch (error) {
        if (error?.code === 11000) {
            return res.status(409).json({ message: 'Mã giảm giá đã tồn tại.' });
        }

        next(error);
    }
};

// @desc    Kiểm tra mã giảm giá
// @route   POST /api/coupons/check
export const checkCoupon = async (req, res) => {
    const { code, orderTotal } = req.body;

    try {
        const coupon = await Coupon.findOne({ code: code.toUpperCase() });

        if (!coupon) {
            return res.status(404).json({ message: 'Mã giảm giá không tồn tại' });
        }

        // Kiểm tra hạn sử dụng
        if (new Date() > coupon.expirationDate) {
            return res.status(400).json({ message: 'Mã đã hết hạn' });
        }

        // Kiểm tra giá trị đơn hàng tối thiểu
        if (orderTotal < coupon.minOrderValue) {
            return res.status(400).json({ message: `Đơn hàng tối thiểu phải là ${coupon.minOrderValue}đ` });
        }

        // Kiểm tra số lượt dùng
        if (coupon.usageLimit > 0 && coupon.usedCount >= coupon.usageLimit) {
            return res.status(400).json({ message: 'Mã đã hết lượt sử dụng' });
        }

        // Tính tiền giảm
        let discountAmount = 0;
        if (coupon.discountType === 'percent') {
            discountAmount = (orderTotal * coupon.value) / 100;
        } else {
            discountAmount = coupon.value;
        }

        res.json({ 
            valid: true, 
            discountAmount, 
            couponId: coupon._id 
        });

    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
