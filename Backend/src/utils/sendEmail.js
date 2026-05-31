import nodemailer from 'nodemailer';

export class EmailDeliveryError extends Error {
    constructor(code, message, statusCode = 503, cause = null) {
        super(message);
        this.name = 'EmailDeliveryError';
        this.code = code;
        this.statusCode = statusCode;
        this.cause = cause;
    }
}

let emailConfigPresenceLogged = false;

const logEmailConfigPresenceOnce = () => {
    if (emailConfigPresenceLogged) return;

    emailConfigPresenceLogged = true;
    console.info('[Email:config]', {
        has_EMAIL_SERVICE: Boolean(process.env.EMAIL_SERVICE),
        has_EMAIL_USERNAME: Boolean(process.env.EMAIL_USERNAME),
        has_EMAIL_PASSWORD: Boolean(process.env.EMAIL_PASSWORD),
        has_FROM_EMAIL: Boolean(process.env.FROM_EMAIL),
        has_FROM_NAME: Boolean(process.env.FROM_NAME),
    });
};

const getRequiredEmailConfig = () => {
    logEmailConfigPresenceOnce();

    const service = process.env.EMAIL_SERVICE || 'gmail';
    const username = process.env.EMAIL_USERNAME;
    const password = process.env.EMAIL_PASSWORD;
    const fromEmail = process.env.FROM_EMAIL || username;
    const fromName = process.env.FROM_NAME || 'PetShop Support';

    if (!username || !password || !fromEmail) {
        throw new EmailDeliveryError(
            'EMAIL_CONFIG_MISSING',
            'Cấu hình email chưa đầy đủ. Vui lòng kiểm tra EMAIL_USERNAME, EMAIL_PASSWORD và FROM_EMAIL.',
        );
    }

    return { service, username, password, fromEmail, fromName };
};

const createTransporter = () => {
    const { service, username, password } = getRequiredEmailConfig();

    return nodemailer.createTransport({
        service,
        auth: {
            user: username,
            pass: password,
        },
    });
};

const getSafeOriginalEmailError = (error) => ({
    name: error?.name,
    code: error?.code,
    command: error?.command,
    responseCode: error?.responseCode,
    response: error?.response,
    message: error?.message,
});

const logOriginalEmailError = (error) => {
    if (error instanceof EmailDeliveryError) {
        console.error('[Email] Delivery failed:', {
            code: error.code,
            message: error.message,
        });
        return;
    }

    console.error('[Email] Original Nodemailer error:', getSafeOriginalEmailError(error));
};

const getSafeEmailError = (error) => {
    if (error instanceof EmailDeliveryError) return error;

    if (error?.code === 'EAUTH' || error?.responseCode === 535 || error?.responseCode === 534) {
        return new EmailDeliveryError(
            'EMAIL_AUTH_FAILED',
            'Không thể xác thực tài khoản email. Vui lòng kiểm tra Gmail App Password.',
            503,
            error,
        );
    }

    if (
        error?.code === 'ECONNECTION'
        || error?.code === 'ECONNREFUSED'
        || error?.code === 'ETIMEDOUT'
        || error?.code === 'ESOCKET'
        || error?.command === 'CONN'
    ) {
        return new EmailDeliveryError(
            'EMAIL_CONNECTION_FAILED',
            'Không thể kết nối dịch vụ email. Vui lòng thử lại sau.',
            503,
            error,
        );
    }

    return new EmailDeliveryError(
        'EMAIL_SEND_FAILED',
        'Không thể gửi email lúc này. Vui lòng thử lại sau.',
        503,
        error,
    );
};

const sendEmail = async (options) => {
    try {
        const { fromEmail, fromName } = getRequiredEmailConfig();
        const transporter = createTransporter();

        await transporter.sendMail({
            from: `${fromName} <${fromEmail}>`,
            to: options.email,
            subject: options.subject,
            html: options.message,
        });
    } catch (error) {
        logOriginalEmailError(error);
        throw getSafeEmailError(error);
    }
};

export default sendEmail;
