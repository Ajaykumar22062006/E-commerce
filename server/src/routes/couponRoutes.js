import express from 'express';
import { validateCoupon, getActiveCoupons } from '../controllers/couponController.js';

const router = express.Router();

router.get('/active', getActiveCoupons);
router.post('/validate', validateCoupon);

export default router;
