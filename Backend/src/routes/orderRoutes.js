import express from 'express';
import { 
    addOrderItems, 
    getMyOrders, 
    getOrderById 
    // getOrders (Admin)
} from '../controllers/orderController.js';
import { protectedRoute, adminRoute } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.route('/')
    .post(protectedRoute, addOrderItems);
    // .get(protectedRoute, adminRoute, getOrders); // Admin xem tất cả đơn

router.route('/myorders').get(protectedRoute, getMyOrders);
router.route('/:id').get(protectedRoute, getOrderById);

export default router;