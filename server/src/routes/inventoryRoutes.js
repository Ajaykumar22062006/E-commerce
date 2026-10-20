import express from 'express';
import { getInventory, adjustInventory, getInventoryMovements } from '../controllers/inventoryController.js';
import { authenticate, requireRole } from '../middleware/auth.js';

const router = express.Router();
router.use(authenticate, requireRole('admin'));

router.get('/', getInventory);
router.post('/adjust', adjustInventory);
router.get('/movements', getInventoryMovements);

export default router;
