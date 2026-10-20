import express from 'express';
import {
  getDashboardStats,
  createProduct,
  updateProduct,
  deleteProduct,
  getAdminOrders,
  updateOrderStatus,
  getAdminBulkInquiries,
  updateBulkInquiry,
  getCustomers,
  toggleCustomerStatus
} from '../controllers/adminController.js';
import { authenticate, requireRole } from '../middleware/auth.js';

const router = express.Router();

// Strict server-side role check: only 'admin' role allowed
router.use(authenticate, requireRole('admin'));

// Analytics & KPI Dashboard
router.get('/dashboard', getDashboardStats);

// Products management
router.post('/products', createProduct);
router.put('/products/:id', updateProduct);
router.delete('/products/:id', deleteProduct);

// Orders management
router.get('/orders', getAdminOrders);
router.put('/orders/:id/status', updateOrderStatus);

// Bulk inquiries management
router.get('/bulk-inquiries', getAdminBulkInquiries);
router.put('/bulk-inquiries/:id', updateBulkInquiry);

// Customer management
router.get('/customers', getCustomers);
router.put('/customers/:id/status', toggleCustomerStatus);

export default router;
