import express from 'express';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import { chatWithAI } from '../controllers/aiController.js';

const router = express.Router();

const optionalAuth = async (req, res, next) => {
    try {
        let token;

        if (req.headers.authorization?.startsWith('Bearer')) {
            token = req.headers.authorization.split(' ')[1];
        } else if (req.cookies?.jwt) {
            token = req.cookies.jwt;
        }

        if (!token) return next();

        const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
        const user = await User.findById(decoded.userId).select('-hashedPassword');

        if (user && !user.isBlocked && user.isEmailVerified !== false) {
            req.user = user;
        }
    } catch {
        req.user = undefined;
    }

    return next();
};

router.post('/chat', optionalAuth, chatWithAI);
router.post('/message', optionalAuth, chatWithAI);

export default router;
