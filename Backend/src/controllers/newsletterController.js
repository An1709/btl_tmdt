import Coupon from '../models/Coupon.js';
import NewsletterSubscription from '../models/NewsletterSubscription.js';
import sendEmail, { EmailDeliveryError } from '../utils/sendEmail.js';

const NEW_MEMBER_COUPON_CODE = 'NEWMEMBER';
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const NEWSLETTER_SEND_ERROR = 'Không thể gửi ưu đãi. Vui lòng thử lại sau.';
const NEWSLETTER_SUCCESS_MESSAGE = 'Ưu đãi dành cho người mới đã được gửi đến email của bạn.';
const NEWSLETTER_DUPLICATE_MESSAGE = 'Email này đã nhận ưu đãi dành cho người mới.';

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
            message: 'Vui lòng nhập email để nhận ưu đãi.',
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
        const existingSubscription = await NewsletterSubscription.findOne({
            email,
            couponCode: NEW_MEMBER_COUPON_CODE,
        });

        if (existingSubscription?.sentAt) {
            return res.status(409).json({
                success: false,
                code: 'ALREADY_SUBSCRIBED',
                message: NEWSLETTER_DUPLICATE_MESSAGE,
            });
        }

        const coupon = await Coupon.findOne({ code: NEW_MEMBER_COUPON_CODE });

        if (!coupon) {
            return res.status(404).json({
                success: false,
                message: NEWSLETTER_SEND_ERROR,
            });
        }

        if (new Date() > coupon.expirationDate) {
            return res.status(400).json({
                success: false,
                message: NEWSLETTER_SEND_ERROR,
            });
        }

        subscription = existingSubscription || await NewsletterSubscription.create({
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
            message: NEWSLETTER_SUCCESS_MESSAGE,
        });
    } catch (error) {
        if (error?.code === 11000) {
            return res.status(409).json({
                success: false,
                code: 'ALREADY_SUBSCRIBED',
                message: NEWSLETTER_DUPLICATE_MESSAGE,
            });
        }

        if (subscription?._id && !subscription.sentAt) {
            await NewsletterSubscription.deleteOne({ _id: subscription._id }).catch(() => {});
        }

        if (error instanceof EmailDeliveryError) {
            return res.status(error.statusCode || 503).json({
                success: false,
                message: NEWSLETTER_SEND_ERROR,
            });
        }

        return res.status(500).json({
            success: false,
            message: NEWSLETTER_SEND_ERROR,
        });
    }
};
