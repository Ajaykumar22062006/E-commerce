import express from 'express';
import {
  getDeliveryDashboardStats,
  getDeliveries,
  getDeliveryById,
  assignDelivery,
  updateDeliveryStatus,
  getDeliveryPersonnel,
  createDeliveryPersonnel,
  getVehicles,
  createVehicle,
  getDeliveryByOrderId,
  calculateDeliveryQuote
} from '../controllers/deliveryController.js';
import { authenticate, requireRole } from '../middleware/auth.js';

const router = express.Router();

// Real-time Delivery & Unloading Quote with Schedule Slots (Available during checkout)
router.post('/quote', calculateDeliveryQuote);

// All following delivery operations require authentication
router.use(authenticate);

// 1. Dashboard statistics (Admin & Delivery Personnel)
router.get('/dashboard/stats', requireRole('admin', 'delivery_personnel'), getDeliveryDashboardStats);

// 2. Personnel management (Admin only)
router.get('/personnel', requireRole('admin'), getDeliveryPersonnel);
router.post('/personnel', requireRole('admin'), createDeliveryPersonnel);

// 3. Vehicle fleet management (Admin only)
router.get('/vehicles', requireRole('admin'), getVehicles);
router.post('/vehicles', requireRole('admin'), createVehicle);

// 4. Assignment & Scheduling (Admin only)
router.post('/assign', requireRole('admin'), assignDelivery);

// 5. Tracking for Customer Orders (Customer, Admin, or Assigned Driver)
router.get('/order/:orderId', getDeliveryByOrderId);

// 6. Deliveries Listing (Admin & Delivery Personnel)
router.get('/', requireRole('admin', 'delivery_personnel'), getDeliveries);

// 7. Single Delivery Details (Admin, Delivery Personnel, Customer)
router.get('/:id', getDeliveryById);

// 8. Update Delivery Status (Admin & Assigned Delivery Personnel)
router.put('/:id/status', requireRole('admin', 'delivery_personnel'), updateDeliveryStatus);

export default router;
