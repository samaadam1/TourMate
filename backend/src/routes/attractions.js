// backend/src/routes/attractions.js
import express from 'express';
import pool from '../db.js';

const router = express.Router();

// GET /api/attractions/popular
router.get('/popular', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM attractions WHERE is_popular = true ORDER BY rating DESC LIMIT 20'
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
      'SELECT * FROM attractions WHERE LOWER(city) = LOWER($1) ORDER BY rating DESC LIMIT 20',
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


// POST /api/attractions
router.post('/', async (req, res) => {
  try {
    const {
      name, city, category, description, image_url,
      rating, price_from, opening_hours, is_popular,
      latitude, longitude, images
    } = req.body;

    if (!name || !city || !category) {
      return res.status(400).json({ success: false, message: 'Name, city and category are required' });
    }

    const result = await pool.query(
      `INSERT INTO attractions
        (name, city, category, description, image_url, rating, price_from, opening_hours, is_popular, latitude, longitude)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
       RETURNING *`,
      [name, city, category, description ?? '', image_url ?? '', rating ?? 4.0,
       price_from ?? 0, opening_hours ?? '', is_popular ?? false,
       latitude ?? null, longitude ?? null]
    );

    const newAttraction = result.rows[0];

    if (images && images.length > 0) {
      for (let i = 0; i < images.length; i++) {
        await pool.query(
          'INSERT INTO attraction_images (attraction_id, image_url, is_primary) VALUES ($1, $2, $3)',
          [newAttraction.id, images[i], i === 0]
        );
      }
    }

    res.status(201).json({ success: true, data: newAttraction });
  } catch (err) {
    console.error('Create attraction error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// PUT /api/attractions/:id
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, city, category, description, image_url, rating, price_from, opening_hours, is_popular, latitude, longitude, images } = req.body;

    // Convert Google Drive share link to direct URL if needed
    const convertDriveUrl = (url) => {
      if (!url) return url;
      const match = url.match(/\/d\/([a-zA-Z0-9_-]+)/);
      if (match) return `https://drive.google.com/uc?export=view&id=${match[1]}`;
      return url;
    };

    const cleanImageUrl = convertDriveUrl(image_url);

    // Update attractions table
    const result = await pool.query(
      `UPDATE attractions SET
        name=$1, city=$2, category=$3, description=$4, image_url=$5,
        rating=$6, price_from=$7, opening_hours=$8, is_popular=$9,
        latitude=$10, longitude=$11
       WHERE id=$12 RETURNING *`,
      [name, city, category, description, cleanImageUrl, rating, price_from, opening_hours, is_popular, latitude, longitude, id]
    );
    if (result.rows.length === 0) return res.status(404).json({ success: false, message: 'Not found' });

    // If images array provided, replace all attraction_images
    if (images && images.length > 0) {
      await pool.query('DELETE FROM attraction_images WHERE attraction_id = $1', [id]);
      for (let i = 0; i < images.length; i++) {
        const cleanUrl = convertDriveUrl(images[i]);
        await pool.query(
          'INSERT INTO attraction_images (attraction_id, image_url, is_primary) VALUES ($1, $2, $3)',
          [id, cleanUrl, i === 0]
        );
      }
    } else if (cleanImageUrl) {
      // If only image_url provided with no images array, upsert as primary image
      const existing = await pool.query(
        'SELECT id FROM attraction_images WHERE attraction_id = $1 AND is_primary = true',
        [id]
      );
      if (existing.rows.length > 0) {
        await pool.query(
          'UPDATE attraction_images SET image_url = $1 WHERE attraction_id = $2 AND is_primary = true',
          [cleanImageUrl, id]
        );
      } else {
        await pool.query(
          'INSERT INTO attraction_images (attraction_id, image_url, is_primary) VALUES ($1, $2, true)',
          [id, cleanImageUrl]
        );
      }
    }

    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    console.error('Update attraction error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// DELETE /api/attractions/:id
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query('DELETE FROM attraction_images WHERE attraction_id = $1', [id]);
    await pool.query('DELETE FROM favorites WHERE attraction_id = $1', [id]);
    await pool.query('DELETE FROM attractions WHERE id = $1', [id]);
    res.json({ success: true, message: 'Attraction deleted' });
  } catch (err) {
    console.error('Delete attraction error:', err);
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


// POST /api/attractions/upload-image (base64 → saves to local /uploads, returns URL)
router.post('/upload-image', async (req, res) => {
  try {
    const { image } = req.body;
    if (!image) return res.status(400).json({ success: false, message: 'No image provided' });

    const base64Data = image.replace(/^data:image\/\w+;base64,/, '');
    const buffer = Buffer.from(base64Data, 'base64');

    const fs = await import('fs');
    const path = await import('path');
    const uploadsDir = path.default.join(process.cwd(), 'uploads');
    if (!fs.default.existsSync(uploadsDir)) fs.default.mkdirSync(uploadsDir, { recursive: true });

    const filename = `attraction_${Date.now()}.jpg`;
    const filepath = path.default.join(uploadsDir, filename);
    fs.default.writeFileSync(filepath, buffer);

    const url = `http://${process.env.BACKEND_IP || 'localhost'}:3000/uploads/${filename}`;
    res.json({ success: true, url });
  } catch (err) {
    console.error('Upload image error:', err);
    res.status(500).json({ success: false, message: 'Upload failed' });
  }
});

// POST /api/attractions/download-images
// Downloads photos from Google Places URLs and saves them locally
router.post('/download-images', async (req, res) => {
  try {
    const { urls } = req.body;
    if (!urls || urls.length === 0) return res.status(400).json({ success: false, message: 'No URLs provided' });

    const fs   = await import('fs');
    const path = await import('path');
    const https = await import('https');
    const http  = await import('http');

    const uploadsDir = path.default.join(process.cwd(), 'uploads');
    if (!fs.default.existsSync(uploadsDir)) fs.default.mkdirSync(uploadsDir, { recursive: true });

    const downloadFile = (url) => new Promise((resolve, reject) => {
      const filename = `attraction_${Date.now()}_${Math.random().toString(36).slice(2)}.jpg`;
      const filepath = path.default.join(uploadsDir, filename);
      const file     = fs.default.createWriteStream(filepath);
      const client   = url.startsWith('https') ? https.default : http.default;

      const request = client.get(url, (response) => {
        // Follow redirects
        if (response.statusCode === 301 || response.statusCode === 302) {
          file.close();
          fs.default.unlinkSync(filepath);
          return downloadFile(response.headers.location).then(resolve).catch(reject);
        }
        if (response.statusCode !== 200) {
          file.close();
          fs.default.unlinkSync(filepath);
          return reject(new Error(`HTTP ${response.statusCode}`));
        }
        response.pipe(file);
        file.on('finish', () => {
          file.close();
          resolve(`http://${process.env.BACKEND_IP || 'localhost'}:3000/uploads/${filename}`);
        });
      });
      request.on('error', (err) => {
        file.close();
        if (fs.default.existsSync(filepath)) fs.default.unlinkSync(filepath);
        reject(err);
      });
      request.setTimeout(15000, () => { request.destroy(); reject(new Error('Timeout')); });
    });

    const savedUrls = [];
    for (const url of urls.slice(0, 5)) {
      try {
        const localUrl = await downloadFile(url);
        savedUrls.push(localUrl);
      } catch (err) {
        console.error('Failed to download image:', url, err.message);
        savedUrls.push(url); // fallback: keep original URL
      }
    }

    res.json({ success: true, urls: savedUrls });
  } catch (err) {
    console.error('Download images error:', err);
    res.status(500).json({ success: false, message: 'Download failed' });
  }
});

export default router;