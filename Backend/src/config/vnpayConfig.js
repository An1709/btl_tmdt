import dotenv from 'dotenv';
dotenv.config();

/* Cấu hình VNPAY */
const vnpayConfig = {
    vnp_TmnCode: process.env.VNP_TMN_CODE, // Mã website của bạn tại VNPAY
    vnp_HashSecret: process.env.VNP_HASH_SECRET, // Chuỗi bí mật để tạo chữ ký
    vnp_Url: process.env.VNP_URL, // Đường dẫn thanh toán (Sandbox hoặc thật)
    vnp_ReturnUrl: process.env.VNP_RETURN_URL, // Đường dẫn VNPAY sẽ gọi về khi thanh toán xong
    vnp_Api: process.env.VNP_API // API truy vấn giao dịch (tùy chọn)
};

export default vnpayConfig;