import Coupon from '../models/Coupon.js';
import NewsletterSubscription from '../models/NewsletterSubscription.js';
import sendEmail, { EmailDeliveryError } from '../utils/sendEmail.js';

const NEW_MEMBER_COUPON_CODE = 'NEWMEMBER';
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const normalizeEmail = (email) => String(email || '').trim().toLowerCase();

const buildCouponEmail = () => `
    <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #222;">
        <p>Xin chào,</p>
        <p>Cảm ơn bạn đã quan tâm đến PetMart.</p>
        <p>Mã giảm giá dành cho bạn là:</p>
        <p style="font-size: 24px; font-weight: 700; letter-spacing: 1px; color: #f9735b;">${NEW_MEMBER_COUPON_CODE}</p>
        <p>Bạn có thể sử dụng mã này khi thanh toán đơn hàng đầu tiên tại PetMart.</p>
        <p>Trân trọng,<br/>PetMart</p>
    </div>
`;

export const subscribeNewsletter = async (req, res) => {
    const email = normalizeEmail(req.body?.email);

    if (!email) {
        return res.status(400).json({
            success: false,
            message: 'Vui lòng nhập email để nhận mã ưu đãi.',
        });
    }

    if (!EMAIL_PATTERN.test(email)) {
        return res.status(400).json({
            success: false,
            message: 'Email không hợp lệ.',
        });
    }

    let subscription;

    try {
        const coupon = await Coupon.findOne({ code: NEW_MEMBER_COUPON_CODE });

        if (!coupon) {
            return res.status(404).json({
                success: false,
                message: 'Mã giảm giá NEWMEMBER chưa được cấu hình.',
            });
        }

        if (new Date() > coupon.expirationDate) {
            return res.status(400).json({
                success: false,
                message: 'Mã giảm giá NEWMEMBER đã hết hạn.',
            });
        }

        subscription = await NewsletterSubscription.create({
            email,
            couponCode: NEW_MEMBER_COUPON_CODE,
        });

        await sendEmail({
            email,
            subject: 'Mã giảm giá NEWMEMBER dành cho bạn',
            message: buildCouponEmail(),
        });

        subscription.sentAt = new Date();
        await subscription.save();

        return res.status(200).json({
            success: true,
            message: 'Mã giảm giá NEWMEMBER đã được gửi đến email của bạn.',
        });
    } catch (error) {
        if (error?.code === 11000) {
            return res.status(409).json({
                success: false,
                code: 'NEWSLETTER_COUPON_ALREADY_SENT',
                message: 'Email này đã nhận mã ưu đãi NEWMEMBER.',
            });
        }

        if (subscription?._id && !subscription.sentAt) {
            await NewsletterSubscription.deleteOne({ _id: subscription._id }).catch(() => {});
        }

        if (error instanceof EmailDeliveryError) {
            return res.status(error.statusCode || 503).json({
                success: false,
                message: error.message,
            });
        }

        return res.status(500).json({
            success: false,
            message: 'Không thể gửi mã ưu đãi lúc này. Vui lòng thử lại sau.',
        });
    }
};
