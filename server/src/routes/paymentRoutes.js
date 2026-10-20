import express from 'express';
import {
  createRazorpayOrder,
  verifyPayment,
  handleWebhook
} from '../controllers/paymentController.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

router.post('/razorpay/create-order', authenticate, createRazorpayOrder);
router.post('/razorpay/verify', authenticate, verifyPayment);
router.post('/webhook', handleWebhook);

export default router;
