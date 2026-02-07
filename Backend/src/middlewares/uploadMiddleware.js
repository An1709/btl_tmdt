import multer from 'multer';
import path from 'path';

// Cấu hình nơi lưu trữ file (Lưu tạm vào bộ nhớ Disk của server)
const storage = multer.diskStorage({
    destination(req, file, cb) {
        cb(null, 'uploads/'); // File sẽ được lưu vào thư mục 'uploads' ở root
    },
    filename(req, file, cb) {
        // Đặt tên file: tên_gốc + ngày_tháng + đuôi_file (để tránh trùng tên)
        // VD: meo-anh.png -> meo-anh-167888888.png
        cb(null, `${file.fieldname}-${Date.now()}${path.extname(file.originalname)}`);
    },
});

// Hàm kiểm tra định dạng file
function checkFileType(file, cb) {
    const filetypes = /jpg|jpeg|png|webp/; // Các đuôi cho phép
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = filetypes.test(file.mimetype);

    if (extname && mimetype) {
        return cb(null, true);
    } else {
        cb(new Error('Chỉ chấp nhận file ảnh (jpg, jpeg, png, webp)!'));
    }
}

const upload = multer({
    storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // Giới hạn file 5MB
    fileFilter: function (req, file, cb) {
        checkFileType(file, cb);
    },
});

export default upload;