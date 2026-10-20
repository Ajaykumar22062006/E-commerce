import test from 'node:test';
import assert from 'node:assert';
import request from 'supertest';
import app from '../src/app.js';
import pool from '../src/config/db.js';

test('AUTH SUITE: Registration, Login & Role Authorization', async (t) => {
  const timestamp = Date.now();
  const testCustomerEmail = `testuser_${timestamp}@example.com`;
  const testPassword = 'Password123!';
  let customerToken = '';
  let adminToken = '';

  await t.test('1. Should register a new customer successfully', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({
        full_name: 'Test Customer',
        email: testCustomerEmail,
        password: testPassword,
        phone: '+91 99999 88888',
        role: 'customer'
      });

    assert.strictEqual(res.status, 201);
    assert.strictEqual(res.body.success, true);
    assert.ok(res.body.data.token);
    assert.strictEqual(res.body.data.user.email, testCustomerEmail);
    customerToken = res.body.data.token;
  });

  await t.test('2. Should reject duplicate email registration', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({
        full_name: 'Duplicate Customer',
        email: testCustomerEmail,
        password: testPassword
      });

    assert.strictEqual(res.status, 409);
    assert.strictEqual(res.body.success, false);
  });

  await t.test('3. Should login customer with valid credentials', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({
        email: testCustomerEmail,
        password: testPassword
      });

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.success, true);
    assert.ok(res.body.data.token);
    customerToken = res.body.data.token;
  });

  await t.test('4. Should reject login with invalid password', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({
        email: testCustomerEmail,
        password: 'WrongPassword999'
      });

    assert.strictEqual(res.status, 401);
    assert.strictEqual(res.body.success, false);
  });

  await t.test('5. Should retrieve current customer profile with JWT token', async () => {
    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${customerToken}`);

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.success, true);
    assert.strictEqual(res.body.data.user.email, testCustomerEmail);
  });

  await t.test('6. Should login administrator and allow access to admin routes', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'admin@buildmart.com',
        password: 'Admin@BuildMart2026!'
      });

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.success, true);
    assert.strictEqual(res.body.data.user.role, 'admin');
    adminToken = res.body.data.token;

    // Check admin dashboard
    const dashRes = await request(app)
      .get('/api/admin/dashboard')
      .set('Authorization', `Bearer ${adminToken}`);

    assert.strictEqual(dashRes.status, 200);
    assert.strictEqual(dashRes.body.success, true);
    assert.ok(dashRes.body.data.totalProducts > 0);
  });

  await t.test('7. Should deny non-admin customer access to admin routes (403 Forbidden)', async () => {
    const res = await request(app)
      .get('/api/admin/dashboard')
      .set('Authorization', `Bearer ${customerToken}`);

    assert.strictEqual(res.status, 403);
    assert.strictEqual(res.body.success, false);
  });
});
