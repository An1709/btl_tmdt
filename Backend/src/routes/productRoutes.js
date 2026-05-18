import express from 'express';
import {
    getProducts,
    getFeaturedProducts,
    getPersonalizedRecommendations,
    getProductSearchSuggestions,
    getProductRecommendations,
    getProductComboSuggestions,
    getProductById,
    createProduct,
    updateProduct,
    deleteProduct,
    createProductReview
} from '../controllers/productController.js';
import { protectedRoute, adminRoute } from '../middlewares/authMiddleware.js';
import { canReview } from '../middlewares/reviewMiddleware.js';

const router = express.Router();

// Public
router.route('/').get(getProducts);
router.route('/featured').get(getFeaturedProducts);
router.route('/recommendations/personalized').get(getPersonalizedRecommendations);
router.route('/search/suggestions').get(getProductSearchSuggestions);
router.route('/:id/recommendations').get(getProductRecommendations);
router.route('/:id/combo-suggestions').get(getProductComboSuggestions);
router.route('/:id').get(getProductById);

// User Review
router.route('/:id/reviews').post(protectedRoute, canReview, createProductReview);

// Admin Only
router.route('/')
    .post(protectedRoute, adminRoute, createProduct);

router.route('/:id')
    .put(protectedRoute, adminRoute, updateProduct)
    .delete(protectedRoute, adminRoute, deleteProduct);

export default router;
