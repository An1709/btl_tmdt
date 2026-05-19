import express from 'express';
import {
    getPetVisionModelStatus,
    trainPetVisionModel,
} from '../controllers/adminPetVisionController.js';
import { protectedRoute, adminRoute } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.use(protectedRoute, adminRoute);

router.get('/model/status', getPetVisionModelStatus);
router.post('/model/train', trainPetVisionModel);

export default router;
