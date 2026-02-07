import express from 'express';
import { 
    getAllReviews, 
    deleteReview 
} from '../controllers/reviewController.js';
import { protectedRoute, adminRoute } from '../middlewares/authMiddleware.js';

const router = express.Router();

// Chỉ Admin mới được vào route này
router.use(protectedRoute, adminRoute);

router.route('/').get(getAllReviews);
router.route('/:id').delete(deleteReview);

export default router;