import express from 'express';
import { checkPincodeServiceability, listServiceAreas } from '../controllers/serviceAreaController.js';

const router = express.Router();

router.get('/check/:pincode', checkPincodeServiceability);
router.get('/', listServiceAreas);

export default router;
