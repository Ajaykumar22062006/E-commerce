import pool from '../config/db.js';

export async function getCategories(req, res, next) {
  try {
    const [rows] = await pool.query(`
      SELECT 
        c.id, c.name, c.slug, c.description, c.image_url, c.icon, c.display_order,
        COUNT(p.id) AS product_count
      FROM categories c
      LEFT JOIN products p ON p.category_id = c.id AND p.is_active = 1
      WHERE c.is_active = 1
      GROUP BY c.id
      ORDER BY c.display_order ASC, c.name ASC
    `);

    res.json({
      success: true,
      data: rows
    });
  } catch (error) {
    next(error);
  }
}

export async function getCategoryBySlug(req, res, next) {
  try {
    const { slug } = req.params;
    const [rows] = await pool.query(
      'SELECT id, name, slug, description, image_url, icon FROM categories WHERE slug = ? AND is_active = 1',
      [slug]
    );

    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Category not found.' });
    }

    res.json({
      success: true,
      data: rows[0]
    });
  } catch (error) {
    next(error);
  }
}
