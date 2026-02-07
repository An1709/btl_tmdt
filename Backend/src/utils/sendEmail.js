import nodemailer from 'nodemailer';

const sendEmail = async (options) => {
    // 1. Tạo Transporter (Người vận chuyển)
    const transporter = nodemailer.createTransport({
        service: 'gmail', // Hoặc dùng host/port nếu không dùng Gmail
        auth: {
            user: process.env.EMAIL_USERNAME, // Email của bạn (vd: shop.pet@gmail.com)
            pass: process.env.EMAIL_PASSWORD, // Mật khẩu ứng dụng (App Password)
        },
    });

    // 2. Cấu hình email
    const mailOptions = {
        from: `PetShop Support <${process.env.EMAIL_USERNAME}>`,
        to: options.email,
        subject: options.subject,
        html: options.message, // Gửi dạng HTML cho đẹp
    };

    // 3. Gửi
    await transporter.sendMail(mailOptions);
};

export default sendEmail;