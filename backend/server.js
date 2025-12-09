const path = require('path');
const fs = require('fs');
const multer = require('multer');
const express = require('express');
const cors = require('cors');
const db = require('./db');


const app = express();
const PORT = process.env.PORT || 4000;

initDb();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// folder upload foto
const uploadDir = path.join(__dirname, '..', 'uploads');
app.use('/uploads', express.static(uploadDir));

const storage = multer.diskStorage({
  destination: function (_, __, cb) {
    cb(null, uploadDir);
  },
  filename: function (_, file, cb) {
    const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, unique + ext);
  }
});
const upload = multer({ storage });

// ========== API ROUTES ==========

// GET /api/items?query=&category=
// search barang + list
app.get('/api/items', (req, res) => {
  const { query, category } = req.query;

  let sql = `
    SELECT items.*, locations.name AS location_name
    FROM items
    LEFT JOIN locations ON items.location_id = locations.id
    WHERE 1 = 1
  `;
  const params = [];

  if (query) {
    sql += ` AND (items.name LIKE ? OR items.code LIKE ? OR items.category LIKE ?)`;
    const like = `%${query}%`;
    params.push(like, like, like);
  }

  if (category) {
    sql += ` AND items.category = ?`;
    params.push(category);
  }

  sql += ` ORDER BY items.updated_at DESC LIMIT 100`;

  db.all(sql, params, (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// POST /api/items  (tambah barang baru)
app.post('/api/items', upload.single('image'), (req, res) => {
  const { code, name, description, category, quantity, location_id } = req.body;
  const imagePath = req.file ? `/uploads/${req.file.filename}` : null;

  const sql = `
    INSERT INTO items (code, name, description, category, image_path, quantity, location_id)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `;
  const params = [
    code || null,
    name,
    description || null,
    category || null,
    imagePath,
    quantity || 0,
    location_id || null
  ];

  db.run(sql, params, function (err) {
    if (err) return res.status(500).json({ error: err.message });

    // log stok masuk
    const itemId = this.lastID;
    if (quantity && Number(quantity) > 0) {
      db.run(
        `INSERT INTO stock_movements (item_id, type, quantity, note)
         VALUES (?, 'IN', ?, 'Initial stock')`,
        [itemId, quantity]
      );
    }

    res.status(201).json({ id: itemId, message: 'Item created' });
  });
});

// PATCH /api/items/:id/stock  (update stok)
app.patch('/api/items/:id/stock', (req, res) => {
  const { id } = req.params;
  const { quantity_change, note, type } = req.body; // type: 'IN' or 'OUT'

  const q = Number(quantity_change || 0);
  if (!q) return res.status(400).json({ error: 'quantity_change required' });

  db.get(`SELECT quantity FROM items WHERE id = ?`, [id], (err, item) => {
    if (err || !item) return res.status(404).json({ error: 'Item not found' });

    const newQty = type === 'OUT' ? item.quantity - q : item.quantity + q;

    db.run(
      `UPDATE items
       SET quantity = ?, updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [newQty, id],
      (err2) => {
        if (err2) return res.status(500).json({ error: err2.message });

        db.run(
          `INSERT INTO stock_movements (item_id, type, quantity, note)
           VALUES (?, ?, ?, ?)`,
          [id, type || 'ADJUST', q, note || null]
        );

        res.json({ message: 'Stock updated', quantity: newQty });
      }
    );
  });
});

// GET /api/locations  (list lokasi)
app.get('/api/locations', (_, res) => {
  db.all(`SELECT * FROM locations ORDER BY name ASC`, [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// POST /api/locations  (tambah lokasi gudang)
app.post('/api/locations', (req, res) => {
  const { name, description } = req.body;
  db.run(
    `INSERT INTO locations (name, description) VALUES (?, ?)`,
    [name, description || null],
    function (err) {
      if (err) return res.status(500).json({ error: err.message });
      res.status(201).json({ id: this.lastID, message: 'Location created' });
    }
  );
});

app.listen(PORT, () => {
  console.log(`Inventory backend running on http://localhost:${PORT}`);
});
