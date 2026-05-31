import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import { getAccessTokenSecret } from '../config/auth.js';

// 1. Middleware Xác thực (Authentication) - Kiểm tra đăng nhập
export const protectedRoute = async (req, res, next) => {
    try {
        let token;

        // Ưu tiên 1: Lấy token từ Header (Bearer Token)
        if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
            token = req.headers.authorization.split(' ')[1];
        }
        // Ưu tiên 2: Lấy token từ Cookie (nếu frontend dùng credentials: true)
        else if (req.cookies && req.cookies.jwt) {
            token = req.cookies.jwt;
        }

        // Nếu không tìm thấy token ở đâu cả
        if (!token) {
            return res.status(401).json({ message: 'Bạn chưa đăng nhập (Token missing)' });
        }

        // Xác thực token
        // Lưu ý: Dùng try-catch bọc jwt.verify để bắt lỗi hết hạn/sai token gọn hơn callback
        const decoded = jwt.verify(token, getAccessTokenSecret());

        // Tìm user từ decoded.userId (khớp với payload khi bạn tạo token)
        // .select('-hashedPassword'): Loại bỏ trường mật khẩu khỏi kết quả trả về
        const user = await User.findById(decoded.userId).select('-hashedPassword');

        if (!user) {
            return res.status(404).json({ message: 'Không tìm thấy người dùng này' });
        }

        if (user.isBlocked) {
            return res.status(403).json({ message: 'Tài khoản đã bị khóa.' });
        }

        if (user.isEmailVerified === false) {
            return res.status(403).json({ message: 'Vui lòng xác minh email trước khi sử dụng tài khoản.' });
        }

        // Gán user vào req để các route phía sau sử dụng
        req.user = user;
        next();

    } catch (error) {
        console.error('Lỗi xác thực (Auth Middleware):', error.message);
        
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({ message: 'Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại' });
        }
        
        return res.status(403).json({ message: 'Token không hợp lệ' });
    }
};

// 2. Middleware Phân quyền (Authorization) - Chỉ cho phép Admin
export const adminRoute = (req, res, next) => {
    // req.user đã có được từ hàm protectedRoute chạy trước đó
    if (req.user && req.user.role === 'admin') {
        next();
    } else {
        return res.status(403).json({ message: 'Truy cập bị từ chối: Chỉ dành cho Quản trị viên (Admin)' });
    }
};
