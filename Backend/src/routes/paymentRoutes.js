import express from 'express';
import {
    createPaymentUrl,
    vnpayReturn,
    vnpayIpn,
} from '../controllers/paymentController.js';

const router = express.Router();

// User initiates payment
router.post('/create_payment_url', createPaymentUrl);

// VNPay redirects user browser here after payment (Return URL)
router.get('/vnpay_return', vnpayReturn);

// VNPay calls this server-to-server to confirm transaction (IPN / Webhook)
router.get('/vnpay_ipn', vnpayIpn);

export default router;