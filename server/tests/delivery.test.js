import test from 'node:test';
import assert from 'node:assert';
import request from 'supertest';
import app from '../src/app.js';
import pool from '../src/config/db.js';

test('DELIVERY MANAGEMENT SUITE: Logistics Operations & Authorization', async (t) => {
  let adminToken = '';
  let customerToken = '';
  let deliveryPartnerToken = '';
  let deliveryPartnerId = null;
  let testOrderId = null;
  let testDeliveryId = null;
  let testVehicleId = null;

  // 1. Setup tokens
  const adminRes = await request(app).post('/api/auth/login').send({
    email: 'admin@buildmart.com',
    password: 'Admin@BuildMart2026!'
  });
  adminToken = adminRes.body.data.token;

  const customerRes = await request(app).post('/api/auth/login').send({
    email: 'customer@example.com',
    password: 'Customer@2026!'
  });
  customerToken = customerRes.body.data.token;

  const driverRes = await request(app).post('/api/auth/login').send({
    email: 'delivery@buildmart.com',
    password: 'Delivery@2026!'
  });
  deliveryPartnerToken = driverRes.body.data.token;
  deliveryPartnerId = driverRes.body.data.user.id;

  // Vehicle ID
  const [vehRows] = await pool.query('SELECT id FROM delivery_vehicles LIMIT 1');
  testVehicleId = vehRows[0].id;

  await t.test('1. Should fetch real delivery dashboard statistics with role auth', async () => {
    const res = await request(app)
      .get('/api/deliveries/dashboard/stats')
      .set('Authorization', `Bearer ${adminToken}`);

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.success, true);
    assert.ok(res.body.data.totalDeliveries > 0);
    assert.ok(res.body.data.activeVehicles >= 1);
    assert.ok(res.body.data.totalPersonnel >= 1);
  });

  await t.test('2. Should reject customer access to delivery dashboard (403 Forbidden)', async () => {
    const res = await request(app)
      .get('/api/deliveries/dashboard/stats')
      .set('Authorization', `Bearer ${customerToken}`);

    assert.strictEqual(res.status, 403);
    assert.strictEqual(res.body.success, false);
  });

  await t.test('3. Placing an order should atomically create a linked delivery record', async () => {
    // Get address
    const [addrRows] = await pool.query('SELECT id FROM addresses WHERE user_id = ?', [customerRes.body.data.user.id]);
    const addressId = addrRows[0].id;

    // Get a product
    const [pRows] = await pool.query('SELECT id FROM products WHERE sku = "CEM-ULT-53-01"');
    const productId = pRows[0].id;

    // Add to cart
    await request(app).delete('/api/cart').set('Authorization', `Bearer ${customerToken}`);
    await request(app).post('/api/cart/items').set('Authorization', `Bearer ${customerToken}`).send({
      product_id: productId,
      quantity: 5
    });

    // Checkout
    const orderRes = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({
        address_id: addressId,
        payment_method: 'cod',
        notes: 'Deliver to rear loading dock.'
      });

    assert.strictEqual(orderRes.status, 201);
    testOrderId = orderRes.body.data.orderId;

    // Verify delivery record was created in MySQL
    const [delRows] = await pool.query('SELECT * FROM deliveries WHERE order_id = ?', [testOrderId]);
    assert.strictEqual(delRows.length, 1);
    assert.strictEqual(delRows[0].status, 'pending_assignment');
    assert.ok(delRows[0].expected_delivery_date !== null);
    testDeliveryId = delRows[0].id;

    // Verify initial audit history was recorded
    const [histRows] = await pool.query('SELECT * FROM delivery_status_history WHERE delivery_id = ?', [testDeliveryId]);
    assert.ok(histRows.length >= 1);
    assert.strictEqual(histRows[0].to_status, 'pending_assignment');
  });

  await t.test('4. Administrator should assign a delivery personnel and vehicle', async () => {
    const res = await request(app)
      .post('/api/deliveries/assign')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        delivery_id: testDeliveryId,
        delivery_person_id: deliveryPartnerId,
        vehicle_id: testVehicleId,
        expected_delivery_date: '2026-10-20',
        notes: 'Priority morning construction delivery'
      });

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.success, true);
    assert.strictEqual(res.body.data.status, 'assigned');

    // Verify database state
    const [delRows] = await pool.query('SELECT status, delivery_person_id, vehicle_id FROM deliveries WHERE id = ?', [testDeliveryId]);
    assert.strictEqual(delRows[0].status, 'assigned');
    assert.strictEqual(delRows[0].delivery_person_id, deliveryPartnerId);
    assert.strictEqual(delRows[0].vehicle_id, testVehicleId);
  });

  await t.test('5. Assigned delivery partner can transition delivery status to preparing and dispatched', async () => {
    // Transition to preparing
    const prepRes = await request(app)
      .put(`/api/deliveries/${testDeliveryId}/status`)
      .set('Authorization', `Bearer ${deliveryPartnerToken}`)
      .send({
        status: 'preparing',
        notes: 'Loaded 5 cement bags onto tipper truck'
      });
    assert.strictEqual(prepRes.status, 200);

    // Transition to dispatched
    const dispRes = await request(app)
      .put(`/api/deliveries/${testDeliveryId}/status`)
      .set('Authorization', `Bearer ${deliveryPartnerToken}`)
      .send({
        status: 'dispatched',
        notes: 'Left warehouse hub, heading to Noida site'
      });
    assert.strictEqual(dispRes.status, 200);

    // Check order status was synced to shipped
    const [ordRows] = await pool.query('SELECT order_status FROM orders WHERE id = ?', [testOrderId]);
    assert.strictEqual(ordRows[0].order_status, 'shipped');
  });

  await t.test('6. Unassigned delivery partner cannot update another partner’s delivery (403)', async () => {
    // Login as driver 2
    const driver2Res = await request(app).post('/api/auth/login').send({
      email: 'driver2@buildmart.com',
      password: 'Delivery@2026!'
    });
    const driver2Token = driver2Res.body.data.token;

    const res = await request(app)
      .put(`/api/deliveries/${testDeliveryId}/status`)
      .set('Authorization', `Bearer ${driver2Token}`)
      .send({
        status: 'out_for_delivery'
      });

    assert.strictEqual(res.status, 403);
    assert.strictEqual(res.body.success, false);
  });

  await t.test('7. Record failed delivery attempt with required reason and reschedule redelivery', async () => {
    // Attempt failure without reason should be rejected
    const badRes = await request(app)
      .put(`/api/deliveries/${testDeliveryId}/status`)
      .set('Authorization', `Bearer ${deliveryPartnerToken}`)
      .send({
        status: 'failed',
        reason: ''
      });
    assert.strictEqual(badRes.status, 400);

    // Valid failure
    const failRes = await request(app)
      .put(`/api/deliveries/${testDeliveryId}/status`)
      .set('Authorization', `Bearer ${deliveryPartnerToken}`)
      .send({
        status: 'failed',
        reason: 'Unloading crane broke down at client site'
      });
    assert.strictEqual(failRes.status, 200);

    const [delRows] = await pool.query('SELECT status, failure_count, failure_reason FROM deliveries WHERE id = ?', [testDeliveryId]);
    assert.strictEqual(delRows[0].status, 'failed');
    assert.strictEqual(delRows[0].failure_count, 1);
    assert.strictEqual(delRows[0].failure_reason, 'Unloading crane broke down at client site');

    // Admin arranges redelivery / reschedule
    const reschedRes = await request(app)
      .put(`/api/deliveries/${testDeliveryId}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        status: 'rescheduled',
        expected_delivery_date: '2026-10-22',
        notes: 'Rescheduled for morning delivery after client crane repair'
      });
    assert.strictEqual(reschedRes.status, 200);
  });

  await t.test('8. Confirm delivery, update order status and mark COD payment as paid', async () => {
    // Move to out_for_delivery first
    await request(app)
      .put(`/api/deliveries/${testDeliveryId}/status`)
      .set('Authorization', `Bearer ${deliveryPartnerToken}`)
      .send({ status: 'out_for_delivery' });

    // Mark as delivered
    const delivRes = await request(app)
      .put(`/api/deliveries/${testDeliveryId}/status`)
      .set('Authorization', `Bearer ${deliveryPartnerToken}`)
      .send({
        status: 'delivered',
        notes: 'Signed and accepted by site supervisor'
      });

    assert.strictEqual(delivRes.status, 200);

    // Verify order and payment statuses
    const [ordRows] = await pool.query('SELECT order_status, payment_status FROM orders WHERE id = ?', [testOrderId]);
    assert.strictEqual(ordRows[0].order_status, 'delivered');
    assert.strictEqual(ordRows[0].payment_status, 'paid'); // COD automatically marked paid
  });

  await t.test('9. Customer can retrieve real delivery timeline and expected date for their order', async () => {
    const res = await request(app)
      .get(`/api/deliveries/order/${testOrderId}`)
      .set('Authorization', `Bearer ${customerToken}`);

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.success, true);
    assert.strictEqual(res.body.data.status, 'delivered');
    assert.ok(Array.isArray(res.body.data.history));
    assert.ok(res.body.data.history.length >= 3);
  });

  await t.test('10. Delivery quote API calculates freight, unloading charges, and available delivery slots', async () => {
    const [pRows] = await pool.query('SELECT id FROM products WHERE sku = "CEM-ULT-53-01"');
    const productId = pRows[0].id;

    // Quote for hydraulic tipper in serviceable PIN 201301 (Noida Sector 1-18 Zone)
    const quoteRes = await request(app)
      .post('/api/deliveries/quote')
      .send({
        postal_code: '201301',
        unloading_preference: 'hydraulic_tipper',
        items: [{ product_id: productId, quantity: 10 }]
      });

    assert.strictEqual(quoteRes.status, 200);
    assert.strictEqual(quoteRes.body.success, true);
    assert.strictEqual(quoteRes.body.quote.is_serviceable, true);
    assert.strictEqual(quoteRes.body.quote.unloading_fee, 350);
    assert.ok(quoteRes.body.quote.available_dates.length > 0);
    assert.ok(quoteRes.body.quote.available_dates[0].slots.length > 0);

    // Quote for manual labor should be 500
    const laborRes = await request(app)
      .post('/api/deliveries/quote')
      .send({
        postal_code: '201301',
        unloading_preference: 'manual_labor',
        items: [{ product_id: productId, quantity: 10 }]
      });
    assert.strictEqual(laborRes.body.quote.unloading_fee, 500);

    // Quote for crane handling should be 1200
    const craneRes = await request(app)
      .post('/api/deliveries/quote')
      .send({
        postal_code: '201301',
        unloading_preference: 'crane_handling',
        items: [{ product_id: productId, quantity: 10 }]
      });
    assert.strictEqual(craneRes.body.quote.unloading_fee, 1200);
  });

  await t.test('11. Heavy vehicle delivery is rejected in municipal restricted zones', async () => {
    const [pRows] = await pool.query('SELECT id FROM products WHERE sku = "CEM-ULT-53-01"');
    const productId = pRows[0].id;

    // PIN 400001 (Mumbai Fort - Heritage Zone) has heavy_vehicle_allowed = 0
    const quoteRes = await request(app)
      .post('/api/deliveries/quote')
      .send({
        postal_code: '400001',
        unloading_preference: 'hydraulic_tipper',
        items: [{ product_id: productId, quantity: 20 }]
      });

    assert.strictEqual(quoteRes.status, 400);
    assert.strictEqual(quoteRes.body.success, false);
    assert.ok(quoteRes.body.message.includes('restrictions'));
  });

  await t.test('12. Buy Now flow creates order with site details without clearing customer cart', async () => {
    const [pRows] = await pool.query('SELECT id FROM products WHERE sku = "STL-TAT-12MM-01"');
    const steelProductId = pRows[0].id;
    const [cementRows] = await pool.query('SELECT id FROM products WHERE sku = "CEM-ULT-53-01"');
    const cementProductId = cementRows[0].id;

    // 1. Put cement in cart to ensure it will be preserved
    await request(app).delete('/api/cart').set('Authorization', `Bearer ${customerToken}`);
    await request(app).post('/api/cart/items').set('Authorization', `Bearer ${customerToken}`).send({
      product_id: cementProductId,
      quantity: 3
    });

    // 2. Perform BUY NOW on steel directly
    const buyNowRes = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({
        is_buy_now: true,
        buy_now_item: {
          product_id: steelProductId,
          quantity: 2
        },
        payment_method: 'cod',
        site_details: {
          recipient_name: 'SuperTech Construction Sites Ltd',
          phone: '9876543210',
          address_line1: 'Tower B Construction Pit, Sector 12',
          city: 'Noida',
          state: 'Uttar Pradesh',
          postal_code: '201301',
          landmark: 'Opposite Metro Pillar 142',
          preferred_date: '2026-10-25',
          time_slot: '08:00 AM - 12:00 PM',
          unloading_preference: 'crane_handling',
          site_contact_name: 'Er. Rajesh Sharma (Chief Civil Eng)',
          site_contact_phone: '9876500002',
          site_access_instructions: 'Entry via Gate 4 only; high clearance for 25T boom crane required.'
        }
      });

    assert.strictEqual(buyNowRes.status, 201);
    assert.strictEqual(buyNowRes.body.success, true);
    const buyNowOrderId = buyNowRes.body.data.orderId;

    // 3. Verify customer shopping cart still contains cement bags (NOT CLEARED)
    const cartRes = await request(app)
      .get('/api/cart')
      .set('Authorization', `Bearer ${customerToken}`);
    assert.strictEqual(cartRes.status, 200);
    assert.strictEqual(cartRes.body.data.items.length, 1);
    assert.strictEqual(cartRes.body.data.items[0].product_id, cementProductId);
    assert.strictEqual(cartRes.body.data.items[0].quantity, 5); // MOQ for cement is 5 bags

    // 4. Verify order & delivery persistence in MySQL
    const [orderRows] = await pool.query('SELECT * FROM orders WHERE id = ?', [buyNowOrderId]);
    assert.strictEqual(orderRows.length, 1);
    assert.strictEqual(Number(orderRows[0].unloading_fee), 1200);

    const [delRows] = await pool.query('SELECT * FROM deliveries WHERE order_id = ?', [buyNowOrderId]);
    assert.strictEqual(delRows.length, 1);
    assert.strictEqual(delRows[0].time_slot, '08:00 AM - 12:00 PM');
    assert.strictEqual(delRows[0].unloading_preference, 'crane_handling');
    assert.strictEqual(Number(delRows[0].unloading_charge), 1200);
    assert.strictEqual(delRows[0].site_contact_name, 'Er. Rajesh Sharma (Chief Civil Eng)');
    assert.strictEqual(delRows[0].site_contact_phone, '9876500002');
    assert.strictEqual(delRows[0].site_landmark, 'Opposite Metro Pillar 142');

    // 5. Verify order is visible in Admin Deliveries list with complete logistics metadata
    const adminDelRes = await request(app)
      .get('/api/deliveries?search=201301')
      .set('Authorization', `Bearer ${adminToken}`);
    assert.strictEqual(adminDelRes.status, 200);
    const foundDel = adminDelRes.body.data.deliveries.find(d => d.orderId === buyNowOrderId);
    assert.ok(foundDel);
    assert.strictEqual(foundDel.timeSlot, '08:00 AM - 12:00 PM');
    assert.strictEqual(foundDel.unloadingPreference, 'crane_handling');
    assert.strictEqual(foundDel.siteContactName, 'Er. Rajesh Sharma (Chief Civil Eng)');
  });
});

