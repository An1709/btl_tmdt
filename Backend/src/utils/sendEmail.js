import nodemailer from 'nodemailer';

export class EmailDeliveryError extends Error {
    constructor(code, message, statusCode = 503) {
        super(message);
        this.name = 'EmailDeliveryError';
        this.code = code;
        this.statusCode = statusCode;
    }
}

const getRequiredEmailConfig = () => {
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

const getSafeEmailError = (error) => {
    if (error instanceof EmailDeliveryError) return error;

    if (error?.code === 'EAUTH' || error?.responseCode === 535) {
        return new EmailDeliveryError(
            'EMAIL_AUTH_FAILED',
            'Không thể xác thực tài khoản email. Vui lòng kiểm tra Gmail App Password.',
        );
    }

    return new EmailDeliveryError(
        'EMAIL_SEND_FAILED',
        'Không thể gửi email lúc này. Vui lòng thử lại sau.',
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
        throw getSafeEmailError(error);
    }
};

export default sendEmail;
