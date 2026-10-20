import test from 'node:test';
import assert from 'node:assert';
import request from 'supertest';
import app from '../src/app.js';
import pool from '../src/config/db.js';

test('CART, CHECKOUT & INVENTORY SUITE', async (t) => {
  let customerToken = '';
  let customerId = null;
  let addressId = null;
  let testProductId = null;
  let initialStock = 0;
  let createdOrderId = null;

  // Setup: login as customer
  const loginRes = await request(app)
    .post('/api/auth/login')
    .send({
      email: 'customer@example.com',
      password: 'Customer@2026!'
    });
  customerToken = loginRes.body.data.token;
  customerId = loginRes.body.data.user.id;

  // Get user address
  const addrRes = await request(app)
    .get('/api/addresses')
    .set('Authorization', `Bearer ${customerToken}`);
  addressId = addrRes.body.data[0].id;

  // Pick a product to test
  const [prodRows] = await pool.query('SELECT id, stock_quantity FROM products WHERE sku = "PNT-AP-ULT-20L"');
  testProductId = prodRows[0].id;
  initialStock = prodRows[0].stock_quantity;

  await t.test('1. Should add product to cart and verify cart subtotal', async () => {
    // Clear cart first
    await request(app).delete('/api/cart').set('Authorization', `Bearer ${customerToken}`);

    const res = await request(app)
      .post('/api/cart/items')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({
        product_id: testProductId,
        quantity: 2
      });

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.success, true);
    assert.strictEqual(res.body.data.items_count, 2);
    assert.ok(res.body.data.subtotal > 0);
  });

  await t.test('2. Should validate promo coupon BUILD10', async () => {
    const res = await request(app)
      .post('/api/coupons/validate')
      .send({
        code: 'BUILD10',
        subtotal: 5000
      });

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.success, true);
    assert.strictEqual(res.body.data.discount_amount, 500); // 10% of 5000
  });

  await t.test('3. Should place an order with COD, deduct inventory, and record movement', async () => {
    const res = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({
        address_id: addressId,
        payment_method: 'cod',
        coupon_code: 'BUILD10',
        notes: 'Deliver to site gate 2'
      });

    assert.strictEqual(res.status, 201);
    assert.strictEqual(res.body.success, true);
    assert.ok(res.body.data.orderNumber);
    assert.strictEqual(res.body.data.paymentMethod, 'cod');
    createdOrderId = res.body.data.orderId;

    // Verify stock deduction in MySQL
    const [updatedProd] = await pool.query('SELECT stock_quantity FROM products WHERE id = ?', [testProductId]);
    assert.strictEqual(updatedProd[0].stock_quantity, initialStock - 2);

    // Verify inventory movement record in MySQL
    const [movements] = await pool.query(
      'SELECT movement_type, change_quantity FROM inventory_movements WHERE product_id = ? ORDER BY id DESC LIMIT 1',
      [testProductId]
    );
    assert.strictEqual(movements[0].movement_type, 'order_deduction');
    assert.strictEqual(movements[0].change_quantity, -2);
  });

  await t.test('4. Should cancel order and atomically restore inventory', async () => {
    const res = await request(app)
      .post(`/api/orders/${createdOrderId}/cancel`)
      .set('Authorization', `Bearer ${customerToken}`)
      .send({
        reason: 'Client rescheduled concrete pouring date'
      });

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.success, true);

    // Verify stock restored to original in MySQL
    const [restoredProd] = await pool.query('SELECT stock_quantity FROM products WHERE id = ?', [testProductId]);
    assert.strictEqual(restoredProd[0].stock_quantity, initialStock);

    // Verify restore movement
    const [restoreMovement] = await pool.query(
      'SELECT movement_type, change_quantity FROM inventory_movements WHERE product_id = ? ORDER BY id DESC LIMIT 1',
      [testProductId]
    );
    assert.strictEqual(restoreMovement[0].movement_type, 'order_cancellation_restore');
    assert.strictEqual(restoreMovement[0].change_quantity, 2);
  });
});
