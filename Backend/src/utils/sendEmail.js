import nodemailer from 'nodemailer';

const EMAIL_TIMEOUT_MS = 60000;
const BREVO_API_URL = 'https://api.brevo.com/v3/smtp/email';

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

const getTransportMode = () => {
    if (process.env.BREVO_API_KEY) return 'brevo-api';
    if (process.env.SMTP_HOST) return 'smtp';
    return 'service';
};

const getRecipientDomain = (email = '') => {
    const [, domain] = String(email).split('@');
    return domain || undefined;
};

const stripHtml = (html = '') => String(html)
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const logEmailConfigPresenceOnce = () => {
    if (emailConfigPresenceLogged) return;

    const transportMode = getTransportMode();
    emailConfigPresenceLogged = true;
    console.info('[Email:config]', {
        transportMode,
        emailServiceIgnored: transportMode !== 'service',
        smtpHostIgnored: transportMode === 'brevo-api' && Boolean(process.env.SMTP_HOST),
        providerHost: process.env.SMTP_HOST || undefined,
        smtpPort: process.env.SMTP_PORT || undefined,
        smtpSecure: process.env.SMTP_SECURE || undefined,
        smtpFamily: process.env.SMTP_FAMILY || undefined,
        has_BREVO_API_KEY: Boolean(process.env.BREVO_API_KEY),
        has_BREVO_SENDER_EMAIL: Boolean(process.env.BREVO_SENDER_EMAIL),
        has_BREVO_SENDER_NAME: Boolean(process.env.BREVO_SENDER_NAME),
        has_EMAIL_USERNAME: Boolean(process.env.EMAIL_USERNAME),
        has_EMAIL_PASSWORD: Boolean(process.env.EMAIL_PASSWORD),
        has_FROM_EMAIL: Boolean(process.env.FROM_EMAIL),
        has_FROM_NAME: Boolean(process.env.FROM_NAME),
    });
};

const getBrevoConfig = () => {
    logEmailConfigPresenceOnce();

    const apiKey = process.env.BREVO_API_KEY;
    const senderEmail = process.env.BREVO_SENDER_EMAIL || process.env.FROM_EMAIL;
    const senderName = process.env.BREVO_SENDER_NAME || process.env.FROM_NAME || 'PetMart';

    if (!apiKey || !senderEmail) {
        throw new EmailDeliveryError(
            'EMAIL_CONFIG_MISSING',
            'Brevo email configuration is incomplete. Please check BREVO_API_KEY and BREVO_SENDER_EMAIL or FROM_EMAIL.',
        );
    }

    return { apiKey, senderEmail, senderName };
};

const getSmtpConfig = () => {
    logEmailConfigPresenceOnce();

    const service = process.env.EMAIL_SERVICE || 'gmail';
    const username = process.env.EMAIL_USERNAME;
    const password = process.env.EMAIL_PASSWORD;
    const fromEmail = process.env.FROM_EMAIL;
    const fromName = process.env.FROM_NAME || 'PetMart';

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
            'Khong the xac thuc tai khoan email. Vui long kiem tra email credentials.',
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
        || errorMessage.includes('fetch failed')
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
        errorMessage.includes('sender') || errorMessage.includes('from')
            ? 'Email sender was rejected. Please check sender email is verified in the email provider.'
            : 'Khong the gui email luc nay. Vui long thu lai sau.',
        503,
        error,
    );
};

const parseBrevoResponse = async (response) => {
    const text = await response.text();
    if (!text) return {};

    try {
        return JSON.parse(text);
    } catch {
        return { message: text.slice(0, 500) };
    }
};

const getBrevoSafeErrorLog = (response, payload = {}) => ({
    status: response.status,
    code: payload?.code,
    message: payload?.message,
});

const getBrevoErrorCode = (response, payload = {}) => {
    if (response.status === 401 || response.status === 403) return 'EMAIL_AUTH_FAILED';

    const message = String(payload?.message || '').toLowerCase();
    if (
        message.includes('sender')
        || message.includes('from')
        || message.includes('not verified')
        || message.includes('unauthorized sender')
    ) {
        return 'EMAIL_SEND_FAILED';
    }

    return 'EMAIL_SEND_FAILED';
};

const sendBrevoEmail = async (options) => {
    if (typeof fetch !== 'function') {
        throw new EmailDeliveryError(
            'EMAIL_SEND_FAILED',
            'Global fetch is not available in this Node runtime.',
        );
    }

    const { apiKey, senderEmail, senderName } = getBrevoConfig();
    const recipientEmail = options.email;
    const html = options.message || options.html || '';
    const text = options.text || stripHtml(html);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), EMAIL_TIMEOUT_MS);

    console.info('[Email:send]', {
        transportMode: 'brevo-api',
        recipientDomain: getRecipientDomain(recipientEmail),
    });

    try {
        const response = await fetch(BREVO_API_URL, {
            method: 'POST',
            headers: {
                'api-key': apiKey,
                'Content-Type': 'application/json',
                Accept: 'application/json',
            },
            body: JSON.stringify({
                sender: {
                    name: senderName,
                    email: senderEmail,
                },
                to: [
                    { email: recipientEmail },
                ],
                subject: options.subject,
                htmlContent: html,
                textContent: text,
            }),
            signal: controller.signal,
        });

        const responsePayload = await parseBrevoResponse(response);
        if ([200, 201, 202].includes(response.status)) return;

        console.error('[Email] Brevo API error:', getBrevoSafeErrorLog(response, responsePayload));
        throw new EmailDeliveryError(
            getBrevoErrorCode(response, responsePayload),
            responsePayload?.message || 'Brevo API email sending failed.',
            response.status === 401 || response.status === 403 || response.status >= 500 ? 503 : 400,
        );
    } catch (error) {
        if (error instanceof EmailDeliveryError) throw error;

        throw new EmailDeliveryError(
            'EMAIL_CONNECTION_FAILED',
            error?.name === 'AbortError'
                ? 'Brevo API request timed out.'
                : 'Could not connect to Brevo API.',
            503,
            error,
        );
    } finally {
        clearTimeout(timeout);
    }
};

const sendSmtpEmail = async (options) => {
    const config = getSmtpConfig();
    const transporter = createTransporter(config);

    console.info('[Email:send]', {
        transportMode: getTransportMode(),
        recipientDomain: getRecipientDomain(options.email),
    });

    await transporter.sendMail({
        from: `"${config.fromName}" <${config.fromEmail}>`,
        to: options.email,
        subject: options.subject,
        html: options.message,
        text: options.text || stripHtml(options.message),
    });
};

const sendEmail = async (options) => {
    try {
        if (getTransportMode() === 'brevo-api') {
            await sendBrevoEmail(options);
            return;
        }

        await sendSmtpEmail(options);
    } catch (error) {
        logOriginalEmailError(error);
        throw getSafeEmailError(error);
    }
};

export default sendEmail;
