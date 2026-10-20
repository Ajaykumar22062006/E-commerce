import pool from '../config/db.js';
import logger from '../utils/logger.js';

export async function getInventory(req, res, next) {
  try {
    const { status, search, category } = req.query;

    const whereClauses = ['p.is_active = 1'];
    const params = [];

    if (status === 'low_stock') {
      whereClauses.push('p.stock_quantity <= p.low_stock_threshold AND p.stock_quantity > 0');
    } else if (status === 'out_of_stock') {
      whereClauses.push('p.stock_quantity = 0');
    }

    if (search && search.trim()) {
      whereClauses.push('(p.name LIKE ? OR p.sku LIKE ? OR p.brand LIKE ?)');
      const st = `%${search.trim()}%`;
      params.push(st, st, st);
    }

    if (category) {
      whereClauses.push('p.category_id = ?');
      params.push(category);
    }

    const whereSQL = whereClauses.length ? `WHERE ${whereClauses.join(' AND ')}` : '';

    const [items] = await pool.query(
      `SELECT 
        p.id, p.name, p.sku, p.brand, p.unit_of_measure, p.unit_price,
        p.stock_quantity, p.low_stock_threshold, p.is_heavy_bulk,
        c.name AS category_name,
        CASE 
          WHEN p.stock_quantity = 0 THEN 'OUT_OF_STOCK'
          WHEN p.stock_quantity <= p.low_stock_threshold THEN 'LOW_STOCK'
          ELSE 'IN_STOCK'
        END AS inventory_status
       FROM products p
       JOIN categories c ON p.category_id = c.id
       ${whereSQL}
       ORDER BY (p.stock_quantity <= p.low_stock_threshold) DESC, p.stock_quantity ASC`,
      params
    );

    res.json({
      success: true,
      data: items
    });
  } catch (error) {
    next(error);
  }
}

export async function adjustInventory(req, res, next) {
  try {
    const { product_id, change_quantity, movement_type = 'manual_adjustment', reason } = req.body;

    const changeQty = parseInt(change_quantity, 10);
    if (!product_id || isNaN(changeQty) || changeQty === 0) {
      return res.status(400).json({
        success: false,
        message: 'Product ID and a non-zero integer change quantity are required.'
      });
    }

    if (!reason || !reason.trim()) {
      return res.status(400).json({
        success: false,
        message: 'An audit reason for stock adjustment is required.'
      });
    }

    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();

      const [prodRows] = await conn.query('SELECT id, name, sku, stock_quantity FROM products WHERE id = ? FOR UPDATE', [product_id]);
      if (prodRows.length === 0) {
        throw new Error('Product not found.');
      }

      const prod = prodRows[0];
      const previousStock = prod.stock_quantity;
      const newStock = previousStock + changeQty;

      if (newStock < 0) {
        throw new Error(`Adjustment would result in negative inventory (Current: ${previousStock}, Change: ${changeQty}).`);
      }

      await conn.query('UPDATE products SET stock_quantity = ? WHERE id = ?', [newStock, product_id]);

      await conn.query(
        `INSERT INTO inventory_movements (
          product_id, change_quantity, previous_stock, new_stock, movement_type,
          reference_type, reason, created_by
        ) VALUES (?, ?, ?, ?, ?, 'admin', ?, ?)`,
        [
          product_id,
          changeQty,
          previousStock,
          newStock,
          movement_type,
          reason.trim(),
          req.user.email
        ]
      );

      await conn.commit();

      logger.audit('INVENTORY_ADJUSTED', req.user.email, {
        productId: product_id,
        sku: prod.sku,
        previousStock,
        newStock,
        changeQty,
        reason
      });

      res.json({
        success: true,
        message: `Inventory for ${prod.name} successfully adjusted from ${previousStock} to ${newStock}.`,
        data: {
          product_id,
          previous_stock: previousStock,
          new_stock: newStock,
          change_quantity: changeQty
        }
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

export async function getInventoryMovements(req, res, next) {
  try {
    const { product_id, limit = 50 } = req.query;

    const whereClauses = [];
    const params = [];

    if (product_id) {
      whereClauses.push('im.product_id = ?');
      params.push(product_id);
    }

    const whereSQL = whereClauses.length ? `WHERE ${whereClauses.join(' AND ')}` : '';

    const [movements] = await pool.query(
      `SELECT 
        im.id, im.product_id, im.change_quantity, im.previous_stock, im.new_stock,
        im.movement_type, im.reference_type, im.reference_id, im.reason, im.created_by, im.created_at,
        p.name AS product_name, p.sku, p.unit_of_measure
       FROM inventory_movements im
       JOIN products p ON im.product_id = p.id
       ${whereSQL}
       ORDER BY im.created_at DESC
       LIMIT ?`,
      [...params, parseInt(limit, 10) || 50]
    );

    res.json({
      success: true,
      data: movements
    });
  } catch (error) {
    next(error);
  }
}
