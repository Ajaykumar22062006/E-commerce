import Razorpay from 'razorpay';
import crypto from 'crypto';
import logger from '../utils/logger.js';

const keyId = process.env.RAZORPAY_KEY_ID || 'rzp_test_buildmartDemoKey';
const keySecret = process.env.RAZORPAY_KEY_SECRET || 'buildmartSecretDemo12345';
const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET || 'buildmart_webhook_secret_key_xyz';

export let razorpayInstance = null;

try {
  razorpayInstance = new Razorpay({
    key_id: keyId,
    key_secret: keySecret
  });
  logger.info('Razorpay SDK initialized in test mode.', { keyId: keyId.substring(0, 10) + '...' });
} catch (error) {
  logger.warn('Razorpay SDK initialization notice:', { message: error.message });
}

/**
 * Verifies Razorpay payment signature
 * HMAC SHA256 (order_id + "|" + payment_id, secret)
 */
export function verifyRazorpaySignature(razorpayOrderId, razorpayPaymentId, signature) {
  if (!signature || !razorpayOrderId || !razorpayPaymentId) {
    return false;
  }
  const body = razorpayOrderId + '|' + razorpayPaymentId;
  const expectedSignature = crypto
    .createHmac('sha256', keySecret)
    .update(body.toString())
    .digest('hex');

  return expectedSignature === signature;
}

/**
 * Verifies Razorpay webhook signature
 */
export function verifyWebhookSignature(rawBody, webhookSignature) {
  if (!webhookSignature || !rawBody) {
    return false;
  }
  const expectedSignature = crypto
    .createHmac('sha256', webhookSecret)
    .update(rawBody)
    .digest('hex');

  return expectedSignature === webhookSignature;
}

export const razorpayConfig = {
  keyId,
  keySecret,
  webhookSecret
};

export default razorpayInstance;
