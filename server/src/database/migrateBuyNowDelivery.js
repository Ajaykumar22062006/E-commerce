import pool from '../config/db.js';

async function migrate() {
  const conn = await pool.getConnection();
  try {
    console.log('Running Buy Now delivery booking schema migration...');
    const [delCols] = await conn.query('DESCRIBE deliveries');
    const existingDel = delCols.map(c => c.Field);
    
    if (!existingDel.includes('preferred_delivery_date')) {
      await conn.query('ALTER TABLE deliveries ADD COLUMN preferred_delivery_date DATE DEFAULT NULL AFTER expected_delivery_date');
      console.log('Added preferred_delivery_date to deliveries');
    }
    if (!existingDel.includes('time_slot')) {
      await conn.query('ALTER TABLE deliveries ADD COLUMN time_slot VARCHAR(60) DEFAULT NULL AFTER preferred_delivery_date');
      console.log('Added time_slot to deliveries');
    }
    if (!existingDel.includes('unloading_preference')) {
      await conn.query("ALTER TABLE deliveries ADD COLUMN unloading_preference ENUM('customer_arranged', 'hydraulic_tipper', 'manual_labor', 'crane_handling') DEFAULT 'customer_arranged' AFTER time_slot");
      console.log('Added unloading_preference to deliveries');
    }
    if (!existingDel.includes('unloading_charge')) {
      await conn.query('ALTER TABLE deliveries ADD COLUMN unloading_charge DECIMAL(10,2) NOT NULL DEFAULT 0.00 AFTER unloading_preference');
      console.log('Added unloading_charge to deliveries');
    }
    if (!existingDel.includes('site_contact_name')) {
      await conn.query('ALTER TABLE deliveries ADD COLUMN site_contact_name VARCHAR(100) DEFAULT NULL AFTER unloading_charge');
      console.log('Added site_contact_name to deliveries');
    }
    if (!existingDel.includes('site_contact_phone')) {
      await conn.query('ALTER TABLE deliveries ADD COLUMN site_contact_phone VARCHAR(20) DEFAULT NULL AFTER site_contact_name');
      console.log('Added site_contact_phone to deliveries');
    }
    if (!existingDel.includes('site_landmark')) {
      await conn.query('ALTER TABLE deliveries ADD COLUMN site_landmark VARCHAR(150) DEFAULT NULL AFTER site_contact_phone');
      console.log('Added site_landmark to deliveries');
    }
    if (!existingDel.includes('site_access_instructions')) {
      await conn.query('ALTER TABLE deliveries ADD COLUMN site_access_instructions TEXT DEFAULT NULL AFTER site_landmark');
      console.log('Added site_access_instructions to deliveries');
    }
    if (!existingDel.includes('rescheduled_date')) {
      await conn.query('ALTER TABLE deliveries ADD COLUMN rescheduled_date DATE DEFAULT NULL AFTER failure_reason');
      console.log('Added rescheduled_date to deliveries');
    }

    const [ordCols] = await conn.query('DESCRIBE orders');
    const existingOrd = ordCols.map(c => c.Field);
    if (!existingOrd.includes('unloading_fee')) {
      await conn.query('ALTER TABLE orders ADD COLUMN unloading_fee DECIMAL(10,2) NOT NULL DEFAULT 0.00 AFTER delivery_fee');
      console.log('Added unloading_fee to orders');
    }

    console.log('✅ Migration finished successfully.');
  } catch (err) {
    console.error('Migration error:', err);
    process.exit(1);
  } finally {
    conn.release();
    process.exit(0);
  }
}

migrate();
