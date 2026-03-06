// backend/src/routes/hotels.js
import express from 'express';
import pool from '../db.js';

const router = express.Router();

// GET /api/hotels?city=Hurghada
router.get('/', async (req, res) => {
  try {
    const { city } = req.query;
    let query = 'SELECT * FROM hotels';
    let params = [];
    if (city) {
      query += ' WHERE LOWER(city) = LOWER($1)';
      params = [city];
    }
    query += ' ORDER BY stars DESC, rating DESC';
    const result = await pool.query(query, params);
    res.json({ success: true, data: result.rows });
  } catch (err) {
    console.error('Hotels error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

export default router;