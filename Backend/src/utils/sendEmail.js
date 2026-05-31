import nodemailer from 'nodemailer';

const EMAIL_TIMEOUT_MS = 60000;

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

const getTransportMode = () => (process.env.SMTP_HOST ? 'smtp' : 'service');

const logEmailConfigPresenceOnce = () => {
    if (emailConfigPresenceLogged) return;

    emailConfigPresenceLogged = true;
    console.info('[Email:config]', {
        transportMode: getTransportMode(),
        has_EMAIL_USERNAME: Boolean(process.env.EMAIL_USERNAME),
        has_EMAIL_PASSWORD: Boolean(process.env.EMAIL_PASSWORD),
        has_FROM_EMAIL: Boolean(process.env.FROM_EMAIL),
        has_FROM_NAME: Boolean(process.env.FROM_NAME),
        SMTP_HOST: process.env.SMTP_HOST || undefined,
        SMTP_PORT: process.env.SMTP_PORT || undefined,
        SMTP_SECURE: process.env.SMTP_SECURE || undefined,
        SMTP_FAMILY: process.env.SMTP_FAMILY || undefined,
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
            'Cau hinh email chua day du. Vui long kiem tra EMAIL_USERNAME, EMAIL_PASSWORD va FROM_EMAIL.',
        );
    }

    return { service, username, password, fromEmail, fromName };
};

const getTransporterOptions = ({ service, username, password }) => {
    if (process.env.SMTP_HOST) {
        return {
            host: process.env.SMTP_HOST,
            port: Number(process.env.SMTP_PORT || 587),
            secure: process.env.SMTP_SECURE === 'true',
            family: Number(process.env.SMTP_FAMILY || 4),
            auth: {
                user: username,
                pass: password,
            },
            connectionTimeout: EMAIL_TIMEOUT_MS,
            greetingTimeout: EMAIL_TIMEOUT_MS,
            socketTimeout: EMAIL_TIMEOUT_MS,
        };
    }

    return {
        service,
        auth: {
            user: username,
            pass: password,
        },
        connectionTimeout: EMAIL_TIMEOUT_MS,
        greetingTimeout: EMAIL_TIMEOUT_MS,
        socketTimeout: EMAIL_TIMEOUT_MS,
    };
};

const createTransporter = (config) => {
    const transporterOptions = getTransporterOptions(config);
    return nodemailer.createTransport(transporterOptions);
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

    const errorMessage = String(error?.message || '').toLowerCase();

    if (error?.code === 'EAUTH' || error?.responseCode === 535 || error?.responseCode === 534) {
        return new EmailDeliveryError(
            'EMAIL_AUTH_FAILED',
            'Khong the xac thuc tai khoan email. Vui long kiem tra Gmail App Password.',
            503,
            error,
        );
    }

    if (
        error?.code === 'ESOCKET'
        || error?.code === 'ECONNECTION'
        || error?.code === 'ETIMEDOUT'
        || error?.code === 'ECONNRESET'
        || error?.code === 'ENETUNREACH'
        || error?.code === 'ECONNREFUSED'
        || error?.command === 'CONN'
        || errorMessage.includes('connection timeout')
        || errorMessage.includes('enetunreach')
    ) {
        return new EmailDeliveryError(
            'EMAIL_CONNECTION_FAILED',
            'Khong the ket noi dich vu email. Vui long thu lai sau.',
            503,
            error,
        );
    }

    return new EmailDeliveryError(
        'EMAIL_SEND_FAILED',
        'Khong the gui email luc nay. Vui long thu lai sau.',
        503,
        error,
    );
};

const sendEmail = async (options) => {
    try {
        const config = getRequiredEmailConfig();
        const transporter = createTransporter(config);

        await transporter.sendMail({
            from: `${config.fromName} <${config.fromEmail}>`,
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
