import express from 'express';
import authRoutes from './authRoutes.js';
import categoryRoutes from './categoryRoutes.js';
import productRoutes from './productRoutes.js';
import cartRoutes from './cartRoutes.js';
import wishlistRoutes from './wishlistRoutes.js';
import addressRoutes from './addressRoutes.js';
import couponRoutes from './couponRoutes.js';
import orderRoutes from './orderRoutes.js';
import paymentRoutes from './paymentRoutes.js';
import serviceAreaRoutes from './serviceAreaRoutes.js';
import bulkInquiryRoutes from './bulkInquiryRoutes.js';
import inventoryRoutes from './inventoryRoutes.js';
import adminRoutes from './adminRoutes.js';
import deliveryRoutes from './deliveryRoutes.js';

const router = express.Router();

router.use('/auth', authRoutes);
router.use('/categories', categoryRoutes);
router.use('/products', productRoutes);
router.use('/cart', cartRoutes);
router.use('/wishlist', wishlistRoutes);
router.use('/addresses', addressRoutes);
router.use('/coupons', couponRoutes);
router.use('/orders', orderRoutes);
router.use('/payments', paymentRoutes);
router.use('/service-areas', serviceAreaRoutes);
router.use('/bulk-inquiries', bulkInquiryRoutes);
router.use('/inventory', inventoryRoutes);
router.use('/admin', adminRoutes);
router.use('/deliveries', deliveryRoutes);

// System health check
router.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'BuildMart Backend API',
    version: '1.0.0'
  });
});

export default router;
