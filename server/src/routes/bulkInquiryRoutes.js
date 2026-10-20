import express from 'express';
import { submitBulkInquiry, getMyBulkInquiries } from '../controllers/bulkInquiryController.js';
import { optionalAuth, authenticate } from '../middleware/auth.js';

const router = express.Router();

router.post('/', optionalAuth, submitBulkInquiry);
router.get('/my', authenticate, getMyBulkInquiries);

export default router;
