import express from 'express';
import {
  getProducts,
  getFeaturedProducts,
  getProductBySlug,
  getProductReviews,
  addProductReview
} from '../controllers/productController.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

router.get('/', getProducts);
router.get('/featured', getFeaturedProducts);
router.get('/:slug', getProductBySlug);
router.get('/:id/reviews', getProductReviews);
router.post('/:id/reviews', authenticate, addProductReview);

export default router;
