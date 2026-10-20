import bcrypt from 'bcryptjs';
import pool from '../config/db.js';
import { categoriesData, serviceAreasData, couponsData, productsData } from './seedData.js';

export async function seedDatabase() {
  console.log('🌱 Starting BuildMart database seeding...');
  const conn = await pool.getConnection();

  try {
    await conn.beginTransaction();

    // 1. Seed Users
    console.log('Inserting default users...');
    const adminPassHash = await bcrypt.hash('Admin@BuildMart2026!', 10);
    const contractorPassHash = await bcrypt.hash('Contractor@2026!', 10);
    const customerPassHash = await bcrypt.hash('Customer@2026!', 10);

    const users = [
      {
        full_name: 'BuildMart Administrator',
        email: 'admin@buildmart.com',
        password_hash: adminPassHash,
        phone: '+91 98765 00001',
        role: 'admin',
        company_name: 'BuildMart HQ Logistics',
        gstin: '07AAACB1234F1Z1'
      },
      {
        full_name: 'Rajesh Sharma',
        email: 'contractor@sharma-constructions.com',
        password_hash: contractorPassHash,
        phone: '+91 98111 22334',
        role: 'contractor',
        company_name: 'Sharma Civil & Infrastructure Ltd',
        gstin: '07AAAAA0000A1Z5'
      },
      {
        full_name: 'Ananya Verma',
        email: 'customer@example.com',
        password_hash: customerPassHash,
        phone: '+91 98222 33445',
        role: 'customer',
        company_name: null,
        gstin: null
      },
      {
        full_name: 'Suresh Kumar',
        email: 'delivery@buildmart.com',
        password_hash: await bcrypt.hash('Delivery@2026!', 10),
        phone: '+91 98450 12345',
        role: 'delivery_personnel',
        company_name: 'BuildMart Fleet Logistics',
        gstin: null
      },
      {
        full_name: 'Ramesh Yadav',
        email: 'driver2@buildmart.com',
        password_hash: await bcrypt.hash('Delivery@2026!', 10),
        phone: '+91 98450 67890',
        role: 'delivery_personnel',
        company_name: 'BuildMart Fleet Logistics',
        gstin: null
      }
    ];

    for (const u of users) {
      await conn.query(
        `INSERT INTO users (full_name, email, password_hash, phone, role, company_name, gstin)
         VALUES (?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE full_name = VALUES(full_name), password_hash = VALUES(password_hash), role = VALUES(role)`,
        [u.full_name, u.email, u.password_hash, u.phone, u.role, u.company_name, u.gstin]
      );
    }

    // Get user IDs
    const [adminRow] = await conn.query('SELECT id FROM users WHERE email = ?', ['admin@buildmart.com']);
    const [contractorRow] = await conn.query('SELECT id FROM users WHERE email = ?', ['contractor@sharma-constructions.com']);
    const [customerRow] = await conn.query('SELECT id FROM users WHERE email = ?', ['customer@example.com']);

    const contractorId = contractorRow[0].id;
    const customerId = customerRow[0].id;
    const adminId = adminRow[0].id;

    // 2. Seed Addresses
    console.log('Inserting default user addresses...');
    await conn.query('DELETE FROM addresses WHERE user_id IN (?, ?)', [contractorId, customerId]);
    await conn.query(
      `INSERT INTO addresses (user_id, label, recipient_name, phone, address_line1, address_line2, landmark, city, state, postal_code, is_default)
       VALUES 
       (?, 'Construction Site A', 'Rajesh Sharma (Site Eng)', '+91 98111 22334', 'Plot 42, Sector 62 Industrial Corridor', 'Near Metro Pillar 128', 'Opposite Tech Zone Park', 'Noida', 'Uttar Pradesh', '201301', 1),
       (?, 'Residence / Office', 'Ananya Verma', '+91 98222 33445', 'Flat 402, Green Valley Apartments', 'Kasturba Gandhi Marg', 'Near Barakhamba Road', 'New Delhi', 'Delhi', '110001', 1)`,
      [contractorId, customerId]
    );

    // 3. Seed Service Areas (PIN codes)
    console.log('Inserting delivery serviceable pincodes...');
    for (const sa of serviceAreasData) {
      await conn.query(
        `INSERT INTO delivery_service_areas (postal_code, area_name, city, state, is_serviceable, estimated_days, heavy_vehicle_allowed, standard_shipping_fee, free_delivery_threshold)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE area_name = VALUES(area_name), is_serviceable = VALUES(is_serviceable), standard_shipping_fee = VALUES(standard_shipping_fee)`,
        [sa.postal_code, sa.area_name, sa.city, sa.state, sa.is_serviceable, sa.estimated_days, sa.heavy_vehicle_allowed, sa.standard_shipping_fee, sa.free_delivery_threshold]
      );
    }

    // 4. Seed Coupons
    console.log('Inserting active coupons...');
    for (const c of couponsData) {
      await conn.query(
        `INSERT INTO coupons (code, description, discount_type, discount_value, min_order_amount, max_discount_amount, valid_from, valid_until, usage_limit, is_active)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE discount_value = VALUES(discount_value), min_order_amount = VALUES(min_order_amount), is_active = VALUES(is_active)`,
        [c.code, c.description, c.discount_type, c.discount_value, c.min_order_amount, c.max_discount_amount, c.valid_from, c.valid_until, c.usage_limit, c.is_active]
      );
    }

    // 5. Seed Categories
    console.log('Inserting categories...');
    for (const cat of categoriesData) {
      await conn.query(
        `INSERT INTO categories (name, slug, description, image_url, icon, display_order)
         VALUES (?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE description = VALUES(description), image_url = VALUES(image_url), display_order = VALUES(display_order)`,
        [cat.name, cat.slug, cat.description, cat.image_url, cat.icon, cat.display_order]
      );
    }

    // Retrieve category ID mapping
    const [categoryRows] = await conn.query('SELECT id, slug FROM categories');
    const categoryMap = {};
    for (const row of categoryRows) {
      categoryMap[row.slug] = row.id;
    }

    // 6. Seed Products & Images & Inventory movements
    console.log('Inserting products, images, and inventory records...');
    for (const p of productsData) {
      const categoryId = categoryMap[p.category_slug];
      if (!categoryId) continue;

      const [existingProd] = await conn.query('SELECT id, stock_quantity FROM products WHERE sku = ?', [p.sku]);
      let productId;

      if (existingProd.length > 0) {
        productId = existingProd[0].id;
        await conn.query(
          `UPDATE products SET 
            category_id = ?, name = ?, slug = ?, brand = ?, description = ?, unit_of_measure = ?,
            unit_price = ?, discount_percent = ?, stock_quantity = ?, low_stock_threshold = ?,
            min_order_quantity = ?, volume_discount_threshold = ?, volume_discount_percent = ?,
            is_heavy_bulk = ?, specifications = ?, rating = ?, review_count = ?
           WHERE id = ?`,
          [
            categoryId, p.name, p.slug, p.brand, p.description, p.unit_of_measure,
            p.unit_price, p.discount_percent, p.stock_quantity, p.low_stock_threshold,
            p.min_order_quantity, p.volume_discount_threshold, p.volume_discount_percent,
            p.is_heavy_bulk, JSON.stringify(p.specifications), p.rating, p.review_count,
            productId
          ]
        );
      } else {
        const [insertResult] = await conn.query(
          `INSERT INTO products (
            category_id, name, slug, sku, brand, description, unit_of_measure,
            unit_price, discount_percent, stock_quantity, low_stock_threshold,
            min_order_quantity, volume_discount_threshold, volume_discount_percent,
            is_heavy_bulk, specifications, rating, review_count
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            categoryId, p.name, p.slug, p.sku, p.brand, p.description, p.unit_of_measure,
            p.unit_price, p.discount_percent, p.stock_quantity, p.low_stock_threshold,
            p.min_order_quantity, p.volume_discount_threshold, p.volume_discount_percent,
            p.is_heavy_bulk, JSON.stringify(p.specifications), p.rating, p.review_count
          ]
        );
        productId = insertResult.insertId;

        // Record initial inventory movement
        await conn.query(
          `INSERT INTO inventory_movements (product_id, change_quantity, previous_stock, new_stock, movement_type, reference_type, reason, created_by)
           VALUES (?, ?, ?, ?, 'restock', 'admin', 'Initial warehouse baseline stock', 'System Initializer')`,
          [productId, p.stock_quantity, 0, p.stock_quantity]
        );
      }

      // Insert product images
      await conn.query('DELETE FROM product_images WHERE product_id = ?', [productId]);
      if (p.images && p.images.length > 0) {
        for (let idx = 0; idx < p.images.length; idx++) {
          await conn.query(
            `INSERT INTO product_images (product_id, image_url, alt_text, is_primary, sort_order)
             VALUES (?, ?, ?, ?, ?)`,
            [productId, p.images[idx], `${p.name} photo ${idx + 1}`, idx === 0 ? 1 : 0, idx]
          );
        }
      }
    }

    // 7. Seed Sample Reviews
    console.log('Inserting verified customer reviews...');
    const [cementProduct] = await conn.query('SELECT id FROM products WHERE sku = ?', ['CEM-ULT-53-01']);
    const [steelProduct] = await conn.query('SELECT id FROM products WHERE sku = ?', ['STL-TAT-12MM-01']);
    
    if (cementProduct.length > 0 && steelProduct.length > 0) {
      await conn.query('DELETE FROM reviews WHERE product_id IN (?, ?)', [cementProduct[0].id, steelProduct[0].id]);
      await conn.query(
        `INSERT INTO reviews (product_id, user_id, rating, title, comment, is_verified_purchase)
         VALUES 
         (?, ?, 5, 'Exceptional compressive strength for slab casting', 'Delivered within 24 hours to our Noida construction site. Fresh batch manufactured this month. Very satisfied with BuildMart logistics.', 1),
         (?, ?, 5, 'Genuine Tata Tiscon bars with test certificates', 'Tested in civil lab, bend test and yield strength passed with flying colors. Rebar ribbed profile is sharp and rust-free.', 1)`,
        [cementProduct[0].id, contractorId, steelProduct[0].id, contractorId]
      );
    }

    // 8. Seed Delivery Vehicles
    console.log('Inserting delivery vehicles...');
    await conn.query(`
      INSERT INTO delivery_vehicles (id, vehicle_number, vehicle_type, capacity_tonnes, driver_name, driver_phone, is_active)
      VALUES 
      (1, 'DL-01-AX-4421', 'tipper_truck', 5.50, 'Suresh Kumar', '+91 98450 12345', 1),
      (2, 'UP-16-BZ-8812', 'flatbed_trailer', 12.00, 'Ramesh Yadav', '+91 98450 67890', 1),
      (3, 'HR-26-CM-3309', 'mini_truck', 2.50, 'Vikram Singh', '+91 98450 11223', 1)
      ON DUPLICATE KEY UPDATE 
        vehicle_type = VALUES(vehicle_type),
        capacity_tonnes = VALUES(capacity_tonnes),
        driver_name = VALUES(driver_name),
        driver_phone = VALUES(driver_phone)
    `);

    // 9. Seed Representative Orders & Deliveries
    console.log('Inserting sample construction orders and deliveries...');
    const [delPersonRows] = await conn.query("SELECT id, full_name, phone FROM users WHERE role = 'delivery_personnel'");
    const driver1Id = delPersonRows[0]?.id || null;
    const driver2Id = delPersonRows[1]?.id || driver1Id;

    const sampleOrders = [
      {
        order_number: 'BM-20261016-D101',
        user_id: contractorId,
        subtotal: 19800.00,
        delivery_fee: 0.00,
        tax_amount: 3564.00,
        total_amount: 23364.00,
        payment_method: 'cod',
        payment_status: 'pending',
        order_status: 'confirmed',
        delivery_status: 'pending_assignment',
        delivery_number: 'DEL-20261016-D101',
        delivery_person_id: null,
        vehicle_id: null,
        expected_delivery_date: '2026-10-18',
        failure_reason: null,
        failure_count: 0,
        notes: 'Site gate 3 entry for tipper truck.'
      },
      {
        order_number: 'BM-20261016-D202',
        user_id: contractorId,
        subtotal: 42500.00,
        delivery_fee: 0.00,
        tax_amount: 7650.00,
        total_amount: 50150.00,
        payment_method: 'razorpay',
        payment_status: 'paid',
        order_status: 'confirmed',
        delivery_status: 'assigned',
        delivery_number: 'DEL-20261016-D202',
        delivery_person_id: driver1Id,
        vehicle_id: 1,
        expected_delivery_date: '2026-10-17',
        failure_reason: null,
        failure_count: 0,
        notes: 'Assigned to Suresh Kumar with Tipper DL-01-AX-4421'
      },
      {
        order_number: 'BM-20261016-D303',
        user_id: customerId,
        subtotal: 7800.00,
        delivery_fee: 250.00,
        tax_amount: 1404.00,
        total_amount: 9454.00,
        payment_method: 'cod',
        payment_status: 'pending',
        order_status: 'processing',
        delivery_status: 'preparing',
        delivery_number: 'DEL-20261016-D303',
        delivery_person_id: driver1Id,
        vehicle_id: 3,
        expected_delivery_date: '2026-10-17',
        failure_reason: null,
        failure_count: 0,
        notes: 'Materials being batched at Central Logistics Warehouse'
      },
      {
        order_number: 'BM-20261016-D404',
        user_id: contractorId,
        subtotal: 68000.00,
        delivery_fee: 0.00,
        tax_amount: 12240.00,
        total_amount: 80240.00,
        payment_method: 'razorpay',
        payment_status: 'paid',
        order_status: 'shipped',
        delivery_status: 'dispatched',
        delivery_number: 'DEL-20261016-D404',
        delivery_person_id: driver2Id,
        vehicle_id: 2,
        expected_delivery_date: '2026-10-16',
        failure_reason: null,
        failure_count: 0,
        notes: 'Dispatched from Noida Yard on Flatbed Trailer UP-16-BZ-8812'
      },
      {
        order_number: 'BM-20261016-D505',
        user_id: customerId,
        subtotal: 12400.00,
        delivery_fee: 0.00,
        tax_amount: 2232.00,
        total_amount: 14632.00,
        payment_method: 'cod',
        payment_status: 'pending',
        order_status: 'shipped',
        delivery_status: 'out_for_delivery',
        delivery_number: 'DEL-20261016-D505',
        delivery_person_id: driver1Id,
        vehicle_id: 1,
        expected_delivery_date: '2026-10-16',
        failure_reason: null,
        failure_count: 0,
        notes: 'Driver en route to Connaught Place delivery site'
      },
      {
        order_number: 'BM-20261016-D606',
        user_id: contractorId,
        subtotal: 35000.00,
        delivery_fee: 0.00,
        tax_amount: 6300.00,
        total_amount: 41300.00,
        payment_method: 'cod',
        payment_status: 'paid',
        order_status: 'delivered',
        delivery_status: 'delivered',
        delivery_number: 'DEL-20261016-D606',
        delivery_person_id: driver2Id,
        vehicle_id: 2,
        expected_delivery_date: '2026-10-15',
        failure_reason: null,
        failure_count: 0,
        notes: 'Delivered and verified by Site In-charge with signed delivery challan'
      },
      {
        order_number: 'BM-20261016-D707',
        user_id: customerId,
        subtotal: 4800.00,
        delivery_fee: 200.00,
        tax_amount: 864.00,
        total_amount: 5864.00,
        payment_method: 'cod',
        payment_status: 'pending',
        order_status: 'confirmed',
        delivery_status: 'failed',
        delivery_number: 'DEL-20261016-D707',
        delivery_person_id: driver1Id,
        vehicle_id: 3,
        expected_delivery_date: '2026-10-15',
        failure_reason: 'Site gate locked; security denied heavy vehicle entry outside 8 AM - 6 PM',
        failure_count: 1,
        notes: 'Attempted delivery at 18:45. Redelivery coordination requested.'
      }
    ];

    const [siteAddresses] = await conn.query('SELECT * FROM addresses WHERE user_id = ? LIMIT 1', [contractorId]);
    const siteAddress = siteAddresses[0] || {
      recipient_name: 'Rajesh Sharma (Site Eng)',
      phone: '+91 98111 22334',
      address_line1: 'Plot 42, Sector 62 Industrial Corridor',
      city: 'Noida',
      state: 'Uttar Pradesh',
      postal_code: '201301'
    };

    for (const ord of sampleOrders) {
      await conn.query(`
        INSERT INTO orders (
          order_number, user_id, shipping_address_snapshot, subtotal, discount_amount,
          tax_amount, delivery_fee, total_amount, payment_method, payment_status,
          order_status, notes
        ) VALUES (?, ?, ?, ?, 0.00, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE order_status = VALUES(order_status), payment_status = VALUES(payment_status)
      `, [
        ord.order_number, ord.user_id, JSON.stringify(siteAddress), ord.subtotal,
        ord.tax_amount, ord.delivery_fee, ord.total_amount, ord.payment_method,
        ord.payment_status, ord.order_status, ord.notes
      ]);

      const [oRow] = await conn.query('SELECT id FROM orders WHERE order_number = ?', [ord.order_number]);
      const oId = oRow[0].id;

      // Ensure order items
      const [existingOi] = await conn.query('SELECT id FROM order_items WHERE order_id = ?', [oId]);
      if (existingOi.length === 0 && cementProduct.length > 0) {
        await conn.query(`
          INSERT INTO order_items (order_id, product_id, product_name, sku, unit_of_measure, unit_price, effective_price, quantity, total_line_price)
          VALUES (?, ?, 'UltraTech Super OPC 53 Grade Cement (50kg)', 'CEM-ULT-53-01', 'bag (50kg)', 420.00, 420.00, 20, 8400.00)
        `, [oId, cementProduct[0].id]);
      }

      // Upsert delivery
      await conn.query(`
        INSERT INTO deliveries (
          delivery_number, order_id, delivery_person_id, vehicle_id,
          status, expected_delivery_date, failure_reason, failure_count, delivery_notes
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE 
          delivery_person_id = VALUES(delivery_person_id),
          vehicle_id = VALUES(vehicle_id),
          status = VALUES(status),
          expected_delivery_date = VALUES(expected_delivery_date),
          failure_reason = VALUES(failure_reason),
          failure_count = VALUES(failure_count),
          delivery_notes = VALUES(delivery_notes)
      `, [
        ord.delivery_number, oId, ord.delivery_person_id, ord.vehicle_id,
        ord.delivery_status, ord.expected_delivery_date, ord.failure_reason,
        ord.failure_count, ord.notes
      ]);

      const [delRow] = await conn.query('SELECT id FROM deliveries WHERE order_id = ?', [oId]);
      if (delRow.length > 0) {
        const delId = delRow[0].id;
        const [histRows] = await conn.query('SELECT id FROM delivery_status_history WHERE delivery_id = ?', [delId]);
        if (histRows.length === 0) {
          await conn.query(`
            INSERT INTO delivery_status_history (delivery_id, from_status, to_status, notes, reason, changed_by_name)
            VALUES (?, NULL, ?, ?, ?, 'System')
          `, [delId, ord.delivery_status, ord.notes, ord.failure_reason]);
        }
      }
    }


    await conn.commit();
    console.log('✅ Database seeded successfully with realistic civil construction materials data!');
  } catch (error) {
    await conn.rollback();
    console.error('❌ Database seeding error:', error);
    throw error;
  } finally {
    conn.release();
  }
}

// Allow standalone execution: node src/database/seed.js
seedDatabase()
  .then(() => {
    console.log('Seed execution completed.');
    process.exit(0);
  })
  .catch((err) => {
    console.error('Seed execution failed:', err);
    process.exit(1);
  });
