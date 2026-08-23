import express from 'express';
import { 
    createWarrantyRequest, 
    getMyWarrantyRequests, 
    getAllWarrantyRequests, 
    updateWarrantyStatus 
} from '../controllers/warrantyController.js';
import { protectedRoute, adminRoute } from '../middlewares/authMiddleware.js';
import upload from '../middlewares/uploadMiddleware.js';

const router = express.Router();

const uploadWarrantyImages = (req, res, next) => {
    upload.array('images', 5)(req, res, (error) => {
        if (!error) return next();

        if (error.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({ message: 'Mỗi ảnh minh chứng phải nhỏ hơn 5MB.' });
        }

        if (error.code === 'LIMIT_UNEXPECTED_FILE') {
            return res.status(400).json({ message: 'Chỉ được tải lên tối đa 5 ảnh minh chứng.' });
        }

        return res.status(400).json({ message: error.message || 'Vui lòng chọn tệp ảnh hợp lệ.' });
    });
};

// User
router.post('/', protectedRoute, uploadWarrantyImages, createWarrantyRequest);
router.get('/my-requests', protectedRoute, getMyWarrantyRequests);

// Admin
router.get('/admin', protectedRoute, adminRoute, getAllWarrantyRequests);
router.put('/admin/:id', protectedRoute, adminRoute, updateWarrantyStatus);

export default router;
