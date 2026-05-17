import multer from 'multer';
import path from 'path';
import fs from 'fs';

const uploadDir = 'uploads/';

if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
    destination(req, file, cb) {
        cb(null, uploadDir);
    },
    filename(req, file, cb) {
        const extension = path.extname(file.originalname).toLowerCase();
        cb(null, `${file.fieldname}-${Date.now()}${extension}`);
    },
});

function checkFileType(file, cb) {
    const filetypes = /jpg|jpeg|png|webp/;
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = /^image\/(jpe?g|png|webp)$/.test(file.mimetype);

    if (extname && mimetype) {
        return cb(null, true);
    }

    return cb(new Error('Chỉ chấp nhận file ảnh (jpg, jpeg, png, webp)!'));
}

const upload = multer({
    storage,
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: function (req, file, cb) {
        checkFileType(file, cb);
    },
});

export default upload;
