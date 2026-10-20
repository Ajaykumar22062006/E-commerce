import test from 'node:test';
import assert from 'node:assert';
import request from 'supertest';
import app from '../src/app.js';
import pool from '../src/config/db.js';

test('PAYMENT SUITE: Razorpay Order Creation & Signature Verification', async (t) => {
  let customerToken = '';
  let addressId = null;
  let orderId = null;

  // Setup: login
  const loginRes = await request(app)
    .post('/api/auth/login')
    .send({
      email: 'customer@example.com',
      password: 'Customer@2026!'
    });
  customerToken = loginRes.body.data.token;

  const addrRes = await request(app)
    .get('/api/addresses')
    .set('Authorization', `Bearer ${customerToken}`);
  addressId = addrRes.body.data[0].id;

  // Pick a product and put in cart
  const [prodRows] = await pool.query('SELECT id FROM products WHERE sku = "TOL-WHL-100L-01"');
  await request(app).delete('/api/cart').set('Authorization', `Bearer ${customerToken}`);
  await request(app)
    .post('/api/cart/items')
    .set('Authorization', `Bearer ${customerToken}`)
    .send({ product_id: prodRows[0].id, quantity: 1 });

  // Create an order with razorpay payment method
  const orderRes = await request(app)
    .post('/api/orders')
    .set('Authorization', `Bearer ${customerToken}`)
    .send({
      address_id: addressId,
      payment_method: 'razorpay'
    });
  orderId = orderRes.body.data.orderId;

  await t.test('1. Should create a Razorpay payment order on the backend', async () => {
    const res = await request(app)
      .post('/api/payments/razorpay/create-order')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({ order_id: orderId });

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.success, true);
    assert.ok(res.body.data.razorpay_order_id);
    assert.ok(res.body.data.amount > 0);
  });

  await t.test('2. Should reject invalid payment signature verification', async () => {
    const res = await request(app)
      .post('/api/payments/razorpay/verify')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({
        order_id: orderId,
        razorpay_order_id: 'order_fake_123',
        razorpay_payment_id: 'pay_fake_456',
        razorpay_signature: 'invalid_tampered_signature'
      });

    assert.strictEqual(res.status, 400);
    assert.strictEqual(res.body.success, false);
  });

  await t.test('3. Should verify test payment signature and update order to paid', async () => {
    const mockPaymentId = `pay_test_${Date.now()}`;
    const mockOrderId = `order_test_${orderId}_demo`;

    const res = await request(app)
      .post('/api/payments/razorpay/verify')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({
        order_id: orderId,
        razorpay_order_id: mockOrderId,
        razorpay_payment_id: mockPaymentId,
        razorpay_signature: `mock_valid_signature_${mockPaymentId}`
      });

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.success, true);
    assert.strictEqual(res.body.data.status, 'paid');

    // Confirm in MySQL
    const [orders] = await pool.query('SELECT payment_status, order_status FROM orders WHERE id = ?', [orderId]);
    assert.strictEqual(orders[0].payment_status, 'paid');
    assert.strictEqual(orders[0].order_status, 'confirmed');
  });
});
