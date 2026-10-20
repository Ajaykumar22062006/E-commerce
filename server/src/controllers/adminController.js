import pool from '../config/db.js';
import logger from '../utils/logger.js';

export async function getDashboardStats(req, res, next) {
  try {
    // 1. Total Orders
    const [ordersCount] = await pool.query('SELECT COUNT(*) as count FROM orders');

    // 2. Total Products
    const [productsCount] = await pool.query('SELECT COUNT(*) as count FROM products WHERE is_active = 1');

    // 3. Registered Customers
    const [customersCount] = await pool.query("SELECT COUNT(*) as count FROM users WHERE role IN ('customer', 'contractor', 'builder')");

    // 4. Revenue from qualifying orders
    const [revenueRow] = await pool.query(`
      SELECT COALESCE(SUM(total_amount), 0) as revenue
      FROM orders
      WHERE payment_status = 'paid' OR (payment_method = 'cod' AND order_status IN ('confirmed', 'processing', 'shipped', 'delivered'))
    `);

    // 5. Pending Orders
    const [pendingOrders] = await pool.query("SELECT COUNT(*) as count FROM orders WHERE order_status = 'pending'");

    // 6. Low stock products count & items
    const [lowStockProducts] = await pool.query(`
      SELECT p.id, p.name, p.sku, p.stock_quantity, p.low_stock_threshold, p.unit_of_measure, c.name as category_name
      FROM products p
      JOIN categories c ON p.category_id = c.id
      WHERE p.is_active = 1 AND p.stock_quantity <= p.low_stock_threshold
      ORDER BY p.stock_quantity ASC
      LIMIT 10
    `);

    // 7. Recent Orders
    const [recentOrders] = await pool.query(`
      SELECT o.id, o.order_number, o.total_amount, o.payment_method, o.payment_status, o.order_status, o.created_at,
             u.full_name as customer_name, u.email as customer_email, u.role as customer_role
      FROM orders o
      JOIN users u ON o.user_id = u.id
      ORDER BY o.created_at DESC
      LIMIT 8
    `);

    // 8. 7-Day sales breakdown
    const [salesTrends] = await pool.query(`
      SELECT 
        DATE(created_at) as sale_date,
        COUNT(*) as order_count,
        COALESCE(SUM(total_amount), 0) as total_sales
      FROM orders
      WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)
        AND order_status != 'cancelled'
      GROUP BY DATE(created_at)
      ORDER BY sale_date ASC
    `);

    // 9. Bulk Inquiries count
    const [inquiriesPending] = await pool.query("SELECT COUNT(*) as count FROM bulk_inquiries WHERE status = 'submitted'");

    res.json({
      success: true,
      data: {
        totalOrders: ordersCount[0].count,
        totalProducts: productsCount[0].count,
        registeredCustomers: customersCount[0].count,
        totalRevenue: parseFloat(revenueRow[0].revenue),
        pendingOrders: pendingOrders[0].count,
        pendingInquiries: inquiriesPending[0].count,
        lowStockCount: lowStockProducts.length,
        lowStockProducts,
        recentOrders,
        salesTrends
      }
    });
  } catch (error) {
    next(error);
  }
}

// Product Management
export async function createProduct(req, res, next) {
  try {
    const {
      category_id,
      name,
      slug,
      sku,
      brand,
      description,
      unit_of_measure = 'piece',
      unit_price,
      discount_percent = 0,
      stock_quantity = 0,
      low_stock_threshold = 10,
      min_order_quantity = 1,
      volume_discount_threshold,
      volume_discount_percent = 0,
      is_heavy_bulk = 0,
      specifications,
      images = []
    } = req.body;

    if (!category_id || !name || !sku || !unit_price) {
      return res.status(400).json({ success: false, message: 'Category, name, SKU, and unit price are required.' });
    }

    const productSlug = slug || name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();

      const [result] = await conn.query(
        `INSERT INTO products (
          category_id, name, slug, sku, brand, description, unit_of_measure,
          unit_price, discount_percent, stock_quantity, low_stock_threshold,
          min_order_quantity, volume_discount_threshold, volume_discount_percent,
          is_heavy_bulk, specifications
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          category_id,
          name.trim(),
          productSlug,
          sku.trim().toUpperCase(),
          brand ? brand.trim() : null,
          description ? description.trim() : '',
          unit_of_measure,
          parseFloat(unit_price),
          parseFloat(discount_percent) || 0,
          parseInt(stock_quantity, 10) || 0,
          parseInt(low_stock_threshold, 10) || 10,
          parseInt(min_order_quantity, 10) || 1,
          volume_discount_threshold ? parseInt(volume_discount_threshold, 10) : null,
          parseFloat(volume_discount_percent) || 0,
          is_heavy_bulk ? 1 : 0,
          specifications ? JSON.stringify(specifications) : null
        ]
      );

      const productId = result.insertId;

      // Insert images
      if (Array.isArray(images) && images.length > 0) {
        for (let i = 0; i < images.length; i++) {
          const imgUrl = typeof images[i] === 'string' ? images[i] : images[i].image_url;
          if (imgUrl) {
            await conn.query(
              `INSERT INTO product_images (product_id, image_url, alt_text, is_primary, sort_order)
               VALUES (?, ?, ?, ?, ?)`,
              [productId, imgUrl, `${name} photo`, i === 0 ? 1 : 0, i]
            );
          }
        }
      }

      // Initial inventory movement
      if (stock_quantity > 0) {
        await conn.query(
          `INSERT INTO inventory_movements (product_id, change_quantity, previous_stock, new_stock, movement_type, reference_type, reason, created_by)
           VALUES (?, ?, 0, ?, 'restock', 'admin', 'Initial stock entry', ?)`,
          [productId, stock_quantity, stock_quantity, req.user.email]
        );
      }

      await conn.commit();

      logger.audit('ADMIN_PRODUCT_CREATED', req.user.email, { productId, name, sku });

      res.status(201).json({
        success: true,
        message: 'Product created successfully.',
        data: { id: productId, name, sku }
      });
    } catch (e) {
      await conn.rollback();
      throw e;
    } finally {
      conn.release();
    }
  } catch (error) {
    next(error);
  }
}

export async function updateProduct(req, res, next) {
  try {
    const { id } = req.params;
    const {
      category_id,
      name,
      brand,
      description,
      unit_of_measure,
      unit_price,
      discount_percent,
      stock_quantity,
      low_stock_threshold,
      min_order_quantity,
      volume_discount_threshold,
      volume_discount_percent,
      is_heavy_bulk,
      is_active,
      specifications,
      images
    } = req.body;

    const [existing] = await pool.query('SELECT * FROM products WHERE id = ?', [id]);
    if (existing.length === 0) {
      return res.status(404).json({ success: false, message: 'Product not found.' });
    }

    const current = existing[0];

    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();

      await conn.query(
        `UPDATE products SET
          category_id = COALESCE(?, category_id),
          name = COALESCE(?, name),
          brand = COALESCE(?, brand),
          description = COALESCE(?, description),
          unit_of_measure = COALESCE(?, unit_of_measure),
          unit_price = COALESCE(?, unit_price),
          discount_percent = COALESCE(?, discount_percent),
          low_stock_threshold = COALESCE(?, low_stock_threshold),
          min_order_quantity = COALESCE(?, min_order_quantity),
          volume_discount_threshold = ?,
          volume_discount_percent = COALESCE(?, volume_discount_percent),
          is_heavy_bulk = COALESCE(?, is_heavy_bulk),
          is_active = COALESCE(?, is_active),
          specifications = COALESCE(?, specifications)
         WHERE id = ?`,
        [
          category_id,
          name,
          brand,
          description,
          unit_of_measure,
          unit_price,
          discount_percent,
          low_stock_threshold,
          min_order_quantity,
          volume_discount_threshold !== undefined ? volume_discount_threshold : current.volume_discount_threshold,
          volume_discount_percent,
          is_heavy_bulk,
          is_active,
          specifications ? JSON.stringify(specifications) : null,
          id
        ]
      );

      // If stock quantity was explicitly changed, record movement
      if (stock_quantity !== undefined && parseInt(stock_quantity, 10) !== current.stock_quantity) {
        const newStock = parseInt(stock_quantity, 10);
        const diff = newStock - current.stock_quantity;

        await conn.query('UPDATE products SET stock_quantity = ? WHERE id = ?', [newStock, id]);

        await conn.query(
          `INSERT INTO inventory_movements (product_id, change_quantity, previous_stock, new_stock, movement_type, reference_type, reason, created_by)
           VALUES (?, ?, ?, ?, 'manual_adjustment', 'admin', 'Manual stock update from admin edit', ?)`,
          [id, diff, current.stock_quantity, newStock, req.user.email]
        );
      }

      // Update images if provided
      if (Array.isArray(images) && images.length > 0) {
        await conn.query('DELETE FROM product_images WHERE product_id = ?', [id]);
        for (let i = 0; i < images.length; i++) {
          const imgUrl = typeof images[i] === 'string' ? images[i] : images[i].image_url;
          if (imgUrl) {
            await conn.query(
              `INSERT INTO product_images (product_id, image_url, alt_text, is_primary, sort_order)
               VALUES (?, ?, ?, ?, ?)`,
              [id, imgUrl, `${name || current.name} photo`, i === 0 ? 1 : 0, i]
            );
          }
        }
      }

      await conn.commit();

      logger.audit('ADMIN_PRODUCT_UPDATED', req.user.email, { productId: id });

      res.json({
        success: true,
        message: 'Product updated successfully.'
      });
    } catch (e) {
      await conn.rollback();
      throw e;
    } finally {
      conn.release();
    }
  } catch (error) {
    next(error);
  }
}

export async function deleteProduct(req, res, next) {
  try {
    const { id } = req.params;

    // Check if product is in any orders
    const [orderRows] = await pool.query('SELECT COUNT(*) as cnt FROM order_items WHERE product_id = ?', [id]);

    if (orderRows[0].cnt > 0) {
      // Soft-delete to preserve order history integrity
      await pool.query('UPDATE products SET is_active = 0 WHERE id = ?', [id]);
      return res.json({
        success: true,
        message: 'Product was soft-deactivated to preserve historical order records.'
      });
    }

    await pool.query('DELETE FROM products WHERE id = ?', [id]);
    logger.audit('ADMIN_PRODUCT_DELETED', req.user.email, { productId: id });

    res.json({
      success: true,
      message: 'Product deleted permanently.'
    });
  } catch (error) {
    next(error);
  }
}

// Order Management (Admin)
export async function getAdminOrders(req, res, next) {
  try {
    const { status, search, page = 1, limit = 15 } = req.query;
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(50, Math.max(1, parseInt(limit, 10) || 15));
    const offset = (pageNum - 1) * limitNum;

    const whereClauses = [];
    const params = [];

    if (status && status !== 'all') {
      whereClauses.push('o.order_status = ?');
      params.push(status);
    }

    if (search && search.trim()) {
      whereClauses.push('(o.order_number LIKE ? OR u.full_name LIKE ? OR u.email LIKE ?)');
      const st = `%${search.trim()}%`;
      params.push(st, st, st);
    }

    const whereSQL = whereClauses.length ? `WHERE ${whereClauses.join(' AND ')}` : '';

    const [countRows] = await pool.query(
      `SELECT COUNT(*) as total FROM orders o JOIN users u ON o.user_id = u.id ${whereSQL}`,
      params
    );
    const total = countRows[0].total;

    const [orders] = await pool.query(
      `SELECT 
        o.id, o.order_number, o.subtotal, o.discount_amount, o.delivery_fee, o.tax_amount, o.total_amount,
        o.payment_method, o.payment_status, o.order_status, o.created_at,
        u.id as customer_id, u.full_name as customer_name, u.email as customer_email, u.role as customer_role,
        (SELECT COUNT(*) FROM order_items oi WHERE oi.order_id = o.id) AS items_count
       FROM orders o
       JOIN users u ON o.user_id = u.id
       ${whereSQL}
       ORDER BY o.created_at DESC
       LIMIT ? OFFSET ?`,
      [...params, limitNum, offset]
    );

    res.json({
      success: true,
      data: {
        orders,
        pagination: {
          total,
          page: pageNum,
          limit: limitNum,
          totalPages: Math.ceil(total / limitNum)
        }
      }
    });
  } catch (error) {
    next(error);
  }
}

export async function updateOrderStatus(req, res, next) {
  try {
    const { id } = req.params;
    const { status, notes } = req.body;

    const validStatuses = ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Status must be one of: [${validStatuses.join(', ')}].`
      });
    }

    const [orders] = await pool.query('SELECT * FROM orders WHERE id = ?', [id]);
    if (orders.length === 0) {
      return res.status(404).json({ success: false, message: 'Order not found.' });
    }

    const order = orders[0];
    const prevStatus = order.order_status;

    // Status transition validation
    if (prevStatus === 'delivered' && status !== 'delivered') {
      return res.status(400).json({ success: false, message: 'Delivered orders cannot transition to an earlier status.' });
    }

    if (prevStatus === 'cancelled') {
      return res.status(400).json({ success: false, message: 'Cancelled orders cannot be reopened.' });
    }

    // If cancelling via admin, restore inventory
    if (status === 'cancelled' && prevStatus !== 'cancelled') {
      const [items] = await pool.query('SELECT product_id, quantity FROM order_items WHERE order_id = ?', [id]);
      for (const it of items) {
        const [prod] = await pool.query('SELECT stock_quantity FROM products WHERE id = ?', [it.product_id]);
        if (prod.length > 0) {
          const prevStock = prod[0].stock_quantity;
          const newStock = prevStock + it.quantity;
          await pool.query('UPDATE products SET stock_quantity = ? WHERE id = ?', [newStock, it.product_id]);
          await pool.query(
            `INSERT INTO inventory_movements (product_id, change_quantity, previous_stock, new_stock, movement_type, reference_type, reference_id, reason, created_by)
             VALUES (?, ?, ?, ?, 'order_cancellation_restore', 'admin', ?, 'Admin cancellation stock restore', ?)`,
            [it.product_id, it.quantity, prevStock, newStock, order.order_number, req.user.email]
          );
        }
      }
    }

    await pool.query('UPDATE orders SET order_status = ? WHERE id = ?', [status, id]);

    await pool.query(
      `INSERT INTO order_status_history (order_id, from_status, to_status, notes, changed_by)
       VALUES (?, ?, ?, ?, ?)`,
      [id, prevStatus, status, notes || `Status updated to ${status} by administrator`, req.user.email]
    );

    // Synchronize linked delivery consignment status if delivery exists
    const [delRows] = await pool.query('SELECT id, status FROM deliveries WHERE order_id = ?', [id]);
    if (delRows.length > 0) {
      const del = delRows[0];
      const oldDelStatus = del.status;
      let newDelStatus = null;
      const delNotes = notes || `Delivery status synchronized to ${status} by administrator`;

      if (status === 'delivered') {
        newDelStatus = 'delivered';
        await pool.query(
          `UPDATE deliveries 
           SET status = 'delivered', actual_delivery_date = COALESCE(actual_delivery_date, NOW())
           WHERE id = ?`,
          [del.id]
        );
        // Settle COD payment if pending
        if (order.payment_method === 'cod' && order.payment_status !== 'paid') {
          await pool.query("UPDATE orders SET payment_status = 'paid' WHERE id = ?", [id]);
          await pool.query("UPDATE payments SET status = 'paid' WHERE order_id = ?", [id]);
        }
      } else if (status === 'shipped' && ['pending_assignment', 'assigned', 'preparing'].includes(del.status)) {
        newDelStatus = 'dispatched';
        await pool.query("UPDATE deliveries SET status = 'dispatched' WHERE id = ?", [del.id]);
      } else if (status === 'processing' && ['pending_assignment', 'assigned'].includes(del.status)) {
        newDelStatus = 'preparing';
        await pool.query("UPDATE deliveries SET status = 'preparing' WHERE id = ?", [del.id]);
      } else if (status === 'cancelled') {
        newDelStatus = 'failed';
        await pool.query("UPDATE deliveries SET status = 'failed', failure_reason = 'Order cancelled' WHERE id = ?", [del.id]);
      }

      if (newDelStatus && newDelStatus !== oldDelStatus) {
        await pool.query(
          `INSERT INTO delivery_status_history (delivery_id, from_status, to_status, notes, reason, changed_by_user_id, changed_by_name)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [del.id, oldDelStatus, newDelStatus, delNotes, status === 'cancelled' ? 'Order cancelled' : null, req.user.id || null, req.user.full_name || req.user.email || 'Administrator']
        );
      }
    }

    logger.audit('ADMIN_ORDER_STATUS_UPDATED', req.user.email, { orderId: id, from: prevStatus, to: status });

    res.json({
      success: true,
      message: `Order #${order.order_number} status updated to ${status}.`
    });
  } catch (error) {
    next(error);
  }
}

// Bulk Inquiries Management (Admin)
export async function getAdminBulkInquiries(req, res, next) {
  try {
    const [rows] = await pool.query(`
      SELECT bi.*, p.name as product_name, p.unit_price as product_catalog_price, p.slug as product_slug
      FROM bulk_inquiries bi
      JOIN products p ON bi.product_id = p.id
      ORDER BY bi.created_at DESC
    `);

    res.json({
      success: true,
      data: rows
    });
  } catch (error) {
    next(error);
  }
}

export async function updateBulkInquiry(req, res, next) {
  try {
    const { id } = req.params;
    const { status, quoted_price_per_unit, admin_notes } = req.body;

    const [existing] = await pool.query('SELECT * FROM bulk_inquiries WHERE id = ?', [id]);
    if (existing.length === 0) {
      return res.status(404).json({ success: false, message: 'Bulk enquiry not found.' });
    }

    await pool.query(
      `UPDATE bulk_inquiries SET 
        status = COALESCE(?, status),
        quoted_price_per_unit = COALESCE(?, quoted_price_per_unit),
        admin_notes = COALESCE(?, admin_notes)
       WHERE id = ?`,
      [status, quoted_price_per_unit ? parseFloat(quoted_price_per_unit) : null, admin_notes, id]
    );

    logger.audit('ADMIN_BULK_INQUIRY_UPDATED', req.user.email, { inquiryId: id, status, quotedPrice: quoted_price_per_unit });

    res.json({
      success: true,
      message: 'Bulk enquiry updated.'
    });
  } catch (error) {
    next(error);
  }
}

// Customers Management (Admin)
export async function getCustomers(req, res, next) {
  try {
    const [rows] = await pool.query(`
      SELECT 
        u.id, u.full_name, u.email, u.phone, u.role, u.company_name, u.gstin, u.is_active, u.created_at,
        COUNT(o.id) as total_orders,
        COALESCE(SUM(o.total_amount), 0) as total_spend
      FROM users u
      LEFT JOIN orders o ON o.user_id = u.id AND o.order_status != 'cancelled'
      WHERE u.role != 'admin'
      GROUP BY u.id
      ORDER BY u.created_at DESC
    `);

    res.json({
      success: true,
      data: rows
    });
  } catch (error) {
    next(error);
  }
}

export async function toggleCustomerStatus(req, res, next) {
  try {
    const { id } = req.params;
    const { is_active } = req.body;

    await pool.query("UPDATE users SET is_active = ? WHERE id = ? AND role != 'admin'", [is_active ? 1 : 0, id]);

    res.json({
      success: true,
      message: `Customer ${is_active ? 'activated' : 'deactivated'}.`
    });
  } catch (error) {
    next(error);
  }
}
