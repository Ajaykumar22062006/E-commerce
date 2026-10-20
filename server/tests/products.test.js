import test from 'node:test';
import assert from 'node:assert';
import request from 'supertest';
import app from '../src/app.js';

test('PRODUCTS SUITE: Categories, Product Catalog, Search & Pincode Rules', async (t) => {
  await t.test('1. Should list all active construction categories', async () => {
    const res = await request(app).get('/api/categories');
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.success, true);
    assert.ok(Array.isArray(res.body.data));
    assert.ok(res.body.data.length >= 10);
  });

  await t.test('2. Should list products with pagination and category filter', async () => {
    const res = await request(app).get('/api/products?category=cement');
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.success, true);
    assert.ok(Array.isArray(res.body.data.products));
    assert.ok(res.body.data.products.length > 0);
    assert.strictEqual(res.body.data.products[0].category_slug, 'cement');
  });

  await t.test('3. Should search products by keyword "TMT"', async () => {
    const res = await request(app).get('/api/products?search=TMT');
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.success, true);
    assert.ok(res.body.data.products.length > 0);
  });

  await t.test('4. Should get product details by slug with specifications and images', async () => {
    const res = await request(app).get('/api/products/ultratech-super-opc-53-grade-cement-50kg');
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.success, true);
    assert.strictEqual(res.body.data.sku, 'CEM-ULT-53-01');
    assert.ok(Array.isArray(res.body.data.images));
    assert.ok(res.body.data.images.length > 0);
  });

  await t.test('5. Should check serviceable delivery PIN code (201301 - Noida)', async () => {
    const res = await request(app).get('/api/service-areas/check/201301');
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.success, true);
    assert.strictEqual(res.body.serviceable, true);
    assert.strictEqual(res.body.data.city, 'Noida');
  });

  await t.test('6. Should identify non-serviceable PIN code', async () => {
    const res = await request(app).get('/api/service-areas/check/999999');
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.serviceable, false);
  });
});
