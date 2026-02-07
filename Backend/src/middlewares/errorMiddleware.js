// Middleware xử lý lỗi khi URL không tồn tại (404)
export const notFound = (req, res, next) => {
    const error = new Error(`Không tìm thấy đường dẫn - ${req.originalUrl}`);
    res.status(404);
    next(error);
};

// Middleware xử lý lỗi chung (Error Handler)
export const errorHandler = (err, req, res, next) => {
    // Nếu status code là 200 (thành công) mà vẫn nhảy vào đây thì set lại thành 500 (Lỗi server)
    const statusCode = res.statusCode === 200 ? 500 : res.statusCode;

    res.status(statusCode);
    res.json({
        message: err.message,
        // Chỉ hiện stack trace (dòng lỗi cụ thể) khi ở môi trường development
        stack: process.env.NODE_ENV === 'production' ? null : err.stack,
    });
};