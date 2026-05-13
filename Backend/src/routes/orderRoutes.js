import express from 'express';
import {
    addOrderItems,
    getOrders,
    getMyOrders,
    getOrderById,
    updateOrderStatus
} from '../controllers/orderController.js';
import { protectedRoute, adminRoute } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.route('/')
    .post(protectedRoute, addOrderItems)
    .get(protectedRoute, adminRoute, getOrders);

router.route('/myorders').get(protectedRoute, getMyOrders);
router.route('/:id/status').put(protectedRoute, adminRoute, updateOrderStatus);
router.route('/:id').get(protectedRoute, getOrderById);

export default router;
