import express from 'express';
import {
    getCart,
    addCartItem,
    updateCartItem,
    removeCartItem,
    clearCart,
} from '../controllers/cartController.js';
import { protectedRoute } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.use(protectedRoute);

router.route('/')
    .get(getCart)
    .post(addCartItem)
    .delete(clearCart);

router.route('/:productId')
    .put(updateCartItem)
    .delete(removeCartItem);

export default router;
