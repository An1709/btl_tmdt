import express from 'express';
import { checkCoupon } from '../controllers/couponController.js';
import { protectedRoute, adminRoute } from '../middlewares/authMiddleware.js';

const router = express.Router();

// User check mã
router.post('/check', protectedRoute, checkCoupon);

// Admin quản lý mã (Bạn cần viết thêm controller CRUD cho phần này nếu muốn)
// router.route('/').post(protectedRoute, adminRoute, createCoupon);

export default router;