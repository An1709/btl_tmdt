import express from 'express';
import { 
    getCollection, 
    addToCollection, 
    removeFromCollection 
} from '../controllers/collectionController.js';
import { protectedRoute } from '../middlewares/authMiddleware.js';

const router = express.Router();

// Tất cả route này đều cần đăng nhập
router.use(protectedRoute);

router.route('/')
    .get(getCollection)
    .post(addToCollection);

router.route('/:productId')
    .delete(removeFromCollection);

export default router;