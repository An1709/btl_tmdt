import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import cloudinary, { configureCloudinary, isCloudinaryConfigured } from '../config/cloudinary.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const backendRoot = path.resolve(__dirname, '..', '..');
const localUploadDir = path.resolve(backendRoot, 'uploads');

const bufferToDataUri = (file) => {
    const base64 = file.buffer.toString('base64');
    return `data:${file.mimetype};base64,${base64}`;
};

export const uploadImage = async (file, folder = 'petmart', options = {}) => {
    if (!file?.buffer) {
        throw new Error('INVALID_UPLOAD_FILE');
    }

    if (isCloudinaryConfigured()) {
        configureCloudinary();
        const result = await cloudinary.uploader.upload(bufferToDataUri(file), {
            folder,
            resource_type: 'image',
            public_id: options.publicId,
        });

        return result.secure_url;
    }

    if (process.env.NODE_ENV === 'production') {
        throw new Error('CLOUDINARY_CONFIG_MISSING');
    }

    await fs.mkdir(localUploadDir, { recursive: true });
    const extension = path.extname(file.originalname).toLowerCase() || '.jpg';
    const filename = `${file.fieldname}-${Date.now()}-${Math.round(Math.random() * 1e9)}${extension}`;
    await fs.writeFile(path.join(localUploadDir, filename), file.buffer);

    return `/uploads/${filename}`;
};
