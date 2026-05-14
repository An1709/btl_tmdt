import express from 'express';
import {
    signUp,
    signIn,
    verifyEmail,
    resendVerificationCode,
    forgotPassword,
    resetPassword,
    signOut,
    refreshToken,
} from '../controllers/authController.js';

const router = express.Router();

router.post('/signup', signUp);
router.post('/signin', signIn);
router.post('/verify-email', verifyEmail);
router.post('/resend-verification-code', resendVerificationCode);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);
router.post('/signout', signOut);
router.post('/refresh', refreshToken);

export default router;
