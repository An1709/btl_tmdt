import express from 'express';
import fs from 'fs';
import multer from 'multer';
import path from 'path';
import { predictPet } from '../controllers/petVisionController.js';
import { getPetVisionRuntimeConfig, logPetVisionRuntimeDiagnosticsOnce } from '../services/petVisionRuntime.js';

const router = express.Router();

logPetVisionRuntimeDiagnosticsOnce();

const uploadDir = getPetVisionRuntimeConfig().uploadDir;
const allowedExtension = /\.(jpe?g|png|webp)$/i;
const allowedMimeType = /^image\/(jpe?g|png|webp)$/i;

if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
    destination(req, file, cb) {
        cb(null, uploadDir);
    },
    filename(req, file, cb) {
        const extension = path.extname(file.originalname).toLowerCase();
        const safeSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
        cb(null, `pet-vision-${safeSuffix}${extension}`);
    },
});

const upload = multer({
    storage,
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter(req, file, cb) {
        const hasAllowedExtension = allowedExtension.test(file.originalname);
        const hasAllowedMimeType = allowedMimeType.test(file.mimetype);

        if (hasAllowedExtension && hasAllowedMimeType) {
            cb(null, true);
            return;
        }

        cb(new Error('Chỉ chấp nhận ảnh jpg, jpeg, png hoặc webp.'));
    },
});

const handleUpload = (req, res, next) => {
    upload.single('image')(req, res, (error) => {
        if (!error) {
            next();
            return;
        }

        const message = error instanceof multer.MulterError && error.code === 'LIMIT_FILE_SIZE'
            ? 'Ảnh tải lên không được vượt quá 5MB.'
            : error.message || 'Không thể tải ảnh lên. Vui lòng thử lại.';

        res.status(400).json({
            success: false,
            message,
        });
    });
};

router.post('/predict', handleUpload, predictPet);

export default router;
