import pool from '../config/db.js';

export async function getWishlist(req, res, next) {
  try {
    const [items] = await pool.query(
      `SELECT 
        w.id AS wishlist_id, w.product_id, w.created_at,
        p.name, p.slug, p.sku, p.brand, p.unit_of_measure,
        p.unit_price, p.discount_percent,
        ROUND(p.unit_price * (1 - p.discount_percent / 100), 2) AS effective_price,
        p.stock_quantity, p.rating, p.review_count,
        (
          SELECT image_url 
          FROM product_images pi 
          WHERE pi.product_id = p.id 
          ORDER BY pi.is_primary DESC, pi.sort_order ASC 
          LIMIT 1
        ) AS image_url
       FROM wishlists w
       JOIN products p ON w.product_id = p.id
       WHERE w.user_id = ? AND p.is_active = 1
       ORDER BY w.created_at DESC`,
      [req.user.id]
    );

    res.json({
      success: true,
      data: items
    });
  } catch (error) {
    next(error);
  }
}

export async function toggleWishlist(req, res, next) {
  try {
    const { productId } = req.params;

    const [existing] = await pool.query(
      'SELECT id FROM wishlists WHERE user_id = ? AND product_id = ?',
      [req.user.id, productId]
    );

    if (existing.length > 0) {
      await pool.query('DELETE FROM wishlists WHERE id = ?', [existing[0].id]);
      return res.json({
        success: true,
        message: 'Product removed from wishlist.',
        inWishlist: false
      });
    } else {
      await pool.query(
        'INSERT INTO wishlists (user_id, product_id) VALUES (?, ?)',
        [req.user.id, productId]
      );
      return res.json({
        success: true,
        message: 'Product added to wishlist.',
        inWishlist: true
      });
    }
  } catch (error) {
    next(error);
  }
}
