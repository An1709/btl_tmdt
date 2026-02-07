import express from 'express';
import { 
    createWarrantyRequest, 
    getMyWarrantyRequests, 
    getAllWarrantyRequests, 
    updateWarrantyStatus 
} from '../controllers/warrantyController.js';
import { protectedRoute, adminRoute } from '../middlewares/authMiddleware.js';

const router = express.Router();

// User
router.post('/', protectedRoute, createWarrantyRequest);
router.get('/my-requests', protectedRoute, getMyWarrantyRequests);

// Admin
router.get('/admin', protectedRoute, adminRoute, getAllWarrantyRequests);
router.put('/admin/:id', protectedRoute, adminRoute, updateWarrantyStatus);

export default router;