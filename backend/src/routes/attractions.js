// backend/src/routes/attractions.js
import express from 'express';
import pool from '../db.js';

const router = express.Router();

// GET /api/attractions/popular
router.get('/popular', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM attractions WHERE is_popular = true ORDER BY rating DESC LIMIT 10'
    );
    res.json({ success: true, data: result.rows });
  } catch (err) {
    console.error('Popular attractions error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// GET /api/attractions/nearest?city=Alexandria
router.get('/nearest', async (req, res) => {
  try {
    const { city } = req.query;
    const result = await pool.query(
      'SELECT * FROM attractions WHERE LOWER(city) = LOWER($1) ORDER BY rating DESC LIMIT 10',
      [city ?? 'Alexandria']
    );
    res.json({ success: true, data: result.rows });
  } catch (err) {
    console.error('Nearest attractions error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// GET /api/attractions/search?q=pyramids
router.get('/search', async (req, res) => {
  try {
    const { q } = req.query;
    if (!q) return res.json({ success: true, data: [] });
    const result = await pool.query(
      `SELECT * FROM attractions 
       WHERE name ILIKE $1 OR city ILIKE $1 OR description ILIKE $1 OR category ILIKE $1
       ORDER BY rating DESC LIMIT 10`,
      [`%${q}%`]
    );
    res.json({ success: true, data: result.rows });
  } catch (err) {
    console.error('Search error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// GET /api/attractions/favorites/:user_id
router.get('/favorites/:user_id', async (req, res) => {
  try {
    const { user_id } = req.params;
    const result = await pool.query(
      `SELECT a.* FROM attractions a
       INNER JOIN favorites f ON a.id = f.attraction_id
       WHERE f.user_id = $1
       ORDER BY f.created_at DESC`,
      [user_id]
    );
    res.json({ success: true, data: result.rows });
  } catch (err) {
    console.error('Favorites error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// GET /api/attractions?city=Cairo&category=historical
router.get('/', async (req, res) => {
  try {
    const { city, category } = req.query;
    let query = 'SELECT * FROM attractions WHERE 1=1';
    const params = [];
    let paramIndex = 1;

    if (city) {
      query += ` AND LOWER(city) = LOWER($${paramIndex++})`;
      params.push(city);
    }
    if (category && category !== 'all') {
      query += ` AND LOWER(category) = LOWER($${paramIndex++})`;
      params.push(category);
    }

    query += ' ORDER BY rating DESC';
    const result = await pool.query(query, params);
    res.json({ success: true, data: result.rows });
  } catch (err) {
    console.error('Attractions error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// GET /api/attractions/:id/images
router.get('/:id/images', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      'SELECT * FROM attraction_images WHERE attraction_id = $1 ORDER BY is_primary DESC',
      [id]
    );
    res.json({ success: true, data: result.rows });
  } catch (err) {
    console.error('Images error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// GET /api/attractions/:id
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      'SELECT * FROM attractions WHERE id = $1',
      [id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Attraction not found' });
    }
    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    console.error('Attraction detail error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// POST /api/attractions/:id/favorite
router.post('/:id/favorite', async (req, res) => {
  try {
    const { id } = req.params;
    const { user_id } = req.body;

    if (!user_id) return res.status(400).json({ success: false, message: 'user_id required' });

    const existing = await pool.query(
      'SELECT * FROM favorites WHERE user_id = $1 AND attraction_id = $2',
      [user_id, id]
    );

    if (existing.rows.length > 0) {
      await pool.query(
        'DELETE FROM favorites WHERE user_id = $1 AND attraction_id = $2',
        [user_id, id]
      );
      res.json({ success: true, favorited: false });
    } else {
      await pool.query(
        'INSERT INTO favorites (user_id, attraction_id) VALUES ($1, $2)',
        [user_id, id]
      );
      res.json({ success: true, favorited: true });
    }
  } catch (err) {
    console.error('Favorite error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

export default router;