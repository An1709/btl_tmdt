import bcrypt from 'bcrypt';
import User from '../models/User.js';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import Session from '../models/Session.js';
import VerificationCode from '../models/VerificationCode.js';
import PendingRegistration from '../models/PendingRegistration.js';
import sendEmail, { EmailDeliveryError } from '../utils/sendEmail.js';
import { getAccessTokenSecret } from '../config/auth.js';

const ACCESS_TOKEN_TTL = '30m'; // 30 phút
const REFRESH_TOKEN_TTL = 14 * 24 * 60 * 60 * 1000;
const VERIFICATION_CODE_TTL = 90 * 1000;
const REGISTRATION_OTP_TTL = 90 * 1000;
const REGISTRATION_RESEND_COOLDOWN = 30 * 1000;
const RESEND_COOLDOWN = 30 * 1000;
const MAX_VERIFICATION_ATTEMPTS = 5;
const EMAIL_VERIFICATION_PURPOSE = 'email_verification';
const PASSWORD_RESET_PURPOSE = 'password_reset';
const PASSWORD_RESET_SUCCESS_MESSAGE = 'Nếu thông tin tài khoản hợp lệ, mã xác nhận sẽ được gửi đến email của bạn.';
const isProduction = process.env.NODE_ENV === 'production';
const refreshCookieOptions = {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? 'none' : 'lax',
};

const normalizeEmail = (email) => email?.trim().toLowerCase();
const normalizeUsername = (username) => username?.trim().toLowerCase();

const generateVerificationCode = () => crypto.randomInt(100000, 1000000).toString();

const getLatestActiveVerificationCode = (userId, purpose) => VerificationCode.findOne({
    userId,
    purpose,
    consumedAt: null,
}).sort({ createdAt: -1 });

const isResendCoolingDown = (verificationCode) =>
    verificationCode && Date.now() - verificationCode.createdAt.getTime() < RESEND_COOLDOWN;

const handleAuthError = (res, error, context) => {
    if (error instanceof EmailDeliveryError) {
        console.error(`${context}: ${error.code}`);
        return res.status(error.statusCode).json({
            message: error.message,
            code: error.code,
        });
    }

    console.error(context, error);
    return res.status(500).json({ message: 'Lỗi server. Vui lòng thử lại sau.' });
};

const createVerificationCode = async (user, purpose) => {
    const code = generateVerificationCode();
    const codeHash = await bcrypt.hash(code, 10);
    const now = new Date();

    await VerificationCode.updateMany(
        {
            userId: user._id,
            purpose,
            consumedAt: null,
        },
        { consumedAt: now },
    );

    const verificationCode = await VerificationCode.create({
        userId: user._id,
        email: user.email,
        purpose,
        codeHash,
        expiresAt: new Date(now.getTime() + VERIFICATION_CODE_TTL),
    });

    return { code, verificationCode };
};

const sendVerificationEmail = async (user, code) => {
    await sendEmail({
        email: user.email,
        subject: 'Mã xác minh tài khoản PetShop',
        message: `
            <div style="font-family: Arial, sans-serif; line-height: 1.6;">
                <h2>Xác minh tài khoản PetShop</h2>
                <p>Xin chào ${user.displayName},</p>
                <p>Mã xác minh của bạn là:</p>
                <p style="font-size: 28px; font-weight: 700; letter-spacing: 6px;">${code}</p>
                <p>Mã này sẽ hết hạn sau 1 phút 30 giây. Nếu bạn không tạo tài khoản, vui lòng bỏ qua email này.</p>
            </div>
        `,
    });
};

const sendRegistrationOtpEmail = async (pendingRegistration, code) => {
    await sendEmail({
        email: pendingRegistration.email,
        subject: 'Mã OTP đăng ký tài khoản PetShop',
        message: `
            <div style="font-family: Arial, sans-serif; line-height: 1.6;">
                <h2>Xác thực email đăng ký tài khoản PetShop</h2>
                <p>Xin chào ${pendingRegistration.displayName},</p>
                <p>Mã OTP của bạn là:</p>
                <p style="font-size: 28px; font-weight: 700; letter-spacing: 6px;">${code}</p>
                <p>Mã này sẽ hết hạn sau 1 phút 30 giây. Nếu bạn không tạo tài khoản, vui lòng bỏ qua email này.</p>
            </div>
        `,
    });
};

const issueRegistrationOtp = async (pendingRegistration) => {
    const code = generateVerificationCode();
    pendingRegistration.codeHash = await bcrypt.hash(code, 10);
    pendingRegistration.expiresAt = new Date(Date.now() + REGISTRATION_OTP_TTL);
    pendingRegistration.attempts = 0;
    await pendingRegistration.save();

    try {
        await sendRegistrationOtpEmail(pendingRegistration, code);
    } catch (error) {
        await PendingRegistration.deleteOne({ _id: pendingRegistration._id });
        throw error;
    }
};

const issueVerificationCode = async (user) => {
    const { code, verificationCode } = await createVerificationCode(user, EMAIL_VERIFICATION_PURPOSE);
    try {
        await sendVerificationEmail(user, code);
    } catch (error) {
        verificationCode.consumedAt = new Date();
        await verificationCode.save();
        throw error;
    }
};

const sendPasswordResetEmail = async (user, code) => {
    await sendEmail({
        email: user.email,
        subject: 'Mã đặt lại mật khẩu PetShop',
        message: `
            <div style="font-family: Arial, sans-serif; line-height: 1.6;">
                <h2>Đặt lại mật khẩu PetShop</h2>
                <p>Xin chào ${user.displayName},</p>
                <p>Mã đặt lại mật khẩu của bạn là:</p>
                <p style="font-size: 28px; font-weight: 700; letter-spacing: 6px;">${code}</p>
                <p>Mã này sẽ hết hạn sau 1 phút 30 giây. Nếu bạn không yêu cầu đặt lại mật khẩu, vui lòng bỏ qua email này.</p>
            </div>
        `,
    });
};

const issuePasswordResetCode = async (user) => {
    const { code, verificationCode } = await createVerificationCode(user, PASSWORD_RESET_PURPOSE);
    try {
        await sendPasswordResetEmail(user, code);
    } catch (error) {
        verificationCode.consumedAt = new Date();
        await verificationCode.save();
        throw error;
    }
};

export const signUp = async (req, res) => {
    try {
        const username = normalizeUsername(req.body.username);
        const email = normalizeEmail(req.body.email);
        const { password, firstName, lastName } = req.body; 

        if (!username || !email || !password || !firstName || !lastName) {
            return res
                .status(400)
                .json({ message: 'Vui lòng nhập đầy đủ thông tin.' });
        }

        if (password.length < 6) {
            return res
                .status(400)
                .json({ message: 'Mật khẩu phải có ít nhất 6 ký tự.' });
        }

        const duplicateUser = await User.findOne({ $or: [ { username }, { email } ] });
        if (duplicateUser) {
            return res
                .status(409)
                .json({ message: 'Email hoặc tên đăng nhập đã tồn tại.' });
        }

        //Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        await PendingRegistration.deleteMany({ $or: [ { username }, { email } ] });

        const pendingRegistration = await PendingRegistration.create({
            username,
            email,
            hashedPassword,
            displayName: `${firstName} ${lastName}`,
            codeHash: await bcrypt.hash(generateVerificationCode(), 10),
            expiresAt: new Date(Date.now() + REGISTRATION_OTP_TTL),
        });

        await issueRegistrationOtp(pendingRegistration);

        return res.status(201).json({
            message: 'Mã OTP đã được gửi đến email của bạn.',
            email: pendingRegistration.email,
            requiresVerification: true,
            expiresIn: 90,
        });
    } catch (error) {
        return handleAuthError(res, error, 'Error during sign up');
    }
};

export const signIn = async (req, res) => {
    try {
        //lấy input
        const username = normalizeUsername(req.body.username);
        const { password } = req.body;
        if (!username || !password) {
            return res
                .status(400)
                .json({ message: 'Vui lòng nhập tên đăng nhập và mật khẩu.' });
        }

        //lấy hash password từ db để so sánh
        const user = await User.findOne({ username });
        if (!user) { //nếu không tìm thấy user
            return res
                .status(401)
                .json({ message: 'Tên đăng nhập hoặc mật khẩu không đúng.' });
        }

        if (user.isBlocked) {
            return res
                .status(403)
                .json({ message: 'Tài khoản đã bị khóa.' });
        }

        //so sánh password
        const passwordCorrect = await bcrypt.compare(password, user.hashedPassword);
        if (!passwordCorrect) {
            return res
                .status(401)
                .json({ message: 'Tên đăng nhập hoặc mật khẩu không đúng.' });
        }

        if (user.isEmailVerified === false) {
            return res
                .status(403)
                .json({
                    message: 'Vui lòng xác minh email trước khi đăng nhập.',
                    code: 'EMAIL_NOT_VERIFIED',
                    email: user.email,
                });
        }

        //nếu khớp, tạo access token 
        const accessToken = jwt.sign(
            {userId: user._id},
            getAccessTokenSecret(),
            { expiresIn: ACCESS_TOKEN_TTL },
        );

        //tạo refresh token
        const refreshToken = crypto.randomBytes(64).toString('hex');

        //tạo session lưu refresh token vào db 
        await Session.create({
            userId: user._id,
            refreshToken,
            expiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL), //14 ngày
        });
        
        // trả về refresh token về trong cookie
        res.cookie('refreshToken', refreshToken, {
            ...refreshCookieOptions,
            maxAge: REFRESH_TOKEN_TTL, 
        });

        // trả về access token về cho response
        return res.status(200)
            .json({ 
                message: `User ${user.displayName} đã login vào trang`,
                accessToken,
            });
    } catch (error) {
        return handleAuthError(res, error, 'Error during sign in');
    }
};

export const verifyEmail = async (req, res) => {
    try {
        const email = normalizeEmail(req.body.email);
        const code = req.body.code?.trim();

        if (!email || !code) {
            return res.status(400).json({ message: 'Vui lòng nhập email và mã xác minh.' });
        }

        if (!/^\d{6}$/.test(code)) {
            return res.status(400).json({ message: 'Mã OTP không hợp lệ.' });
        }

        const existingUser = await User.findOne({ email });
        if (existingUser) {
            if (existingUser.isEmailVerified !== false) {
                return res.status(409).json({ message: 'Email hoặc tên đăng nhập đã tồn tại.' });
            }

            const verificationCode = await VerificationCode.findOne({
                userId: existingUser._id,
                email,
                purpose: EMAIL_VERIFICATION_PURPOSE,
                consumedAt: null,
            }).sort({ createdAt: -1 });

            if (!verificationCode || verificationCode.expiresAt < new Date()) {
                return res.status(400).json({ message: 'Mã OTP đã hết hạn. Vui lòng yêu cầu gửi lại mã.' });
            }

            if (verificationCode.attempts >= MAX_VERIFICATION_ATTEMPTS) {
                return res.status(429).json({ message: 'Bạn đã nhập sai quá nhiều lần. Vui lòng yêu cầu mã mới.' });
            }

            const legacyCodeMatches = await bcrypt.compare(code, verificationCode.codeHash);
            if (!legacyCodeMatches) {
                verificationCode.attempts += 1;
                await verificationCode.save();
                return res.status(400).json({ message: 'Mã OTP không hợp lệ.' });
            }

            existingUser.isEmailVerified = true;
            verificationCode.consumedAt = new Date();
            await Promise.all([
                existingUser.save(),
                verificationCode.save(),
                VerificationCode.updateMany(
                    {
                        userId: existingUser._id,
                        purpose: EMAIL_VERIFICATION_PURPOSE,
                        consumedAt: null,
                        _id: { $ne: verificationCode._id },
                    },
                    { consumedAt: new Date() },
                ),
            ]);

            return res.status(200).json({ message: 'Xác minh email thành công.' });
        }

        const pendingRegistration = await PendingRegistration.findOne({ email }).sort({ createdAt: -1 });
        if (!pendingRegistration) {
            return res.status(400).json({ message: 'Mã OTP đã hết hạn. Vui lòng yêu cầu gửi lại mã.' });
        }

        if (pendingRegistration.expiresAt < new Date()) {
            await PendingRegistration.deleteOne({ _id: pendingRegistration._id });
            return res.status(400).json({ message: 'Mã OTP đã hết hạn. Vui lòng yêu cầu gửi lại mã.' });
        }

        if (pendingRegistration.attempts >= MAX_VERIFICATION_ATTEMPTS) {
            return res.status(429).json({ message: 'Bạn đã nhập sai quá nhiều lần. Vui lòng yêu cầu mã mới.' });
        }

        const codeMatches = await bcrypt.compare(code, pendingRegistration.codeHash);
        if (!codeMatches) {
            pendingRegistration.attempts += 1;
            await pendingRegistration.save();
            return res.status(400).json({ message: 'Mã OTP không hợp lệ.' });
        }

        try {
            await User.create({
                username: pendingRegistration.username,
                email: pendingRegistration.email,
                hashedPassword: pendingRegistration.hashedPassword,
                displayName: pendingRegistration.displayName,
                isEmailVerified: true,
            });
        } catch (error) {
            if (error?.code === 11000) {
                await PendingRegistration.deleteOne({ _id: pendingRegistration._id });
                return res.status(409).json({ message: 'Email hoặc tên đăng nhập đã tồn tại.' });
            }
            throw error;
        }

        await PendingRegistration.deleteOne({ _id: pendingRegistration._id });

        return res.status(200).json({ message: 'Xác thực email thành công. Tài khoản của bạn đã được tạo.' });
    } catch (error) {
        return handleAuthError(res, error, 'Error during email verification');
    }
};

export const resendVerificationCode = async (req, res) => {
    try {
        const email = normalizeEmail(req.body.email);
        if (!email) {
            return res.status(400).json({ message: 'Vui lòng nhập email.' });
        }

        const pendingRegistration = await PendingRegistration.findOne({ email }).sort({ createdAt: -1 });
        if (pendingRegistration) {
            const duplicateUser = await User.findOne({
                $or: [
                    { email: pendingRegistration.email },
                    { username: pendingRegistration.username },
                ],
            });
            if (duplicateUser) {
                await PendingRegistration.deleteOne({ _id: pendingRegistration._id });
                return res.status(409).json({ message: 'Email hoặc tên đăng nhập đã tồn tại.' });
            }

            if (Date.now() - pendingRegistration.updatedAt.getTime() < REGISTRATION_RESEND_COOLDOWN) {
                return res.status(429).json({ message: 'Vui lòng chờ trước khi yêu cầu mã mới.' });
            }

            await issueRegistrationOtp(pendingRegistration);

            return res.status(200).json({
                message: 'Mã OTP mới đã được gửi.',
                expiresIn: 90,
            });
        }

        const user = await User.findOne({ email });
        if (!user) {
            return res.status(400).json({ message: 'Mã OTP đã hết hạn. Vui lòng yêu cầu gửi lại mã.' });
        }

        if (user.isEmailVerified !== false) {
            return res.status(400).json({ message: 'Email đã được xác minh.' });
        }

        const latestCode = await getLatestActiveVerificationCode(user._id, EMAIL_VERIFICATION_PURPOSE);

        if (isResendCoolingDown(latestCode)) {
            return res.status(429).json({ message: 'Vui lòng chờ trước khi yêu cầu mã mới.' });
        }

        await issueVerificationCode(user);

        return res.status(200).json({ message: 'Mã xác minh đã được gửi.' });
    } catch (error) {
        return handleAuthError(res, error, 'Error during verification code resend');
    }
};

export const forgotPassword = async (req, res) => {
    try {
        const username = normalizeUsername(req.body.username);
        const email = normalizeEmail(req.body.email);
        if (!username || !email) {
            return res.status(400).json({ message: 'Vui lòng nhập tên đăng nhập và email.' });
        }

        const user = await User.findOne({ username, email });
        if (!user || user.isBlocked) {
            return res
                .status(400)
                .json({ success: false, message: 'Tên đăng nhập hoặc email không đúng.' });
        }

        const latestCode = await getLatestActiveVerificationCode(user._id, PASSWORD_RESET_PURPOSE);
        if (isResendCoolingDown(latestCode)) {
            return res
                .status(429)
                .json({ success: false, message: 'Vui lòng chờ trước khi yêu cầu mã mới.' });
        }

        await issuePasswordResetCode(user);

        return res.status(200).json({
            success: true,
            message: 'Mã OTP đã được gửi đến email của bạn.',
            expiresIn: 90,
        });
    } catch (error) {
        return handleAuthError(res, error, 'Error during forgot password request');
    }
};

export const resetPassword = async (req, res) => {
    try {
        const username = normalizeUsername(req.body.username);
        const email = normalizeEmail(req.body.email);
        const code = req.body.code?.trim();
        const { newPassword, confirmNewPassword } = req.body;

        if (!username || !email || !code || !newPassword || !confirmNewPassword) {
            return res.status(400).json({ message: 'Vui lòng nhập tên đăng nhập, email, mã OTP, mật khẩu mới và xác nhận mật khẩu.' });
        }

        if (!/^\d{6}$/.test(code)) {
            return res.status(400).json({ message: 'Mã OTP không đúng hoặc đã hết hạn.' });
        }

        if (newPassword.length < 6) {
            return res.status(400).json({ message: 'Mật khẩu mới phải có ít nhất 6 ký tự.' });
        }

        if (newPassword !== confirmNewPassword) {
            return res.status(400).json({ message: 'Mật khẩu mới và xác nhận mật khẩu không khớp.' });
        }

        const user = await User.findOne({ username, email });
        if (!user || user.isBlocked) {
            return res.status(400).json({ message: 'Mã OTP không đúng hoặc đã hết hạn.' });
        }

        const resetCode = await VerificationCode.findOne({
            userId: user._id,
            email,
            purpose: PASSWORD_RESET_PURPOSE,
            consumedAt: null,
        }).sort({ createdAt: -1 });

        if (!resetCode) {
            return res.status(400).json({ message: 'Mã OTP không đúng hoặc đã hết hạn.' });
        }

        if (resetCode.expiresAt < new Date()) {
            return res.status(400).json({ message: 'Mã OTP không đúng hoặc đã hết hạn.' });
        }

        if (resetCode.attempts >= MAX_VERIFICATION_ATTEMPTS) {
            return res.status(429).json({ message: 'Bạn đã nhập sai quá nhiều lần. Vui lòng yêu cầu mã mới.' });
        }

        const codeMatches = await bcrypt.compare(code, resetCode.codeHash);
        if (!codeMatches) {
            resetCode.attempts += 1;
            await resetCode.save();
            return res.status(400).json({ message: 'Mã OTP không đúng hoặc đã hết hạn.' });
        }

        user.hashedPassword = await bcrypt.hash(newPassword, 10);
        const now = new Date();
        resetCode.consumedAt = now;

        await Promise.all([
            user.save(),
            resetCode.save(),
            VerificationCode.updateMany(
                {
                    userId: user._id,
                    purpose: PASSWORD_RESET_PURPOSE,
                    consumedAt: null,
                    _id: { $ne: resetCode._id },
                },
                { consumedAt: now },
            ),
            Session.deleteMany({ userId: user._id }),
        ]);

        return res.status(200).json({ message: 'Đặt lại mật khẩu thành công.' });
    } catch (error) {
        return handleAuthError(res, error, 'Error during password reset');
    }
};

export const signOut = async (req, res) => {
    try {
        //lấy refresh token từ cookie
        const refreshToken = req.cookies?.refreshToken;
        if (refreshToken) {   

            //xóa session trong db
            await Session.deleteOne({ refreshToken: refreshToken });
         
            //xóa refresh token trong cookie
            res.clearCookie('refreshToken', refreshCookieOptions);
        }
        return res.sendStatus(204); // logout thành công dù có hay không
    } catch (error) {
        return handleAuthError(res, error, 'Error during sign out');
    }   
}; 

export const refreshToken = async (req, res) => {
    try {
        //lấy refresh token từ cookie
        const refreshToken = req.cookies?.refreshToken;
        if (!refreshToken) {
            return res.status(401).json({ message: 'No refresh token provided' });
        }
        // so sánh token với db
        const session = await Session.findOne({ refreshToken: refreshToken });
        if (!session) {
            return res.status(403).json({ message: 'Invalid refresh token' });
        }
        //kiểm tra token có hết hạn không
        if (session.expiresAt < new Date()) {
            await Session.deleteOne({ refreshToken: refreshToken });
            res.clearCookie('refreshToken');
            return res.status(403).json({ message: 'Refresh token expired' });
        }

        const user = await User.findById(session.userId).select('_id isBlocked isEmailVerified');
        if (!user || user.isBlocked || user.isEmailVerified === false) {
            await Session.deleteOne({ refreshToken: refreshToken });
            res.clearCookie('refreshToken');
            return res.status(403).json({ message: 'Tài khoản không hợp lệ hoặc đã bị khóa.' });
        }

        //tạo access token mới
        const accessToken = jwt.sign(
            { userId: session.userId },
            getAccessTokenSecret(),
            { expiresIn: ACCESS_TOKEN_TTL },
        );
        return res.status(200).json({ accessToken });
    } catch (error) {
        return handleAuthError(res, error, 'Error during token refresh');
    }
};

